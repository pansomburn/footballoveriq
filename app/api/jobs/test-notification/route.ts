import { NextResponse } from 'next/server'
import { dispatchLiveSignalNotifications } from '@/lib/notificationDispatcher'
import { createSupabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase-admin'
import type { LiveAlertType, LiveSignalEvent } from '@/lib/liveSignalMonitor'

interface TestNotificationBody {
  matchId?: string
  type?: LiveAlertType
  aiScore?: number
}

interface BookmarkRow {
  match_id: string
  home_team: string
  away_team: string
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: 'Supabase admin credentials are not configured' }, { status: 400 })
  }

  const body = await request.json().catch(() => ({})) as TestNotificationBody
  const supabase = createSupabaseAdmin()
  const bookmark = body.matchId
    ? await loadBookmarkByMatchId(supabase, body.matchId)
    : await loadLatestLiveBookmark(supabase)

  if (!bookmark) {
    return NextResponse.json({
      error: 'No live bookmark found. Bookmark a live match first, then retry.',
    }, { status: 404 })
  }

  const event = buildTestEvent(bookmark, body)
  const notifications = await dispatchLiveSignalNotifications(supabase, [event])

  return NextResponse.json({
    ok: true,
    event,
    notifications,
  })
}

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true

  const auth = request.headers.get('authorization')
  const cronSecret = request.headers.get('x-cron-secret')

  return auth === `Bearer ${secret}` || cronSecret === secret
}

async function loadLatestLiveBookmark(
  supabase: ReturnType<typeof createSupabaseAdmin>
): Promise<BookmarkRow | null> {
  const { data, error } = await supabase
    .from('bookmarks')
    .select('match_id, home_team, away_team')
    .eq('match_mode', 'live')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data as BookmarkRow | null
}

async function loadBookmarkByMatchId(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  matchId: string
): Promise<BookmarkRow | null> {
  const { data, error } = await supabase
    .from('bookmarks')
    .select('match_id, home_team, away_team')
    .eq('match_mode', 'live')
    .eq('match_id', matchId)
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data as BookmarkRow | null
}

function buildTestEvent(bookmark: BookmarkRow, body: TestNotificationBody): LiveSignalEvent {
  const type = body.type ?? 'threshold_reached'
  const aiScore = body.aiScore ?? 88

  return {
    matchId: bookmark.match_id,
    type,
    severity: type === 'goal' ? 'watch' : 'hot',
    aiScore,
    delta: type === 'goal' ? 1 : 20,
    message: `[TEST] ${bookmark.home_team} vs ${bookmark.away_team}: notification pipeline test`,
  }
}
