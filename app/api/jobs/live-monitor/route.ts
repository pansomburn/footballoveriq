import { NextResponse } from 'next/server'
import { getProviderErrorMessage } from '@/lib/footballProvider'
import {
  evaluateLiveSignals,
  evaluateLiveSignalsWithSnapshots,
  type LiveMatchSnapshot,
  type LiveSignalEvent,
} from '@/lib/liveSignalMonitor'
import { isLsportsConfigured, LsportsProvider } from '@/lib/lsportsApi'
import { getMockLiveMatches } from '@/lib/mockData'
import { dispatchLiveSignalNotifications, type DispatchResult } from '@/lib/notificationDispatcher'
import { createSupabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase-admin'
import type { LiveMatch } from '@/types'

interface SnapshotRow {
  match_id: string
  ai_score: number
  score_home: number
  score_away: number
  minute: number
  shots_on_goal: number
  dangerous_attacks: number
  updated_at: string
}

export async function GET(request: Request) {
  return runLiveMonitor(request)
}

export async function POST(request: Request) {
  return runLiveMonitor(request)
}

async function runLiveMonitor(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { matches, source } = await loadLiveMatches()
    const result = isSupabaseAdminConfigured()
      ? await evaluateAndPersist(matches)
      : {
        events: evaluateLiveSignals(matches),
        persisted: false,
        notifications: { candidates: 0, sent: 0, skippedByCooldown: 0 },
      }

    return NextResponse.json({
      ok: true,
      source,
      matches: matches.length,
      events: result.events,
      persisted: result.persisted,
      notifications: result.notifications,
      checkedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[/api/jobs/live-monitor]', error)
    return NextResponse.json({ ok: false, error: getProviderErrorMessage(error) }, { status: 500 })
  }
}

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true

  const auth = request.headers.get('authorization')
  const cronSecret = request.headers.get('x-cron-secret')
  const vercelCronSecret = request.headers.get('x-vercel-cron-signature')

  return auth === `Bearer ${secret}` || cronSecret === secret || vercelCronSecret === secret
}

async function loadLiveMatches(): Promise<{ matches: LiveMatch[]; source: string }> {
  if (!isLsportsConfigured()) {
    return { matches: getMockLiveMatches(), source: 'mock' }
  }

  const provider = new LsportsProvider()
  const matches = await provider.getLiveMatches()

  if (matches.length === 0) {
    return { matches: getMockLiveMatches(), source: 'mock-empty' }
  }

  return { matches, source: provider.source }
}

async function evaluateAndPersist(matches: LiveMatch[]): Promise<{
  events: LiveSignalEvent[]
  persisted: boolean
  notifications: DispatchResult
}> {
  const supabase = createSupabaseAdmin()
  const matchIds = matches.map(match => match.id)
  const previous = await loadPreviousSnapshots(matchIds)
  const { events, snapshots } = evaluateLiveSignalsWithSnapshots(matches, previous)

  const snapshotRows = snapshots.map(snapshot => ({
    match_id: snapshot.matchId,
    ai_score: snapshot.aiScore,
    score_home: snapshot.scoreHome,
    score_away: snapshot.scoreAway,
    minute: snapshot.minute,
    shots_on_goal: snapshot.shotsOnGoal,
    dangerous_attacks: snapshot.dangerousAttacks,
    payload: snapshot,
    updated_at: snapshot.updatedAt,
  }))

  if (snapshotRows.length > 0) {
    const { error } = await supabase
      .from('live_match_snapshots')
      .upsert(snapshotRows, { onConflict: 'match_id' })
    if (error) throw error
  }

  if (events.length > 0) {
    const { error } = await supabase
      .from('live_signal_events')
      .insert(events.map(event => ({
        match_id: event.matchId,
        alert_type: event.type,
        severity: event.severity,
        message: event.message,
        ai_score: event.aiScore,
        delta: event.delta ?? null,
      })))
    if (error) throw error
  }

  const notifications = await dispatchLiveSignalNotifications(supabase, events)
  return { events, persisted: true, notifications }
}

async function loadPreviousSnapshots(matchIds: string[]): Promise<Map<string, LiveMatchSnapshot>> {
  const supabase = createSupabaseAdmin()
  if (matchIds.length === 0) return new Map()

  const { data, error } = await supabase
    .from('live_match_snapshots')
    .select('match_id, ai_score, score_home, score_away, minute, shots_on_goal, dangerous_attacks, updated_at')
    .in('match_id', matchIds)

  if (error) throw error

  return new Map((data as SnapshotRow[] | null ?? []).map(row => [
    row.match_id,
    {
      matchId: row.match_id,
      aiScore: row.ai_score,
      scoreHome: row.score_home,
      scoreAway: row.score_away,
      minute: row.minute,
      shotsOnGoal: row.shots_on_goal,
      dangerousAttacks: row.dangerous_attacks,
      updatedAt: row.updated_at,
    },
  ]))
}
