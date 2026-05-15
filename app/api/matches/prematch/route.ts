import { NextResponse } from 'next/server'
import { getFixturesByDate, getFixtureOdds, getH2H, parseOver25Odds } from '@/lib/theSportsApi'
import { getMockPreMatches } from '@/lib/mockData'
import { calcPreScore, scoreToSignal } from '@/lib/scoring'
import type { PreMatch } from '@/types'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date') ?? new Date().toISOString().split('T')[0]

  try {
    const apiKey = process.env.FOOTBALL_API_KEY
    if (!apiKey) {
      return NextResponse.json({ data: getMockPreMatches(date), source: 'mock' })
    }

    const fixtures = await getFixturesByDate(date)

    const matches = await Promise.all(
      fixtures.slice(0, 20).map(async (f) => {
        const [oddsArr, h2hArr] = await Promise.allSettled([
          getFixtureOdds(f.fixture.id),
          getH2H(f.teams.home.id, f.teams.away.id),
        ])

        const odds = oddsArr.status === 'fulfilled' ? oddsArr.value : []
        const h2h  = h2hArr.status  === 'fulfilled' ? h2hArr.value : []

        const oddsOver25 = parseOver25Odds(odds)

        // Calculate H2H Over% from last 10 games
        const h2hOver = h2h.length > 0
          ? Math.round(h2h.filter(g => (g.goals.home ?? 0) + (g.goals.away ?? 0) > 2.5).length / h2h.length * 100)
          : 50

        const factors = {
          oddsOver25, oddsOver35: oddsOver25 + 1.2,
          oddsBtts: oddsOver25 - 0.1,
          h2hOver,
          avgGoals: 2.4,   // would need form API call for real data
          lineMovement: 0,
        }

        const { total } = calcPreScore(factors, false, 0.7)
        const signal    = scoreToSignal(total)

        const match: PreMatch = {
          id:           String(f.fixture.id),
          homeTeam:     f.teams.home.name,
          awayTeam:     f.teams.away.name,
          league:       f.league.name,
          leagueFlag:   '🌐',
          kickoffTime:  f.fixture.date,
          signal,
          aiScore:      total,
          factors,
          injuredKey:   null,
          teamContext:  null,
          insight:      `H2H Over 2.5: ${h2hOver}% · Odds: ${oddsOver25.toFixed(2)}`,
          bookmarked:   false,
        }

        return match
      })
    )

    return NextResponse.json({
      data: matches.sort((a, b) => b.aiScore - a.aiScore),
      source: 'live',
    })

  } catch (err: any) {
    console.error('[/api/matches/prematch]', err)
    return NextResponse.json({ data: getMockPreMatches(date), source: 'mock', error: err.message })
  }
}
