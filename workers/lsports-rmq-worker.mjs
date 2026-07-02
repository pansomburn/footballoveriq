import amqp from 'amqplib'
import { existsSync, readFileSync } from 'node:fs'

loadLocalEnv()

const mode = (process.env.LSPORTS_WORKER_MODE ?? 'inplay').toLowerCase()
const fallbackPackageId = process.env.LSPORTS_PACKAGE_ID
const packageId = mode === 'prematch'
  ? process.env.LSPORTS_PREMATCH_PACKAGE_ID ?? fallbackPackageId
  : process.env.LSPORTS_INPLAY_PACKAGE_ID ?? fallbackPackageId
const username = process.env.LSPORTS_USERNAME
const password = process.env.LSPORTS_PASSWORD
const baseUrl = (process.env.OVERIQ_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '')
const cronSecret = process.env.CRON_SECRET
const queueName = `_${packageId}_`
const minMonitorIntervalMs = Number(process.env.LSPORTS_WORKER_MONITOR_MIN_INTERVAL_MS ?? 15000)
const distributionUrl = process.env.LSPORTS_DISTRIBUTION_URL ?? 'https://stm-api.lsports.eu'

const rmqConfig = mode === 'prematch'
  ? {
    host: process.env.LSPORTS_RMQ_PREMATCH_HOST ?? 'stm-prematch.lsports.eu',
    vhost: process.env.LSPORTS_RMQ_PREMATCH_VHOST ?? 'StmPreMatch',
  }
  : {
    host: process.env.LSPORTS_RMQ_INPLAY_HOST ?? 'stm-inplay.lsports.eu',
    vhost: process.env.LSPORTS_RMQ_INPLAY_VHOST ?? 'StmInPlay',
  }

let connection
let channel
let lastMonitorAt = 0
let monitorInFlight = false
let pendingMonitor = false

validateEnv()
await startDistribution()
await consume()

function validateEnv() {
  const missing = []
  if (!packageId) missing.push('LSPORTS_PACKAGE_ID')
  if (!username) missing.push('LSPORTS_USERNAME')
  if (!password) missing.push('LSPORTS_PASSWORD')

  if (missing.length > 0) {
    console.error(`[lsports-worker] Missing env: ${missing.join(', ')}`)
    process.exit(1)
  }

  if (mode !== 'inplay' && mode !== 'prematch') {
    console.error('[lsports-worker] LSPORTS_WORKER_MODE must be inplay or prematch')
    process.exit(1)
  }
}

async function startDistribution() {
  const res = await fetch(`${distributionUrl}/Distribution/Start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      packageId: Number(packageId),
      userName: username,
      password,
    }),
  })

  const json = await safeJson(res)
  if (!res.ok || getProviderStatus(json, res.status) >= 400) {
    const errorMessage = getProviderErrors(json) || `HTTP ${res.status}`
    throw new Error(`LSports Distribution/Start failed: ${errorMessage}`)
  }

  console.log(`[lsports-worker] Distribution started for package ${packageId}`)
}

async function consume() {
  connection = await amqp.connect({
    protocol: 'amqp',
    hostname: rmqConfig.host,
    port: 5672,
    username,
    password,
    vhost: rmqConfig.vhost,
    heartbeat: 580,
  })

  channel = await connection.createChannel()
  await channel.prefetch(100)

  console.log(`[lsports-worker] Connected to ${rmqConfig.host}/${rmqConfig.vhost}, queue ${queueName}`)

  await channel.consume(queueName, message => {
    if (!message) return

    try {
      const payload = parsePayload(message.content)
      const fixtureId = payload?.Body?.Events?.[0]?.FixtureId
        ?? payload?.Body?.FixtureId
        ?? payload?.fixtureId
        ?? 'unknown'
      console.log(`[lsports-worker] ${mode} message received fixture=${fixtureId}`)
      scheduleMonitor()
      channel.ack(message)
    } catch (error) {
      console.error('[lsports-worker] Failed to process message', error)
      channel.nack(message, false, false)
    }
  }, { noAck: false })

  process.once('SIGINT', shutdown)
  process.once('SIGTERM', shutdown)
}

function parsePayload(buffer) {
  const text = buffer.toString('utf8')
  if (!text) return null
  return JSON.parse(text)
}

function scheduleMonitor() {
  pendingMonitor = true
  const elapsed = Date.now() - lastMonitorAt
  const waitMs = Math.max(0, minMonitorIntervalMs - elapsed)
  setTimeout(runMonitor, waitMs)
}

async function runMonitor() {
  if (monitorInFlight || !pendingMonitor) return

  pendingMonitor = false
  monitorInFlight = true

  try {
    const headers = cronSecret ? { Authorization: `Bearer ${cronSecret}` } : undefined
    const res = await fetch(`${baseUrl}/api/jobs/live-monitor`, { method: 'POST', headers })
    const json = await safeJson(res)
    if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`)

    lastMonitorAt = Date.now()
    console.log(`[lsports-worker] monitor ok matches=${json.matches ?? 0} events=${json.events?.length ?? 0}`)
  } catch (error) {
    console.error('[lsports-worker] monitor failed', error)
  } finally {
    monitorInFlight = false
    if (pendingMonitor) scheduleMonitor()
  }
}

async function safeJson(res) {
  try {
    return await res.json()
  } catch {
    return null
  }
}

function getProviderStatus(json, fallbackStatus) {
  return json?.header?.httpStatusCode ?? json?.Header?.HttpStatusCode ?? fallbackStatus
}

function getProviderErrors(json) {
  const errors = json?.header?.errors ?? json?.Header?.Errors ?? []
  return errors
    .map(error => error.message ?? error.Message)
    .filter(Boolean)
    .join(', ')
}

async function shutdown() {
  console.log('[lsports-worker] Shutting down')
  await channel?.close().catch(() => undefined)
  await connection?.close().catch(() => undefined)
  process.exit(0)
}

function loadLocalEnv() {
  const envPath = new URL('../.env.local', import.meta.url)
  if (!existsSync(envPath)) return

  const lines = readFileSync(envPath, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const separatorIndex = trimmed.indexOf('=')
    if (separatorIndex === -1) continue

    const key = trimmed.slice(0, separatorIndex).trim()
    const value = trimmed.slice(separatorIndex + 1).trim()
    process.env[key] ??= value
  }
}
