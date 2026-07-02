import { calcLiveScore, calcPreScore, scoreToSignal } from '@/lib/scoring'
import type { FootballProvider } from '@/lib/footballProvider'
import type { LiveMatch, LiveOverMarket, LiveStats, PreMatch, PreMatchFactors, TeamLiveStats } from '@/types'

const BASE = process.env.LSPORTS_SNAPSHOT_URL ?? 'https://stm-snapshot.lsports.eu'
const USER_NAME = process.env.LSPORTS_USERNAME ?? ''
const PASSWORD = process.env.LSPORTS_PASSWORD ?? ''
const FALLBACK_PACKAGE_ID = Number(process.env.LSPORTS_PACKAGE_ID ?? 0)
const INPLAY_PACKAGE_ID = Number(process.env.LSPORTS_INPLAY_PACKAGE_ID ?? FALLBACK_PACKAGE_ID)
const PREMATCH_PACKAGE_ID = Number(process.env.LSPORTS_PREMATCH_PACKAGE_ID ?? FALLBACK_PACKAGE_ID)
const FOOTBALL_SPORT_ID = Number(process.env.LSPORTS_FOOTBALL_SPORT_ID ?? 6046)
const SNAPSHOT_TIMEOUT_MS = Number(process.env.LSPORTS_SNAPSHOT_TIMEOUT_MS ?? 10000)

const INCIDENT = {
  CORNERS: 1,
  SHOTS_ON_TARGET: 2,
  SHOTS_OFF_TARGET: 3,
  ATTACKS: 4,
  DANGEROUS_ATTACKS: 5,
  RED_CARD: 7,
  GOAL: 9,
  POSSESSION: 11,
  BLOCKED_SHOTS: 16,
  GOAL_ATTEMPTS: 117,
} as const

const LEAGUE_FLAGS: Record<string, string> = {
  England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  Spain: '🇪🇸',
  Germany: '🇩🇪',
  Italy: '🇮🇹',
  France: '🇫🇷',
  Thailand: '🇹🇭',
  Netherlands: '🇳🇱',
  Portugal: '🇵🇹',
  International: '🌐',
}

interface SnapshotRequest {
  packageId: number
  userName: string
  password: string
  sports?: number[]
  fromDate?: number
  toDate?: number
}

interface LsportsResponse<T> {
  Header?: {
    Type?: number
    MsgGuid?: string
    ServerTimestamp?: number
  }
  Body?: T[]
}

interface LsportsResult {
  Position: string
  Value: string
}

interface LsportsParticipant {
  Id: number
  Name: string
  Position: string
}

interface LsportsFixture {
  Sport?: { Id: number; Name: string }
  Location?: { Id: number; Name: string }
  League?: { Id: number; Name: string }
  StartDate?: string
  LastUpdate?: string
  Status?: number
  Participants?: LsportsParticipant[]
}

interface LsportsStatistic {
  Type: number
  Results?: LsportsResult[]
}

interface LsportsScoreboard {
  Status?: number
  CurrentPeriod?: number
  Time?: string
  Results?: LsportsResult[]
  Clock?: {
    Status?: number
    Seconds?: number
  }
}

interface LsportsLivescore {
  Scoreboard?: LsportsScoreboard
  Statistics?: LsportsStatistic[]
}

interface LsportsBet {
  Id?: number
  Name?: string
  BaseLine?: string
  Price?: string | number
  Status?: number
  Line?: string
  LastUpdate?: string
}

interface LsportsMarket {
  Id?: number
  Name?: string
  Bets?: LsportsBet[]
}

interface LsportsEvent {
  FixtureId: number
  Fixture?: LsportsFixture
  Livescore?: LsportsLivescore
  Markets?: LsportsMarket[] | null
}

export function isLsportsConfigured(): boolean {
  return Boolean(USER_NAME && PASSWORD && (INPLAY_PACKAGE_ID || PREMATCH_PACKAGE_ID))
}

export class LsportsProvider implements FootballProvider {
  readonly source = 'lsports'

  async getLiveMatches(): Promise<LiveMatch[]> {
    const events = await snapshot<LsportsEvent>('InPlay', 'GetEvents')

    return events
      .filter(isFootballEvent)
      .map(mapLiveEvent)
      .sort((a, b) => b.aiScore - a.aiScore)
  }

  async getPreMatches(date: string): Promise<PreMatch[]> {
    const { fromDate, toDate } = dateWindowMs(date)
    const events = await snapshot<LsportsEvent>('PreMatch', 'GetEvents', { fromDate, toDate })

    return events
      .filter(isFootballEvent)
      .map(mapPreMatchEvent)
      .sort((a, b) => b.aiScore - a.aiScore)
  }
}

async function snapshot<T>(
  service: 'InPlay' | 'PreMatch',
  action: 'GetEvents',
  filters: Partial<SnapshotRequest> = {}
): Promise<T[]> {
  if (!isLsportsConfigured()) {
    throw new Error('LSports credentials are not configured')
  }

  const packageId = getPackageId(service)

  const body: SnapshotRequest = {
    packageId,
    userName: USER_NAME,
    password: PASSWORD,
    sports: [FOOTBALL_SPORT_ID],
    ...filters,
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), SNAPSHOT_TIMEOUT_MS)

  const res = await fetch(`${BASE}/${service}/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
    signal: controller.signal,
  }).finally(() => clearTimeout(timeout))

  if (!res.ok) {
    throw new Error(`LSports ${service}/${action} failed: ${res.status}`)
  }

  const json = await res.json() as LsportsResponse<T> | T[]
  return Array.isArray(json) ? json : json.Body ?? []
}

function getPackageId(service: 'InPlay' | 'PreMatch'): number {
  const packageId = service === 'InPlay' ? INPLAY_PACKAGE_ID : PREMATCH_PACKAGE_ID
  if (!packageId) {
    throw new Error(`LSports ${service} package id is not configured`)
  }

  return packageId
}

function isFootballEvent(event: LsportsEvent): boolean {
  return event.Fixture?.Sport?.Id === FOOTBALL_SPORT_ID || event.Fixture?.Sport?.Name === 'Football'
}

function mapLiveEvent(event: LsportsEvent): LiveMatch {
  const fixture = event.Fixture
  const home = participant(fixture, '1')
  const away = participant(fixture, '2')
  const stats = event.Livescore?.Statistics ?? []
  const scoreboard = event.Livescore?.Scoreboard
  const scoreHome = resultValue(scoreboard?.Results, '1')
  const scoreAway = resultValue(scoreboard?.Results, '2')
  const minute = Math.max(0, Math.floor((scoreboard?.Clock?.Seconds ?? Number(scoreboard?.Time ?? 0)) / 60))

  const liveStats = mapLiveStats(stats)
  const statsByTeam = mapTeamLiveStats(stats)
  const overMarket = getBestOverMarket(event.Markets)
  const oddsForScore = overMarket?.odds ?? 1.9
  const { total } = calcLiveScore(liveStats, oddsForScore, minute, scoreHome, scoreAway)
  const signal = scoreToSignal(total)

  return {
    id: String(event.FixtureId),
    homeTeam: home?.Name ?? 'Home',
    awayTeam: away?.Name ?? 'Away',
    league: fixture?.League?.Name ?? 'Unknown League',
    leagueFlag: LEAGUE_FLAGS[fixture?.Location?.Name ?? ''] ?? '🌐',
    minute,
    scoreHome,
    scoreAway,
    signal,
    aiScore: total,
    stats: liveStats,
    statsByTeam,
    overMarket,
    insight: liveInsight(total, liveStats, minute, scoreHome, scoreAway, overMarket),
    bookmarked: false,
    lastUpdated: fixture?.LastUpdate ?? new Date().toISOString(),
  }
}

function mapPreMatchEvent(event: LsportsEvent): PreMatch {
  const fixture = event.Fixture
  const home = participant(fixture, '1')
  const away = participant(fixture, '2')
  const oddsOver25 = getMarketPrice(event.Markets, ['over 2.5', 'over 2,5']) ?? 1.9
  const oddsOver35 = getMarketPrice(event.Markets, ['over 3.5', 'over 3,5']) ?? Number((oddsOver25 + 1.1).toFixed(2))
  const oddsBtts = getMarketPrice(event.Markets, ['yes'], ['both teams', 'btts']) ?? Number(Math.max(1.3, oddsOver25 - 0.05).toFixed(2))

  const factors: PreMatchFactors = {
    oddsOver25,
    oddsOver35,
    oddsBtts,
    h2hOver: 50,
    avgGoals: 2.5,
    lineMovement: 0,
  }

  const { total } = calcPreScore(factors, false, 0.65)
  const signal = scoreToSignal(total)

  return {
    id: String(event.FixtureId),
    homeTeam: home?.Name ?? 'Home',
    awayTeam: away?.Name ?? 'Away',
    league: fixture?.League?.Name ?? 'Unknown League',
    leagueFlag: LEAGUE_FLAGS[fixture?.Location?.Name ?? ''] ?? '🌐',
    kickoffTime: fixture?.StartDate ?? new Date().toISOString(),
    signal,
    aiScore: total,
    factors,
    injuredKey: null,
    teamContext: null,
    insight: preMatchInsight(factors),
    bookmarked: false,
  }
}

function mapLiveStats(stats: LsportsStatistic[]): LiveStats {
  const shotsOn = statTotal(stats, INCIDENT.SHOTS_ON_TARGET)
  const shotsOff = statTotal(stats, INCIDENT.SHOTS_OFF_TARGET)
  const blocked = statTotal(stats, INCIDENT.BLOCKED_SHOTS)
  const goalAttempts = statTotal(stats, INCIDENT.GOAL_ATTEMPTS)
  const totalShots = Math.max(shotsOn + shotsOff + blocked, goalAttempts)

  return {
    shotsOnGoal: shotsOn,
    totalShots,
    dangerousAttacks: statTotal(stats, INCIDENT.DANGEROUS_ATTACKS),
    tempo: statTotal(stats, INCIDENT.ATTACKS),
    corners: statTotal(stats, INCIDENT.CORNERS),
    xg: Number((shotsOn * 0.12 + totalShots * 0.025).toFixed(2)),
    possessionHome: resultValue(findStat(stats, INCIDENT.POSSESSION)?.Results, '1', 50),
    possessionAway: resultValue(findStat(stats, INCIDENT.POSSESSION)?.Results, '2', 50),
  }
}

function mapTeamLiveStats(stats: LsportsStatistic[]): { home: TeamLiveStats; away: TeamLiveStats } {
  const shotsOn = statSplit(stats, INCIDENT.SHOTS_ON_TARGET)
  const shotsOff = statSplit(stats, INCIDENT.SHOTS_OFF_TARGET)
  const blocked = statSplit(stats, INCIDENT.BLOCKED_SHOTS)
  const goalAttempts = statSplit(stats, INCIDENT.GOAL_ATTEMPTS)
  const dangerous = statSplit(stats, INCIDENT.DANGEROUS_ATTACKS)
  const attacks = statSplit(stats, INCIDENT.ATTACKS)
  const corners = statSplit(stats, INCIDENT.CORNERS)
  const possession = statSplit(stats, INCIDENT.POSSESSION, 50)

  const homeShots = Math.max(shotsOn.home + shotsOff.home + blocked.home, goalAttempts.home)
  const awayShots = Math.max(shotsOn.away + shotsOff.away + blocked.away, goalAttempts.away)

  return {
    home: {
      shotsOnGoal: shotsOn.home,
      totalShots: homeShots,
      dangerousAttacks: dangerous.home,
      attacks: attacks.home,
      corners: corners.home,
      possession: possession.home,
    },
    away: {
      shotsOnGoal: shotsOn.away,
      totalShots: awayShots,
      dangerousAttacks: dangerous.away,
      attacks: attacks.away,
      corners: corners.away,
      possession: possession.away,
    },
  }
}

function participant(fixture: LsportsFixture | undefined, position: string): LsportsParticipant | undefined {
  return fixture?.Participants?.find(item => item.Position === position)
}

function findStat(stats: LsportsStatistic[], type: number): LsportsStatistic | undefined {
  return stats.find(stat => stat.Type === type)
}

function statTotal(stats: LsportsStatistic[], type: number): number {
  const stat = findStat(stats, type)
  return resultValue(stat?.Results, '1') + resultValue(stat?.Results, '2')
}

function statSplit(stats: LsportsStatistic[], type: number, fallback = 0): { home: number; away: number } {
  const stat = findStat(stats, type)
  return {
    home: resultValue(stat?.Results, '1', fallback),
    away: resultValue(stat?.Results, '2', fallback),
  }
}

function resultValue(results: LsportsResult[] | undefined, position: string, fallback = 0): number {
  const raw = results?.find(result => result.Position === position)?.Value
  if (raw == null) return fallback
  const parsed = Number(String(raw).replace('%', ''))
  return Number.isFinite(parsed) ? parsed : fallback
}

function getMarketPrice(
  markets: LsportsMarket[] | null | undefined,
  betNeedles: string[],
  marketNeedles: string[] = []
): number | undefined {
  for (const market of markets ?? []) {
    const marketName = (market.Name ?? '').toLowerCase()
    if (marketNeedles.length > 0 && !marketNeedles.some(needle => marketName.includes(needle))) continue

    for (const bet of market.Bets ?? []) {
      const label = `${bet.Name ?? ''} ${bet.BaseLine ?? ''} ${bet.Line ?? ''}`.toLowerCase()
      if (!betNeedles.some(needle => label.includes(needle))) continue

      const price = Number(bet.Price)
      if (Number.isFinite(price) && price > 1) return price
    }
  }

  return undefined
}

function getBestOverMarket(markets: LsportsMarket[] | null | undefined): LiveOverMarket | null {
  const candidates: LiveOverMarket[] = []

  for (const market of markets ?? []) {
    const marketName = market.Name ?? ''
    if (!isFullTimeGoalsOverMarket(marketName)) continue

    for (const bet of market.Bets ?? []) {
      const betName = bet.Name ?? ''
      const label = `${betName} ${bet.BaseLine ?? ''} ${bet.Line ?? ''}`.toLowerCase()
      if (!label.includes('over')) continue
      if (bet.Status != null && bet.Status !== 1) continue

      const odds = Number(bet.Price)
      if (!Number.isFinite(odds) || odds <= 1) continue

      const line = normalizeOverLine(bet.BaseLine ?? bet.Line ?? betName)
      if (!line) continue

      candidates.push({ line, odds, marketName, updatedAt: bet.LastUpdate })
    }
  }

  if (candidates.length === 0) return null

  return candidates.sort((a, b) => {
    const priceDelta = Math.abs(a.odds - 1.95) - Math.abs(b.odds - 1.95)
    if (Math.abs(priceDelta) > 0.001) return priceDelta
    const lineDelta = Math.abs(Number(a.line) - 2.5) - Math.abs(Number(b.line) - 2.5)
    if (lineDelta !== 0) return lineDelta
    return b.odds - a.odds
  })[0]
}

function isFullTimeGoalsOverMarket(marketName: string): boolean {
  const name = marketName.toLowerCase().replace(/\s+/g, ' ').trim()
  if (!name) return false

  const excludedTerms = [
    'card',
    'booking',
    'yellow',
    'red card',
    'corner',
    'tackle',
    'foul',
    'shot',
    'goal kick',
    'offside',
    'throw',
    'save',
    'woodwork',
    'home team',
    'away team',
    '1st period',
    '2nd period',
    'first half',
    'second half',
    '1st half',
    '2nd half',
    '15 minute',
    '10 minute',
    '30 minute',
    'period',
    'quarter',
    'double chance',
    '1x2 and',
    'both teams to score',
    ' and ',
  ]

  if (excludedTerms.some(term => name.includes(term))) return false

  return [
    'under/over',
    'asian under/over',
    'under/over goals',
    'total goals',
    'goals over/under',
    'match goals',
  ].some(validName => name === validName || name.includes(validName))
}

function normalizeOverLine(value: string): string | null {
  const match = value.match(/(?:over\s*)?(\d+(?:[.,]\d+)?)/i)
  return match ? match[1].replace(',', '.') : null
}

function dateWindowMs(date: string): { fromDate: number; toDate: number } {
  const start = new Date(`${date}T00:00:00.000Z`)
  const end = new Date(`${date}T23:59:59.999Z`)
  return { fromDate: start.getTime(), toDate: end.getTime() }
}

function liveInsight(
  score: number,
  stats: LiveStats,
  minute: number,
  scoreHome: number,
  scoreAway: number,
  overMarket: LiveOverMarket | null
): string {
  const goals = scoreHome + scoreAway
  const marketText = overMarket ? `O${overMarket.line} @ ${overMarket.odds.toFixed(2)}` : 'market ยังไม่พร้อม'
  if (score >= 80) return `AI Score ${score} จาก SOG ${stats.shotsOnGoal}, danger ${stats.dangerousAttacks}, ${marketText}`
  if (goals >= 2 && minute < 70) return `${goals} ประตูแล้วตั้งแต่นาที ${minute} ยังมีเวลาให้ Over เดินต่อ`
  if (stats.dangerousAttacks >= 70) return `Dangerous attacks สูง (${stats.dangerousAttacks}) เกมกำลังกดดันต่อเนื่อง`
  return `AI Score ${score} · SOG ${stats.shotsOnGoal} · danger ${stats.dangerousAttacks}`
}

function preMatchInsight(factors: PreMatchFactors): string {
  return `O2.5 @ ${factors.oddsOver25.toFixed(2)} · BTTS @ ${factors.oddsBtts.toFixed(2)} · baseline avg ${factors.avgGoals}`
}
