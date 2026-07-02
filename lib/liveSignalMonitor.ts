import type { LiveMatch } from '@/types'

export type LiveAlertType = 'score_jump' | 'threshold_reached' | 'goal' | 'pressure_spike'

export interface LiveMatchSnapshot {
  matchId: string
  aiScore: number
  scoreHome: number
  scoreAway: number
  minute: number
  shotsOnGoal: number
  dangerousAttacks: number
  updatedAt: string
}

export interface LiveSignalEvent {
  matchId: string
  type: LiveAlertType
  message: string
  severity: 'info' | 'watch' | 'hot'
  aiScore: number
  delta?: number
}

const previousSnapshots = new Map<string, LiveMatchSnapshot>()

const SCORE_JUMP_THRESHOLD = 15
const MIN_HOT_SCORE = 80
const PRESSURE_JUMP_THRESHOLD = 12

export function evaluateLiveSignals(matches: LiveMatch[]): LiveSignalEvent[] {
  const events = matches.flatMap(match => {
    const previous = previousSnapshots.get(match.id)
    const current = toSnapshot(match)
    previousSnapshots.set(match.id, current)
    return previous ? compareSnapshots(previous, current, match) : []
  })

  return events
}

export function evaluateLiveSignalsWithSnapshots(
  matches: LiveMatch[],
  previousByMatchId: Map<string, LiveMatchSnapshot>
): { events: LiveSignalEvent[]; snapshots: LiveMatchSnapshot[] } {
  const snapshots: LiveMatchSnapshot[] = []
  const events = matches.flatMap(match => {
    const previous = previousByMatchId.get(match.id)
    const current = toSnapshot(match)
    snapshots.push(current)
    return previous ? compareSnapshots(previous, current, match) : []
  })

  return { events, snapshots }
}

function compareSnapshots(
  previous: LiveMatchSnapshot,
  current: LiveMatchSnapshot,
  match: LiveMatch
): LiveSignalEvent[] {
  const events: LiveSignalEvent[] = []
  const scoreDelta = current.aiScore - previous.aiScore
  const goalDelta = current.scoreHome + current.scoreAway - previous.scoreHome - previous.scoreAway
  const pressureDelta = current.dangerousAttacks - previous.dangerousAttacks

  if (scoreDelta >= SCORE_JUMP_THRESHOLD) {
    events.push({
      matchId: current.matchId,
      type: 'score_jump',
      severity: 'hot',
      aiScore: current.aiScore,
      delta: scoreDelta,
      message: `${match.homeTeam} vs ${match.awayTeam}: AI Score +${scoreDelta} ในรอบล่าสุด`,
    })
  }

  if (previous.aiScore < MIN_HOT_SCORE && current.aiScore >= MIN_HOT_SCORE) {
    events.push({
      matchId: current.matchId,
      type: 'threshold_reached',
      severity: 'hot',
      aiScore: current.aiScore,
      message: `${match.homeTeam} vs ${match.awayTeam}: AI Score แตะ ${current.aiScore}`,
    })
  }

  if (goalDelta > 0) {
    events.push({
      matchId: current.matchId,
      type: 'goal',
      severity: 'watch',
      aiScore: current.aiScore,
      delta: goalDelta,
      message: `${match.homeTeam} vs ${match.awayTeam}: มีประตูใหม่ สกอร์ ${current.scoreHome}-${current.scoreAway}`,
    })
  }

  if (pressureDelta >= PRESSURE_JUMP_THRESHOLD) {
    events.push({
      matchId: current.matchId,
      type: 'pressure_spike',
      severity: 'watch',
      aiScore: current.aiScore,
      delta: pressureDelta,
      message: `${match.homeTeam} vs ${match.awayTeam}: dangerous attacks +${pressureDelta}`,
    })
  }

  return events
}

export function toSnapshot(match: LiveMatch): LiveMatchSnapshot {
  return {
    matchId: match.id,
    aiScore: match.aiScore,
    scoreHome: match.scoreHome,
    scoreAway: match.scoreAway,
    minute: match.minute,
    shotsOnGoal: match.stats.shotsOnGoal,
    dangerousAttacks: match.stats.dangerousAttacks,
    updatedAt: match.lastUpdated,
  }
}
