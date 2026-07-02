import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

interface NotificationRow {
  id: string
  match_id: string
  type: string
  message: string
  ai_score: number | null
  sent_at: string
  read_at: string | null
}

interface PatchBody {
  id?: string
  all?: boolean
}

export async function GET() {
  const auth = await getAuthenticatedSupabase()
  if ('response' in auth) return auth.response

  const { data, error } = await auth.supabase
    .from('notification_logs')
    .select('id, match_id, type, message, ai_score, sent_at, read_at')
    .eq('user_id', auth.userId)
    .order('sent_at', { ascending: false })
    .limit(20)

  if (error) {
    console.error('[/api/notifications GET]', error)
    return NextResponse.json({ error: 'Failed to load notifications' }, { status: 500 })
  }

  const rows = data as NotificationRow[] | null
  const notifications = rows ?? []

  return NextResponse.json({
    data: notifications,
    unread: notifications.filter(item => !item.read_at).length,
  })
}

export async function PATCH(request: Request) {
  const body = await request.json() as PatchBody
  const auth = await getAuthenticatedSupabase()
  if ('response' in auth) return auth.response

  const query = auth.supabase
    .from('notification_logs')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', auth.userId)
    .is('read_at', null)

  const { error } = body.all
    ? await query
    : body.id
      ? await query.eq('id', body.id)
      : { error: new Error('Missing notification id') }

  if (error) {
    console.error('[/api/notifications PATCH]', error)
    return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 })
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
