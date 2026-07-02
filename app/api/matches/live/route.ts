import { NextResponse } from 'next/server'
import { getProviderErrorMessage } from '@/lib/footballProvider'
import { evaluateLiveSignals } from '@/lib/liveSignalMonitor'
import { isLsportsConfigured, LsportsProvider } from '@/lib/lsportsApi'
import { getMockLiveMatches } from '@/lib/mockData'
import type { LiveMatch } from '@/types'

interface LiveRouteCache {
  data: LiveMatch[]
  source: string
  checkedAt: number
}

const SNAPSHOT_CACHE_MS = Number(process.env.LSPORTS_LIVE_CACHE_MS ?? 15000)
let liveCache: LiveRouteCache | null = null

export async function GET() {
  try {
    if (liveCache && Date.now() - liveCache.checkedAt < SNAPSHOT_CACHE_MS) {
      return NextResponse.json({
        data: liveCache.data,
        events: evaluateLiveSignals(liveCache.data),
        source: `${liveCache.source}-cache`,
      })
    }

    if (!isLsportsConfigured()) {
      const data = getMockLiveMatches()
      return NextResponse.json({ data, events: evaluateLiveSignals(data), source: 'mock' })
    }

    const provider = new LsportsProvider()
    const data = await provider.getLiveMatches()

    if (data.length === 0) {
      const mock = getMockLiveMatches()
      return NextResponse.json({ data: mock, events: evaluateLiveSignals(mock), source: 'mock-empty' })
    }

    liveCache = { data, source: provider.source, checkedAt: Date.now() }
    return NextResponse.json({ data, events: evaluateLiveSignals(data), source: provider.source })
  } catch (error) {
    const message = getProviderErrorMessage(error)
    console.error('[/api/matches/live]', error)
    if (liveCache) {
      return NextResponse.json({
        data: liveCache.data,
        events: evaluateLiveSignals(liveCache.data),
        source: `${liveCache.source}-stale`,
        error: message,
      })
    }
    const data = getMockLiveMatches()
    return NextResponse.json({ data, events: evaluateLiveSignals(data), source: 'mock-error', error: message })
  }
}
