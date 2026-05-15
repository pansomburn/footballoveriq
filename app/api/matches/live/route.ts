import { NextResponse } from 'next/server'
import { getLiveFixtures, getFixtureStats, getFixtureOdds, parseStat, parseOver25Odds } from '@/lib/theSportsApi'
import { getMockLiveMatches } from '@/lib/mockData'
import { calcLiveScore, scoreToSignal } from '@/lib/scoring'
import type { LiveMatch } from '@/types'

const LEAGUE_FLAGS: Record<string, string> = {
  'England':     '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'Spain':       '🇪🇸',
  'Germany':     '🇩🇪',
  'Italy':       '🇮🇹',
  'France':      '🇫🇷',
  'Thailand':    '🇹🇭',
  'Netherlands': '🇳🇱',
  'Portugal':    '🇵🇹',
}

export async function GET() {
  try {
    const apiKey = process.env.FOOTBALL_API_KEY

    // ── Dev mode: use mock data if no API key ───────────────────
    if (!apiKey) {
      return NextResponse.json({ data: getMockLiveMatches(), source: 'mock' })
    }

    // ── Production: call real API ───────────────────────────────
    const fixtures = await getLiveFixtures()

    const matches = await Promise.all(
      fixtures
        .filter(f => f.fixture.status.elapsed !== null)
        .slice(0, 30)   // limit to 30 to control API quota
        .map(async (f) => {
          const [statsArr, oddsArr] = await Promise.allSettled([
            getFixtureStats(f.fixture.id),
            getFixtureOdds(f.fixture.id),
          ])

          const stats = statsArr.status === 'fulfilled' ? statsArr.value : []
          const odds  = oddsArr.status  === 'fulfilled' ? oddsArr.value  : []

          const homeName = f.teams.home.name
          const awayName = f.teams.away.name

          const shotsOnGoal = parseStat(stats, homeName, 'Shots on Goal') +
                              parseStat(stats, awayName, 'Shots on Goal')
          const totalShots  = parseStat(stats, homeName, 'Total Shots') +
                              parseStat(stats, awayName, 'Total Shots')
          const dangerous   = parseStat(stats, homeName, 'Dangerous Attacks') +
                              parseStat(stats, awayName, 'Dangerous Attacks')
          const possession  = parseStat(stats, homeName, 'Ball Possession')
          const xg          = (parseStat(stats, homeName, 'Expected Goals') +
                              parseStat(stats, awayName, 'Expected Goals'))

          const liveStats = {
            shotsOnGoal, totalShots,
            dangerousAttacks: dangerous,
            tempo:   Math.round((shotsOnGoal / Math.max(1, f.fixture.status.elapsed ?? 1)) * 15),
            corners: parseStat(stats, homeName, 'Corner Kicks') + parseStat(stats, awayName, 'Corner Kicks'),
            xg:      xg || (shotsOnGoal * 0.1),
            possessionHome: possession,
            possessionAway: 100 - possession,
          }

          const oddsOver25 = parseOver25Odds(odds)
          const minute     = f.fixture.status.elapsed ?? 45
          const scoreHome  = f.goals.home ?? 0
          const scoreAway  = f.goals.away ?? 0

          const { total } = calcLiveScore(liveStats, oddsOver25, minute, scoreHome, scoreAway)
          const signal     = scoreToSignal(total)

          const match: LiveMatch = {
            id:          String(f.fixture.id),
            homeTeam:    homeName,
            awayTeam:    awayName,
            league:      f.league.name,
            leagueFlag:  LEAGUE_FLAGS[f.league.country] ?? '🌐',
            minute,
            scoreHome,
            scoreAway,
            signal,
            aiScore:     total,
            stats:       liveStats,
            insight:     `AI Score ${total} · ${homeName} vs ${awayName} · Over 2.5 @ ${oddsOver25.toFixed(2)}`,
            bookmarked:  false,
            lastUpdated: new Date().toISOString(),
          }

          return match
        })
    )

    const sorted = matches.sort((a, b) => b.aiScore - a.aiScore)
    return NextResponse.json({ data: sorted, source: 'live' })

  } catch (err: any) {
    console.error('[/api/matches/live]', err)
    // fallback to mock on error
    return NextResponse.json({ data: getMockLiveMatches(), source: 'mock', error: err.message })
  }
}
