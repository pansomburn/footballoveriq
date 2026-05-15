import type { LiveStats, PreMatchFactors, Signal, ScoreBreakdown } from '@/types'

// ─── Weights ────────────────────────────────────────────────
const LIVE_WEIGHTS = {
  shotsOnGoal:      25,
  xg:               20,
  dangerousAttacks: 20,
  oddsStrength:     20,
  matchContext:     15,
}

const PRE_WEIGHTS = {
  oddsAndMovement: 25,
  h2h:             20,
  form:            20,
  injuries:        15,
  teamContext:     10,
  historicalEdge:  10,
}

// ─── Thresholds ─────────────────────────────────────────────
export const SIGNAL_THRESHOLDS = { HOT: 72, WATCH: 50 }
export const NOTIFY_SCORE_JUMP  = 15   // alert if score jumps this much in 5 min
export const NOTIFY_MIN_SCORE   = 80   // alert if score hits this threshold

// ─── Live Scoring ────────────────────────────────────────────
export function calcLiveScore(
  stats: LiveStats,
  oddsOver25: number,
  minute: number,
  scoreHome: number,
  scoreAway: number
): { total: number; breakdown: ScoreBreakdown[] } {

  const totalGoals = scoreHome + scoreAway

  // SOG component (0–25)
  const sogNorm   = Math.min(stats.shotsOnGoal / 12, 1)
  const sogPts    = Math.round(sogNorm * LIVE_WEIGHTS.shotsOnGoal)

  // xG component (0–20)
  const xgNorm    = Math.min(stats.xg / 2.5, 1)
  const xgPts     = Math.round(xgNorm * LIVE_WEIGHTS.xg)

  // Dangerous attacks (0–20)
  const dangNorm  = Math.min(stats.dangerousAttacks / 100, 1)
  const dangPts   = Math.round(dangNorm * LIVE_WEIGHTS.dangerousAttacks)

  // Odds strength — lower odds = bookmaker confident = good sign (0–20)
  // over25 odds range: 1.20 (strong) to 3.00 (weak)
  const oddsNorm  = Math.max(0, Math.min((3.0 - oddsOver25) / 1.8, 1))
  const oddsPts   = Math.round(oddsNorm * LIVE_WEIGHTS.oddsStrength)

  // Match context (0–15): goals already in + time remaining bonus
  const needGoals = Math.max(0, 3 - totalGoals)    // need for over 2.5
  const timeLeft  = Math.max(0, 90 - minute)
  const ctxScore  = needGoals <= 1 ? 0.9 : needGoals === 2 ? 0.6 : 0.3
  const timeBonus = timeLeft > 30 ? 1 : timeLeft > 15 ? 0.7 : 0.4
  const ctxPts    = Math.round(ctxScore * timeBonus * LIVE_WEIGHTS.matchContext)

  const total = Math.min(96, Math.max(10, sogPts + xgPts + dangPts + oddsPts + ctxPts))

  const breakdown: ScoreBreakdown[] = [
    { factor: 'Shots on Goal',      points: sogPts,  maxPts: 25, pct: sogPts  / 25 * 100 },
    { factor: 'xG',                 points: xgPts,   maxPts: 20, pct: xgPts   / 20 * 100 },
    { factor: 'Dangerous Attacks',  points: dangPts, maxPts: 20, pct: dangPts / 20 * 100 },
    { factor: 'Odds Strength',      points: oddsPts, maxPts: 20, pct: oddsPts / 20 * 100 },
    { factor: 'Match Context',      points: ctxPts,  maxPts: 15, pct: ctxPts  / 15 * 100 },
  ]

  return { total, breakdown }
}

// ─── Pre-match Scoring ────────────────────────────────────────
export function calcPreScore(
  factors: PreMatchFactors,
  hasKeyInjury: boolean,
  motivationLevel: number  // 0–1 (1 = high stakes)
): { total: number; breakdown: ScoreBreakdown[] } {

  // Odds + line movement (0–25)
  const oddsNorm  = Math.max(0, Math.min((2.5 - factors.oddsOver25) / 1.3, 1))
  const movementBonus = Math.min(factors.lineMovement / 10, 0.2)
  const oddsPts   = Math.round((oddsNorm + movementBonus) * PRE_WEIGHTS.oddsAndMovement)

  // H2H (0–20): 80%+ over = max points
  const h2hPts    = Math.round((factors.h2hOver / 100) * PRE_WEIGHTS.h2h)

  // Form / avg goals (0–20): 3.5+ goals avg = max
  const formNorm  = Math.min(factors.avgGoals / 3.5, 1)
  const formPts   = Math.round(formNorm * PRE_WEIGHTS.form)

  // Injuries: key defender missing = Over boost
  const injPts    = hasKeyInjury ? Math.round(0.85 * PRE_WEIGHTS.injuries) : Math.round(0.4 * PRE_WEIGHTS.injuries)

  // Team context / motivation (0–10)
  const ctxPts    = Math.round(motivationLevel * PRE_WEIGHTS.teamContext)

  // Historical edge (0–10) based on line movement
  const edgePts   = Math.round(Math.min(factors.lineMovement / 15, 1) * PRE_WEIGHTS.historicalEdge)

  const total = Math.min(94, Math.max(10,
    oddsPts + h2hPts + formPts + injPts + ctxPts + edgePts
  ))

  const breakdown: ScoreBreakdown[] = [
    { factor: 'Odds + Line Movement', points: oddsPts, maxPts: 25, pct: oddsPts / 25 * 100 },
    { factor: 'H2H History',          points: h2hPts,  maxPts: 20, pct: h2hPts  / 20 * 100 },
    { factor: 'Form (5 เกม)',          points: formPts, maxPts: 20, pct: formPts / 20 * 100 },
    { factor: 'Lineup / Injuries',    points: injPts,  maxPts: 15, pct: injPts  / 15 * 100 },
    { factor: 'Team Motivation',      points: ctxPts,  maxPts: 10, pct: ctxPts  / 10 * 100 },
    { factor: 'Historical Edge',      points: edgePts, maxPts: 10, pct: edgePts / 10 * 100 },
  ]

  return { total, breakdown }
}

// ─── Signal from score ───────────────────────────────────────
export function scoreToSignal(score: number): Signal {
  if (score >= SIGNAL_THRESHOLDS.HOT)   return 'HOT'
  if (score >= SIGNAL_THRESHOLDS.WATCH) return 'WATCH'
  return 'WAIT'
}

// ─── Style helpers ───────────────────────────────────────────
export const signalColor = (s: Signal) => ({
  HOT:   'var(--green)',
  WATCH: 'var(--amber)',
  WAIT:  'var(--blue)',
})[s]

export const signalBg = (s: Signal) => ({
  HOT:   'var(--green-bg)',
  WATCH: 'var(--amber-bg)',
  WAIT:  'var(--blue-bg)',
})[s]

export const signalBorder = (s: Signal) => ({
  HOT:   'rgba(0,166,81,.25)',
  WATCH: 'rgba(245,158,11,.25)',
  WAIT:  'rgba(59,130,246,.25)',
})[s]

export const signalAccent = (s: Signal) => ({
  HOT:   '#00a651',
  WATCH: '#f59e0b',
  WAIT:  '#3b82f6',
})[s]
