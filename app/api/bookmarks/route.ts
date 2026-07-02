import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import type { Mode } from '@/types'

interface BookmarkRequest {
  matchId: string
  matchMode: Mode
  homeTeam?: string
  awayTeam?: string
  league?: string
  notifyThreshold?: number
  notifyOnGoal?: boolean
  notifyOnPressure?: boolean
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('mode')

  if (mode !== 'live' && mode !== 'prematch') {
    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 })
  }

  const auth = await getAuthenticatedSupabase()
  if ('response' in auth) return auth.response

  const { data, error } = await auth.supabase
    .from('bookmarks')
    .select('match_id')
    .eq('user_id', auth.userId)
    .eq('match_mode', mode)

  if (error) {
    console.error('[/api/bookmarks GET]', error)
    return NextResponse.json({ error: 'Failed to load bookmarks' }, { status: 500 })
  }

  return NextResponse.json({ data: (data ?? []).map(row => row.match_id) })
}

export async function POST(request: Request) {
  const body = await request.json() as BookmarkRequest
  const validationError = validateBookmarkBody(body)
  if (validationError) return validationError

  const auth = await getAuthenticatedSupabase()
  if ('response' in auth) return auth.response

  const { error } = await auth.supabase.from('bookmarks').upsert({
    user_id: auth.userId,
    match_id: body.matchId,
    match_mode: body.matchMode,
    home_team: body.homeTeam ?? 'Home',
    away_team: body.awayTeam ?? 'Away',
    league: body.league ?? null,
    notify_threshold: body.notifyThreshold ?? 75,
    notify_on_goal: body.notifyOnGoal ?? true,
    notify_on_pressure: body.notifyOnPressure ?? true,
  }, { onConflict: 'user_id,match_id,match_mode' })

  if (error) {
    console.error('[/api/bookmarks POST]', error)
    return NextResponse.json({ error: 'Failed to save bookmark' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request) {
  const body = await request.json() as Pick<BookmarkRequest, 'matchId' | 'matchMode'>
  if (!body.matchId || (body.matchMode !== 'live' && body.matchMode !== 'prematch')) {
    return NextResponse.json({ error: 'Invalid bookmark' }, { status: 400 })
  }

  const auth = await getAuthenticatedSupabase()
  if ('response' in auth) return auth.response

  const { error } = await auth.supabase
    .from('bookmarks')
    .delete()
    .eq('user_id', auth.userId)
    .eq('match_id', body.matchId)
    .eq('match_mode', body.matchMode)

  if (error) {
    console.error('[/api/bookmarks DELETE]', error)
    return NextResponse.json({ error: 'Failed to remove bookmark' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

async function getAuthenticatedSupabase() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  return { supabase, userId: user.id }
}

function validateBookmarkBody(body: BookmarkRequest): NextResponse | null {
  if (!body.matchId || (body.matchMode !== 'live' && body.matchMode !== 'prematch')) {
    return NextResponse.json({ error: 'Invalid bookmark' }, { status: 400 })
  }

  return null
}
