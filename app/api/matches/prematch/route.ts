import { NextResponse } from 'next/server'
import { getFixturesByDate, getH2H } from '@/lib/theSportsApi'
import { getMockPreMatches } from '@/lib/mockData'
import { calcPreScore, scoreToSignal } from '@/lib/scoring'
import type { PreMatch } from '@/types'

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date') ?? new Date().toISOString().split('T')[0]

  try {
    const user   = process.env.THESPORTS_USER
    const secret = process.env.THESPORTS_SECRET

    // ── Dev mode: use mock data if no credentials ───────────────
    if (!user || !secret) {
      return NextResponse.json({ data: getMockPreMatches(date), source: 'mock' })
    }

    // ── Production: call TheSports API ─────────────────────────
    const fixtures = await getFixturesByDate(date)

    const matches = await Promise.all(
      fixtures.slice(0, 20).map(async (f) => {
        // ดึง H2H
        const h2hArr = await getH2H(f.teams.home.id, f.teams.away.id).catch(() => [])

        // คำนวณ H2H Over 2.5 %
        const h2hOver = h2hArr.length > 0
          ? Math.round(
              h2hArr.filter(g => (g.goals.home ?? 0) + (g.goals.away ?? 0) > 2.5).length
              / h2hArr.length * 100
            )
          : 50

        // คำนวณ avg goals จาก H2H
        const avgGoals = h2hArr.length > 0
          ? parseFloat(
              (h2hArr.reduce((sum, g) => sum + (g.goals.home ?? 0) + (g.goals.away ?? 0), 0)
              / h2hArr.length).toFixed(2)
            )
          : 2.5

        // TheSports ไม่มี odds ใน test phase — ประมาณจาก H2H
        const oddsOver25 = h2hOver >= 60 ? 1.72 : h2hOver >= 40 ? 1.90 : 2.10

        const factors = {
          oddsOver25,
          oddsOver35: parseFloat((oddsOver25 + 1.1).toFixed(2)),
          oddsBtts:   parseFloat((oddsOver25 - 0.05).toFixed(2)),
          h2hOver,
          avgGoals,
          lineMovement: 0,
        }

        const { total } = calcPreScore(factors, false, 0.7)
        const signal    = scoreToSignal(total)

        const match: PreMatch = {
          id:          String(f.fixture.id),
          homeTeam:    f.teams.home.name,
          awayTeam:    f.teams.away.name,
          league:      f.league.name,
          leagueFlag:  LEAGUE_FLAGS[f.league.country] ?? '🌐',
          kickoffTime: f.fixture.date,
          signal,
          aiScore:     total,
          factors,
          injuredKey:  null,
          teamContext: null,
          insight:     generateInsight(f.teams.home.name, f.teams.away.name, h2hOver, avgGoals, oddsOver25),
          bookmarked:  false,
        }

        return match
      })
    )

    return NextResponse.json({
      data: matches.sort((a, b) => b.aiScore - a.aiScore),
      source: 'thesports',
    })

  } catch (err: any) {
    console.error('[/api/matches/prematch]', err)
    return NextResponse.json({ data: getMockPreMatches(date), source: 'mock', error: err.message })
  }
}

function generateInsight(
  home: string,
  away: string,
  h2hOver: number,
  avgGoals: number,
  odds: number
): string {
  if (h2hOver >= 70) return `H2H ${h2hOver}% Over · avg ${avgGoals} ประตู · ราคาเข้าที่ ${odds.toFixed(2)}`
  if (avgGoals >= 3)  return `เฉลี่ย ${avgGoals} ประตูต่อเกม · ${home} vs ${away} น่าสนใจ`
  return `H2H Over 2.5: ${h2hOver}% · Avg Goals: ${avgGoals} · Odds: ${odds.toFixed(2)}`
}