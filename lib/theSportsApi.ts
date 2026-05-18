// lib/theSportsApi.ts
// Wraps TheSports API (api.thesports.com)

const BASE   = 'https://api.thesports.com'
const USER   = process.env.THESPORTS_USER   ?? ''
const SECRET = process.env.THESPORTS_SECRET ?? ''

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

  // Handle Unauthorized or error response
  if (json.err) throw new Error(`TheSports error: ${json.err}`)

  return json as T
}

// ── Types (TheSports raw) ─────────────────────────────────────────

interface TheSportsScheduleResponse {
  results?: TheSportsMatch[]
  results_extra?: {
    competition?: TheSportsCompetition[]
    team?: TheSportsTeam[]
  }
}

interface TheSportsLiveResponse {
  results?: TheSportsMatch[]
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

// ── Output types ──────────────────────────────────────────────────

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

// ── Helpers ───────────────────────────────────────────────────────

function mapStatus(statusId: number): string {
  const map: Record<number, string> = {
    1: 'NS', 2: '1H', 3: 'HT', 4: '2H',
    5: 'ET', 6: 'PEN', 7: 'FT', 8: 'AET', 9: 'FT',
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

function toISO(unixTs: number): string {
  return new Date(unixTs * 1000).toISOString()
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

// ── Public API ────────────────────────────────────────────────────

export async function getLiveFixtures(): Promise<ApiFixture[]> {
  if (!USER || !SECRET) return []

  try {
    const data = await apiFetch<TheSportsLiveResponse>('/v1/football/match/live')
    const matches = data.results ?? []

    // ดึง schedule วันนี้เพื่อเอาชื่อทีม/ลีก
    let extra: TheSportsScheduleResponse['results_extra'] = {}
    try {
      const today = new Date().toISOString().slice(0, 10)
      const scheduleData = await apiFetch<TheSportsScheduleResponse>(
        '/v1/football/match/diary', { date: today }
      )
      extra = scheduleData.results_extra ?? {}
    } catch (e) {
      console.warn('[getLiveFixtures] failed to fetch schedule extra:', e)
    }

    return matches.slice(0, 20).map(m => mapMatchToFixture(m, extra))
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
    const matches = (data.results ?? []).filter(m => m.status_id >= 1 && m.status_id <= 4)
    const extra   = data.results_extra ?? {}
    return matches.slice(0, 30).map(m => mapMatchToFixture(m, extra))
  } catch (e) {
    console.error('[getFixturesByDate]', e)
    return []
  }
}

export async function getFixtureStats(fixtureId: number): Promise<ApiFixtureStats[]> {
  return []
}

export async function getFixtureOdds(fixtureId: number): Promise<ApiOdds[]> {
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