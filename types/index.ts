// ─── Signal & Market ───────────────────────────────────────
export type Signal   = 'HOT' | 'WATCH' | 'WAIT'
export type Market   = 'OVER25' | 'OVER35' | 'BTTS'
export type Mode     = 'live' | 'prematch'
export type UserTier = 'free' | 'basic' | 'pro'

// ─── Live Match ─────────────────────────────────────────────
export interface LiveStats {
  shotsOnGoal:      number
  totalShots:       number
  dangerousAttacks: number
  tempo:            number
  corners:          number
  xg:               number
  possessionHome:   number
  possessionAway:   number
}

export interface TeamLiveStats {
  shotsOnGoal:      number
  totalShots:       number
  dangerousAttacks: number
  attacks:          number
  corners:          number
  possession:       number
}

export interface LiveOverMarket {
  line:       string
  odds:       number
  marketName: string
  updatedAt?: string
}

export interface LiveMatch {
  id:           string
  homeTeam:     string
  awayTeam:     string
  league:       string
  leagueFlag:   string
  minute:       number
  scoreHome:    number
  scoreAway:    number
  signal:       Signal
  aiScore:      number
  stats:        LiveStats
  statsByTeam?: {
    home: TeamLiveStats
    away: TeamLiveStats
  }
  overMarket?:  LiveOverMarket | null
  insight:      string
  bookmarked:   boolean
  lastUpdated:  string
}

// ─── Pre-match ───────────────────────────────────────────────
export interface PreMatchFactors {
  oddsOver25:   number
  oddsOver35:   number
  oddsBtts:     number
  h2hOver:      number   // % of H2H games that went over 2.5
  avgGoals:     number   // avg goals per game (form last 5)
  lineMovement: number   // positive = moving toward Over
}

export interface PreMatch {
  id:           string
  homeTeam:     string
  awayTeam:     string
  league:       string
  leagueFlag:   string
  kickoffTime:  string  // ISO string
  signal:       Signal
  aiScore:      number
  factors:      PreMatchFactors
  injuredKey:   string | null
  teamContext:  string | null
  insight:      string
  bookmarked:   boolean
}

// ─── Score Breakdown ─────────────────────────────────────────
export interface ScoreBreakdown {
  factor:  string
  points:  number
  maxPts:  number
  pct:     number
}

// ─── Notification ────────────────────────────────────────────
export interface NotificationRule {
  matchId:         string
  threshold:       number  // AI score threshold to notify
  alertOnGoal:     boolean
  alertOnPressure: boolean
}

// ─── User / Auth ─────────────────────────────────────────────
export interface UserProfile {
  id:              string
  email:           string
  displayName:     string
  tier:            UserTier
  trialEndsAt:     string | null
  subscriptionEnd: string | null
  lineLinked:      boolean
}

// ─── Filter state ────────────────────────────────────────────
export interface LiveFilter {
  signal:  Signal | 'ALL' | 'BOOKMARK'
  league:  string   // league name or 'ALL'
  market:  Market | 'ALL'
  search:  string
}

export interface PreMatchFilter {
  date:    string   // YYYY-MM-DD
  signal:  Signal | 'ALL' | 'BOOKMARK'
  league:  string
  market:  Market | 'ALL'
  search:  string
}
