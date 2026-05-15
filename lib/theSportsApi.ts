// lib/theSportsApi.ts
// Wraps TheSports API (api.thesports.com)
// ใช้แทน API-Football — output types เหมือนกันทุกอย่าง
// Docs: https://docs.thesports.com

const BASE   = 'https://api.thesports.com'
const USER   = process.env.THESPORTS_USER   ?? ''
const SECRET = process.env.THESPORTS_SECRET ?? ''

// ── Core fetch ────────────────────────────────────────────────────
async function apiFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  if (!USER || !SECRET) {
    throw new Error('ยังไม่ได้ตั้งค่า THESPORTS_USER / THESPORTS_SECRET ใน .env.local')
  }

  const url = new URL(`${BASE}${path}`)
  url.searchParams.set('user', USER)
  url.searchParams.set('secret', SECRET)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))

  const res = await fetch(url.toString(), {
    next: { revalidate: 60 },  // cache 60s บน Next.js edge
  })

  if (!res.ok) throw new Error(`TheSports error: ${res.status} ${path}`)

  const json = await res.json()
  if (json.code !== 0) throw new Error(`TheSports code ${json.code}: ${path}`)

  return json as T
}

// ── Types (TheSports raw) ─────────────────────────────────────────

interface TheSportsScheduleResponse {
  code: number
  results: TheSportsMatch[]
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
  match_time: number           // unix timestamp
  home_scores: number[]        // [regular, halftime, red, yellow, corners, OT, penalty]
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

interface TheSportsLiveResponse {
  code: number
  results: TheSportsMatch[]
}

// ── Output types (เหมือน footballApi.ts) ─────────────────────────

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

// ── Helpers ────────────────────────────────────────────────────────

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
  const teams  = extra?.team ?? []
  const comps  = extra?.competition ?? []

  const homeTeam = teams.find(t => t.id === match.home_team_id)
  const awayTeam = teams.find(t => t.id === match.away_team_id)
  const comp     = comps.find(c => c.id === match.competition_id)

  const homeGoals = match.home_scores?.[0] ?? null
  const awayGoals = match.away_scores?.[0] ?? null
  const homeHT    = match.home_scores?.[1] ?? null
  const awayHT    = match.away_scores?.[1] ?? null

  return {
    fixture: {
      id:     parseInt(match.id, 10),
      date:   toISO(match.match_time),
      status: {
        short:   mapStatus(match.status_id),
        elapsed: estimateElapsed(match.match_time, match.status_id),
      },
    },
    league: {
      id:      parseInt(match.competition_id, 10),
      name:    comp?.name    ?? 'Unknown League',
      country: comp?.country_name ?? '-',
      logo:    comp?.logo    ?? '',
      flag:    '',
    },
    teams: {
      home: { id: parseInt(match.home_team_id, 10), name: homeTeam?.name ?? `Home ${match.home_team_id}` },
      away: { id: parseInt(match.away_team_id, 10), name: awayTeam?.name ?? `Away ${match.away_team_id}` },
    },
    goals: { home: homeGoals, away: awayGoals },
    score: { halftime: { home: homeHT, away: awayHT } },
  }
}

// ── Public API (drop-in แทน footballApi.ts) ───────────────────────

/** ดึง live fixtures ทั้งหมดที่กำลังแข่งอยู่ */
export async function getLiveFixtures(): Promise<ApiFixture[]> {
  if (!USER || !SECRET) return []

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
  } catch {
    // ถ้าดึงไม่ได้ ใช้ชื่อว่างไปก่อน
  }

  return matches.slice(0, 20).map(m => mapMatchToFixture(m, extra))
}

/** ดึง fixtures ตามวันที่ */
export async function getFixturesByDate(date: string): Promise<ApiFixture[]> {
  if (!USER || !SECRET) return []

  const data = await apiFetch<TheSportsScheduleResponse>(
    '/v1/football/match/diary', { date }
  )
  const matches = data.results ?? []
  const extra   = data.results_extra ?? {}

  // กรองเฉพาะที่ยังไม่แข่ง + กำลังแข่ง (status 1-4)
  const filtered = matches.filter(m => m.status_id >= 1 && m.status_id <= 4)

  return filtered.slice(0, 30).map(m => mapMatchToFixture(m, extra))
}

/** ดึง live stats — TheSports ส่งผ่าน websocket เป็นหลัก
 *  REST ไม่มี stats รายละเอียด → return corners จาก scores แทน */
export async function getFixtureStats(fixtureId: number): Promise<ApiFixtureStats[]> {
  // TheSports ไม่มี REST stats endpoint ใน test phase
  // คืน empty array — scoringEngine จะใช้ default 0
  return []
}

/** TheSports ไม่มี odds ใน test phase → return empty */
export async function getFixtureOdds(fixtureId: number): Promise<ApiOdds[]> {
  return []
}

/** ดึง H2H จาก recent matches */
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
  } catch {
    return []
  }
}

// ── Helpers (re-export เพื่อ drop-in compatibility) ───────────────

export function parseStat(
  stats: ApiFixtureStats[],
  teamName: string,
  type: string
): number {
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
  return 1.90  // fallback
}