// lib/theSportsApi.ts
// Wraps TheSports API (api.thesports.com)

const BASE   = 'https://api.thesports.com'
const USER   = process.env.THESPORTS_USER   ?? ''
const SECRET = process.env.THESPORTS_SECRET ?? ''

// ── Technical Statistics type codes ──────────────────────────────
// 2=Corner, 3=Yellow, 4=Red, 21=Shots on target, 22=Shots off target
// 23=Attacks, 24=Dangerous Attack, 25=Ball possession, 37=Blocked shots
const STAT = {
  CORNER:           2,
  YELLOW:           3,
  RED:              4,
  SHOTS_ON_TARGET:  21,
  SHOTS_OFF_TARGET: 22,
  ATTACKS:          23,
  DANGEROUS:        24,
  POSSESSION:       25,
  BLOCKED:          37,
}

// ── Core fetch ────────────────────────────────────────────────────
async function apiFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  if (!USER || !SECRET) {
    throw new Error('ยังไม่ได้ตั้งค่า THESPORTS_USER / THESPORTS_SECRET')
  }

  const url = new URL(`${BASE}${path}`)
  url.searchParams.set('user', USER)
  url.searchParams.set('secret', SECRET)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))

  const res = await fetch(url.toString(), { cache: 'no-store' })
  if (!res.ok) throw new Error(`TheSports HTTP error: ${res.status} ${path}`)

  const json = await res.json()
  if (json.err) throw new Error(`TheSports error: ${json.err}`)

  return json as T
}

// ── Raw Types ─────────────────────────────────────────────────────

interface TheSportsScheduleResponse {
  code?: number
  results?: TheSportsMatch[]
  results_extra?: {
    competition?: TheSportsCompetition[]
    team?: TheSportsTeam[]
  }
}

interface TheSportsMatch {
  id: string
  competition_id: string
  season_id: string
  home_team_id: string
  away_team_id: string
  status_id: number
  match_time: number
  home_scores: number[]
  away_scores: number[]
  note: string
}

interface TheSportsCompetition {
  id: string
  name: string
  logo: string
  country_name?: string
}

interface TheSportsTeam {
  id: string
  name: string
  logo: string
}

// detail_live format
interface TheSportsDetailLiveResponse {
  code?: number
  results?: TheSportsDetailMatch[]
}

interface TheSportsDetailMatch {
  id: string
  score: [string, number, number[], number[], number, string]
  stats?: Array<{ type: number; home: number; away: number }>
  incidents?: unknown[]
  tlive?: unknown[]
}

// ── Output Types ──────────────────────────────────────────────────

export interface ApiFixture {
  fixture: { id: number; date: string; status: { short: string; elapsed: number | null } }
  league:  { id: number; name: string; country: string; logo: string; flag: string }
  teams:   { home: { id: number; name: string }; away: { id: number; name: string } }
  goals:   { home: number | null; away: number | null }
  score:   { halftime: { home: number | null; away: number | null } }
}

export interface ApiFixtureStats {
  team:       { id: number; name: string }
  statistics: Array<{ type: string; value: number | string | null }>
}

export interface ApiOdds {
  fixture: { id: number }
  bookmakers: Array<{
    id: number; name: string
    bets: Array<{
      id: number; name: string
      values: Array<{ value: string; odd: string }>
    }>
  }>
}

// detail_live enriched
export interface ApiLiveDetail {
  matchId:          string
  statusId:         number
  scoreHome:        number
  scoreAway:        number
  htHome:           number
  htAway:           number
  corners:          number
  yellowCards:      number
  redCards:         number
  shotsOnTarget:    number
  shotsOffTarget:   number
  attacks:          number
  dangerousAttacks: number
  possessionHome:   number
  possessionAway:   number
  kickOffTs:        number
  minute:           number
}

// ── Helpers ───────────────────────────────────────────────────────

function mapStatus(statusId: number): string {
  const map: Record<number, string> = {
    1: 'NS', 2: '1H', 3: 'HT', 4: '2H',
    5: 'ET', 6: 'ET', 7: 'PEN', 8: 'FT',
    9: 'DELAY', 10: 'INT', 11: 'INT', 12: 'CANC', 13: 'TBD',
  }
  return map[statusId] ?? 'NS'
}

function estimateElapsed(matchTime: number, statusId: number): number | null {
  if (statusId === 1 || statusId >= 7) return null
  if (statusId === 3) return 45
  const elapsedMin = Math.floor((Date.now() / 1000 - matchTime) / 60)
  if (statusId === 4) return Math.min(45 + elapsedMin, 90)
  return Math.min(elapsedMin, 45)
}

// คำนวณ minute จาก kickoff timestamp ตาม doc TheSports
function calcMinute(kickOffTs: number, statusId: number): number {
  if (!kickOffTs || statusId === 1 || statusId >= 7) return 0
  if (statusId === 3) return 45
  const elapsed = Math.floor((Date.now() / 1000 - kickOffTs) / 60) + 1
  if (statusId === 4) return Math.min(45 + elapsed, 90 + 5)
  return Math.min(elapsed, 45 + 5)
}

function toISO(unixTs: number): string {
  return new Date(unixTs * 1000).toISOString()
}

function getStat(stats: Array<{ type: number; home: number; away: number }>, type: number): { home: number; away: number } {
  const s = stats.find(x => x.type === type)
  return s ? { home: s.home, away: s.away } : { home: 0, away: 0 }
}

function mapMatchToFixture(
  match: TheSportsMatch,
  extra?: TheSportsScheduleResponse['results_extra']
): ApiFixture {
  const teams = extra?.team ?? []
  const comps = extra?.competition ?? []

  const homeTeam = teams.find(t => t.id === match.home_team_id)
  const awayTeam = teams.find(t => t.id === match.away_team_id)
  const comp     = comps.find(c => c.id === match.competition_id)

  return {
    fixture: {
      id:     parseInt(match.id, 10) || 0,
      date:   toISO(match.match_time),
      status: {
        short:   mapStatus(match.status_id),
        elapsed: estimateElapsed(match.match_time, match.status_id),
      },
    },
    league: {
      id:      parseInt(match.competition_id, 10) || 0,
      name:    comp?.name         ?? 'Unknown League',
      country: comp?.country_name ?? '-',
      logo:    comp?.logo         ?? '',
      flag:    '',
    },
    teams: {
      home: { id: parseInt(match.home_team_id, 10) || 0, name: homeTeam?.name ?? `Home ${match.home_team_id}` },
      away: { id: parseInt(match.away_team_id, 10) || 0, name: awayTeam?.name ?? `Away ${match.away_team_id}` },
    },
    goals: {
      home: match.home_scores?.[0] ?? null,
      away: match.away_scores?.[0] ?? null,
    },
    score: {
      halftime: {
        home: match.home_scores?.[1] ?? null,
        away: match.away_scores?.[1] ?? null,
      },
    },
  }
}

// ── Parse detail_live ─────────────────────────────────────────────
function parseDetailLive(raw: TheSportsDetailMatch): ApiLiveDetail {
  const score     = raw.score ?? []
  const statusId  = (score[1] as number) ?? 0
  const homeArr   = (score[2] as number[]) ?? []
  const awayArr   = (score[3] as number[]) ?? []
  const kickOffTs = (score[4] as number) ?? 0
  const stats     = raw.stats ?? []

  const shotsOn  = getStat(stats, STAT.SHOTS_ON_TARGET)
  const shotsOff = getStat(stats, STAT.SHOTS_OFF_TARGET)
  const attacks  = getStat(stats, STAT.ATTACKS)
  const danger   = getStat(stats, STAT.DANGEROUS)
  const poss     = getStat(stats, STAT.POSSESSION)
  const corners  = getStat(stats, STAT.CORNER)
  const yellow   = getStat(stats, STAT.YELLOW)
  const red      = getStat(stats, STAT.RED)

  const minute = calcMinute(kickOffTs, statusId)

  return {
    matchId:          raw.id,
    statusId,
    scoreHome:        homeArr[0] ?? 0,
    scoreAway:        awayArr[0] ?? 0,
    htHome:           homeArr[1] ?? 0,
    htAway:           awayArr[1] ?? 0,
    corners:          corners.home + corners.away,
    yellowCards:      yellow.home + yellow.away,
    redCards:         red.home + red.away,
    shotsOnTarget:    shotsOn.home + shotsOn.away,
    shotsOffTarget:   shotsOff.home + shotsOff.away,
    attacks:          attacks.home + attacks.away,
    dangerousAttacks: danger.home + danger.away,
    possessionHome:   poss.home || 50,
    possessionAway:   poss.away || 50,
    kickOffTs,
    minute,
  }
}

// ── Public API ────────────────────────────────────────────────────

/** ดึง live fixtures พร้อม real-time stats จาก detail_live */
export async function getLiveFixtures(): Promise<ApiFixture[]> {
  if (!USER || !SECRET) return []

  try {
    // 1) ดึง real-time data
    const liveData = await apiFetch<TheSportsDetailLiveResponse>(
      '/v1/football/match/detail_live'
    )
    const liveMatches = liveData.results ?? []
    if (liveMatches.length === 0) return []

    // 2) ดึง schedule วันนี้เพื่อเอาชื่อทีม/ลีก
    let extra: TheSportsScheduleResponse['results_extra'] = {}
    try {
      const today = new Date().toISOString().slice(0, 10)
      const scheduleData = await apiFetch<TheSportsScheduleResponse>(
        '/v1/football/match/diary', { date: today }
      )
      extra = scheduleData.results_extra ?? {}
    } catch (e) {
      console.warn('[getLiveFixtures] schedule extra failed:', e)
    }

    // 3) join ข้อมูล
    const scheduleResults = await apiFetch<TheSportsScheduleResponse>(
      '/v1/football/match/diary',
      { date: new Date().toISOString().slice(0, 10) }
    ).then(d => d.results ?? []).catch(() => [] as TheSportsMatch[])

    return liveMatches.slice(0, 20).map(liveMatch => {
      const detail   = parseDetailLive(liveMatch)
      const schedule = scheduleResults.find(s => s.id === liveMatch.id)

      const homeTeam  = extra?.team?.find(t => t.id === schedule?.home_team_id)
      const awayTeam  = extra?.team?.find(t => t.id === schedule?.away_team_id)
      const comp      = extra?.competition?.find(c => c.id === schedule?.competition_id)

      return {
        fixture: {
          id:     parseInt(liveMatch.id, 10) || 0,
          date:   schedule ? toISO(schedule.match_time) : new Date().toISOString(),
          status: {
            short:   mapStatus(detail.statusId),
            elapsed: detail.minute,
          },
        },
        league: {
          id:      parseInt(schedule?.competition_id ?? '0', 10),
          name:    comp?.name         ?? 'Unknown League',
          country: comp?.country_name ?? '-',
          logo:    comp?.logo         ?? '',
          flag:    '',
        },
        teams: {
          home: { id: parseInt(schedule?.home_team_id ?? '0', 10), name: homeTeam?.name ?? `Match ${liveMatch.id}` },
          away: { id: parseInt(schedule?.away_team_id ?? '0', 10), name: awayTeam?.name ?? 'Away' },
        },
        goals: { home: detail.scoreHome, away: detail.scoreAway },
        score: { halftime: { home: detail.htHome, away: detail.htAway } },
        // extra stats สำหรับ live route
        _detail: detail,
      } as ApiFixture & { _detail: ApiLiveDetail }
    })
  } catch (e) {
    console.error('[getLiveFixtures]', e)
    return []
  }
}

export async function getFixturesByDate(date: string): Promise<ApiFixture[]> {
  if (!USER || !SECRET) return []

  try {
    const data = await apiFetch<TheSportsScheduleResponse>(
      '/v1/football/match/diary', { date }
    )
    // กรอง NS(1) + กำลังแข่ง(2-5)
    const matches = (data.results ?? []).filter(m => m.status_id >= 1 && m.status_id <= 5)
    const extra   = data.results_extra ?? {}
    return matches.slice(0, 30).map(m => mapMatchToFixture(m, extra))
  } catch (e) {
    console.error('[getFixturesByDate]', e)
    return []
  }
}

export async function getFixtureStats(fixtureId: number): Promise<ApiFixtureStats[]> {
  void fixtureId
  return []
}

export async function getFixtureOdds(fixtureId: number): Promise<ApiOdds[]> {
  void fixtureId
  return []
}

export async function getH2H(homeId: number, awayId: number): Promise<ApiFixture[]> {
  if (!USER || !SECRET) return []

  try {
    const data = await apiFetch<TheSportsScheduleResponse>(
      '/v1/football/match/recent', {
        home_team_id: String(homeId),
        away_team_id: String(awayId),
        limit: '10',
      }
    )
    const matches = data.results ?? []
    const extra   = data.results_extra ?? {}
    return matches.map(m => mapMatchToFixture(m, extra))
  } catch (e) {
    console.error('[getH2H]', e)
    return []
  }
}

export function parseStat(stats: ApiFixtureStats[], teamName: string, type: string): number {
  const team = stats.find(s => s.team.name === teamName)
  if (!team) return 0
  const stat = team.statistics.find(s => s.type === type)
  if (!stat || stat.value == null) return 0
  return typeof stat.value === 'string'
    ? parseInt(stat.value.replace('%', ''), 10) || 0
    : Number(stat.value)
}

export function parseOver25Odds(odds: ApiOdds[]): number {
  for (const odd of odds) {
    for (const bm of odd.bookmakers) {
      const market = bm.bets.find(b => b.name === 'Goals Over/Under')
      if (!market) continue
      const over25 = market.values.find(v => v.value === 'Over 2.5')
      if (over25) return parseFloat(over25.odd)
    }
  }
  return 1.90
}
