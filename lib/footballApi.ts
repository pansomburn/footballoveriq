// lib/footballApi.ts
// Wraps api-sports.io (API-Football v3)
// Docs: https://www.api-football.com/documentation-v3

const BASE = 'https://v3.football.api-sports.io'
const KEY  = process.env.FOOTBALL_API_KEY ?? ''

async function apiFetch<T>(path: string, params: Record<string,string> = {}): Promise<T> {
  const url = new URL(`${BASE}${path}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))

  const res = await fetch(url.toString(), {
    headers: { 'x-apisports-key': KEY },
    next: { revalidate: 60 },   // cache 60s on Next.js edge
  })

  if (!res.ok) throw new Error(`API-Football error: ${res.status} ${path}`)
  const json = await res.json()
  if (json.errors && Object.keys(json.errors).length > 0) {
    throw new Error(`API-Football: ${JSON.stringify(json.errors)}`)
  }
  return json.response as T
}

// ── Types from API-Football ──────────────────────────────────────
export interface ApiFixture {
  fixture: { id: number; date: string; status: { short: string; elapsed: number | null } }
  league:  { id: number; name: string; country: string; logo: string; flag: string }
  teams:   { home: { id: number; name: string }; away: { id: number; name: string } }
  goals:   { home: number | null; away: number | null }
  score:   { halftime: { home: number|null; away: number|null } }
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

// ── Fetch live fixtures ───────────────────────────────────────────
export async function getLiveFixtures(): Promise<ApiFixture[]> {
  if (!KEY) return []   // dev: return empty (use mock)
  return apiFetch('/fixtures', { live: 'all' })
}

// ── Fetch fixtures by date ────────────────────────────────────────
export async function getFixturesByDate(date: string): Promise<ApiFixture[]> {
  if (!KEY) return []
  return apiFetch('/fixtures', { date, status: 'NS-1H-HT-2H' })
}

// ── Fetch live stats for a fixture ───────────────────────────────
export async function getFixtureStats(fixtureId: number): Promise<ApiFixtureStats[]> {
  if (!KEY) return []
  return apiFetch('/fixtures/statistics', { fixture: String(fixtureId) })
}

// ── Fetch odds for a fixture ──────────────────────────────────────
export async function getFixtureOdds(fixtureId: number): Promise<ApiOdds[]> {
  if (!KEY) return []
  return apiFetch('/odds', { fixture: String(fixtureId), bookmaker: '8' }) // bet365 = 8
}

// ── Fetch H2H ────────────────────────────────────────────────────
export async function getH2H(homeId: number, awayId: number): Promise<ApiFixture[]> {
  if (!KEY) return []
  return apiFetch('/fixtures/headtohead', { h2h: `${homeId}-${awayId}`, last: '10' })
}

// ── Parse stat value helper ───────────────────────────────────────
export function parseStat(stats: ApiFixtureStats[], teamName: string, type: string): number {
  const team = stats.find(s => s.team.name === teamName)
  if (!team) return 0
  const stat = team.statistics.find(s => s.type === type)
  if (!stat || stat.value == null) return 0
  return typeof stat.value === 'string'
    ? parseInt(stat.value.replace('%',''), 10) || 0
    : Number(stat.value)
}

// ── Parse Over 2.5 odds from bookmaker response ───────────────────
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
