import type { SupabaseClient } from '@supabase/supabase-js'
import type { LiveSignalEvent } from '@/lib/liveSignalMonitor'

interface BookmarkRule {
  user_id: string
  match_id: string
  notify_threshold: number | null
  notify_on_goal: boolean | null
  notify_on_pressure: boolean | null
}

interface CooldownRow {
  user_id: string
  match_id: string
  alert_type: string
  last_sent_at: string
}

export interface DispatchResult {
  candidates: number
  sent: number
  skippedByCooldown: number
}

const DEFAULT_COOLDOWN_SECONDS = 300

export async function dispatchLiveSignalNotifications(
  supabase: SupabaseClient,
  events: LiveSignalEvent[]
): Promise<DispatchResult> {
  if (events.length === 0) {
    return { candidates: 0, sent: 0, skippedByCooldown: 0 }
  }

  const matchIds = Array.from(new Set(events.map(event => event.matchId)))
  const { data: bookmarks, error: bookmarkError } = await supabase
    .from('bookmarks')
    .select('user_id, match_id, notify_threshold, notify_on_goal, notify_on_pressure')
    .eq('match_mode', 'live')
    .in('match_id', matchIds)

  if (bookmarkError) throw bookmarkError

  const rules = bookmarks as BookmarkRule[] | null ?? []
  const candidates = buildCandidates(events, rules)
  if (candidates.length === 0) {
    return { candidates: 0, sent: 0, skippedByCooldown: 0 }
  }

  const cooldowns = await loadCooldowns(supabase, candidates)
  const cooldownSeconds = Number(process.env.NOTIFICATION_COOLDOWN_SECONDS ?? DEFAULT_COOLDOWN_SECONDS)
  const now = new Date()
  const allowed = candidates.filter(candidate => {
    const key = cooldownKey(candidate.userId, candidate.event.matchId, candidate.event.type)
    const lastSent = cooldowns.get(key)
    if (!lastSent) return true
    return now.getTime() - new Date(lastSent).getTime() >= cooldownSeconds * 1000
  })

  if (allowed.length === 0) {
    return { candidates: candidates.length, sent: 0, skippedByCooldown: candidates.length }
  }

  const { error: logError } = await supabase
    .from('notification_logs')
    .insert(allowed.map(candidate => ({
      user_id: candidate.userId,
      match_id: candidate.event.matchId,
      type: candidate.event.type,
      message: candidate.event.message,
      ai_score: candidate.event.aiScore,
    })))

  if (logError) throw logError

  const { error: cooldownError } = await supabase
    .from('notification_cooldowns')
    .upsert(allowed.map(candidate => ({
      user_id: candidate.userId,
      match_id: candidate.event.matchId,
      alert_type: candidate.event.type,
      last_sent_at: now.toISOString(),
    })), { onConflict: 'user_id,match_id,alert_type' })

  if (cooldownError) throw cooldownError

  return {
    candidates: candidates.length,
    sent: allowed.length,
    skippedByCooldown: candidates.length - allowed.length,
  }
}

function buildCandidates(events: LiveSignalEvent[], rules: BookmarkRule[]) {
  return events.flatMap(event => {
    const matchRules = rules.filter(rule => rule.match_id === event.matchId)
    return matchRules
      .filter(rule => shouldNotify(event, rule))
      .map(rule => ({ userId: rule.user_id, event }))
  })
}

function shouldNotify(event: LiveSignalEvent, rule: BookmarkRule): boolean {
  if (event.type === 'goal') return rule.notify_on_goal !== false
  if (event.type === 'pressure_spike') return rule.notify_on_pressure !== false

  const threshold = rule.notify_threshold ?? 75
  if (event.type === 'threshold_reached') return event.aiScore >= threshold
  if (event.type === 'score_jump') return rule.notify_on_pressure !== false && event.aiScore >= threshold

  return false
}

async function loadCooldowns(
  supabase: SupabaseClient,
  candidates: Array<{ userId: string; event: LiveSignalEvent }>
): Promise<Map<string, string>> {
  const userIds = Array.from(new Set(candidates.map(candidate => candidate.userId)))
  const matchIds = Array.from(new Set(candidates.map(candidate => candidate.event.matchId)))

  const { data, error } = await supabase
    .from('notification_cooldowns')
    .select('user_id, match_id, alert_type, last_sent_at')
    .in('user_id', userIds)
    .in('match_id', matchIds)

  if (error) throw error

  return new Map((data as CooldownRow[] | null ?? []).map(row => [
    cooldownKey(row.user_id, row.match_id, row.alert_type),
    row.last_sent_at,
  ]))
}

function cooldownKey(userId: string, matchId: string, alertType: string): string {
  return `${userId}:${matchId}:${alertType}`
}
