import { NextResponse } from 'next/server'
import {
  getDistributionStatus,
  isLsportsDistributionConfigured,
  startDistribution,
  stopDistribution,
  type DistributionMode,
} from '@/lib/lsportsDistribution'

type DistributionCommand = 'start' | 'stop' | 'status'

interface CommandBody {
  command?: DistributionCommand
  mode?: DistributionMode
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  return runCommand('status', parseMode(searchParams.get('mode')))
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({})) as CommandBody
  return runCommand(body.command ?? 'status', body.mode ?? 'inplay')
}

async function runCommand(command: DistributionCommand, mode: DistributionMode) {
  if (!isLsportsDistributionConfigured()) {
    return NextResponse.json({ error: 'LSports distribution credentials are not configured' }, { status: 400 })
  }

  try {
    if (command === 'start') {
      const result = await startDistribution(mode)
      return NextResponse.json({ ok: true, command, mode, result })
    }

    if (command === 'stop') {
      const result = await stopDistribution(mode)
      return NextResponse.json({ ok: true, command, mode, result })
    }

    const status = await getDistributionStatus(mode)
    return NextResponse.json({ ok: true, command, mode, status })
  } catch (error) {
    console.error('[/api/jobs/lsports-distribution]', error)
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : 'Distribution command failed',
    }, { status: 500 })
  }
}

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true

  const auth = request.headers.get('authorization')
  const cronSecret = request.headers.get('x-cron-secret')

  return auth === `Bearer ${secret}` || cronSecret === secret
}

function parseMode(mode: string | null): DistributionMode {
  return mode === 'prematch' ? 'prematch' : 'inplay'
}
