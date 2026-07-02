const DISTRIBUTION_BASE = process.env.LSPORTS_DISTRIBUTION_URL ?? 'https://stm-api.lsports.eu'
const USER_NAME = process.env.LSPORTS_USERNAME ?? ''
const PASSWORD = process.env.LSPORTS_PASSWORD ?? ''
const FALLBACK_PACKAGE_ID = Number(process.env.LSPORTS_PACKAGE_ID ?? 0)
const INPLAY_PACKAGE_ID = Number(process.env.LSPORTS_INPLAY_PACKAGE_ID ?? FALLBACK_PACKAGE_ID)
const PREMATCH_PACKAGE_ID = Number(process.env.LSPORTS_PREMATCH_PACKAGE_ID ?? FALLBACK_PACKAGE_ID)

type DistributionAction = 'Start' | 'Stop'
export type DistributionMode = 'inplay' | 'prematch'

interface DistributionResponse<T> {
  header?: {
    httpStatusCode?: number
    errors?: DistributionError[]
  }
  Header?: {
    HttpStatusCode?: number
    Errors?: DistributionError[]
  }
  body?: T
  Body?: T
}

interface DistributionError {
  message?: string
  Message?: string
}

interface DistributionMessage {
  message?: string
  Message?: string
}

export interface DistributionStatus {
  isDistributionOn?: boolean
  consumers?: string[] | null
  numberMessagesInQueue?: number
  messagesPerSecond?: number
}

export function isLsportsDistributionConfigured(): boolean {
  return Boolean(USER_NAME && PASSWORD && (INPLAY_PACKAGE_ID || PREMATCH_PACKAGE_ID))
}

export async function startDistribution(mode: DistributionMode = 'inplay') {
  return updateDistribution('Start', mode)
}

export async function stopDistribution(mode: DistributionMode = 'inplay') {
  return updateDistribution('Stop', mode)
}

export async function getDistributionStatus(mode: DistributionMode = 'inplay'): Promise<DistributionStatus> {
  const json = await distributionFetch<DistributionStatus>('/Package/GetDistributionStatus', mode)
  return json.body ?? json.Body ?? {}
}

async function updateDistribution(action: DistributionAction, mode: DistributionMode): Promise<{ message: string }> {
  const json = await distributionFetch<DistributionMessage>(`/Distribution/${action}`, mode)
  const body = json.body ?? json.Body ?? {}
  return { message: body.message ?? body.Message ?? 'Success' }
}

async function distributionFetch<T>(path: string, mode: DistributionMode): Promise<DistributionResponse<T>> {
  if (!isLsportsDistributionConfigured()) {
    throw new Error('LSports distribution credentials are not configured')
  }

  const packageId = getPackageId(mode)

  const res = await fetch(`${DISTRIBUTION_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      packageId,
      userName: USER_NAME,
      password: PASSWORD,
    }),
    cache: 'no-store',
  })

  const json = await res.json() as DistributionResponse<T>
  const status = json.header?.httpStatusCode ?? json.Header?.HttpStatusCode ?? res.status
  const errors = json.header?.errors ?? json.Header?.Errors

  if (!res.ok || status >= 400) {
    const message = errors?.map(error => error.message ?? error.Message).filter(Boolean).join(', ')
    throw new Error(message || `LSports distribution request failed: ${res.status}`)
  }

  return json
}

function getPackageId(mode: DistributionMode): number {
  const packageId = mode === 'prematch' ? PREMATCH_PACKAGE_ID : INPLAY_PACKAGE_ID
  if (!packageId) {
    throw new Error(`LSports ${mode} package id is not configured`)
  }

  return packageId
}
