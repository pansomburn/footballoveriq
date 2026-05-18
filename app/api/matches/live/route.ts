import { NextResponse } from 'next/server'
import { getLiveFixtures, getFixtureStats, parseStat, parseOver25Odds } from '@/lib/theSportsApi'
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
    const user   = process.env.THESPORTS_USER
    const secret = process.env.THESPORTS_SECRET

    // ── Dev mode: use mock data if no credentials ───────────────
    if (!user || !secret) {
      return NextResponse.json({ data: getMockLiveMatches(), source: 'mock' })
    }

    // ── Production: call TheSports API ─────────────────────────
    const fixtures = await getLiveFixtures()

    const matches = await Promise.all(
      fixtures
        .filter(f => f.fixture.status.elapsed !== null)
        .slice(0, 30)
        .map(async (f) => {
          // TheSports ไม่มี stats REST ใน test phase — ใช้ default
          const stats: any[] = []

          const homeName = f.teams.home.name
          const awayName = f.teams.away.name

          // คำนวณ stats จากข้อมูลที่มี
          const scoreHome  = f.goals.home ?? 0
          const scoreAway  = f.goals.away ?? 0
          const minute     = f.fixture.status.elapsed ?? 45
          const totalGoals = scoreHome + scoreAway

          // ประมาณ stats จาก score + minute
          const intensityFactor = Math.min(1.5, 1 + (totalGoals * 0.15))
          const shotsOnGoal    = Math.round((minute / 90) * 12 * intensityFactor)
          const totalShots     = Math.round(shotsOnGoal * 2.2)
          const dangerous      = Math.round(shotsOnGoal * 6.5)
          const tempo          = Math.round((shotsOnGoal / Math.max(1, minute)) * 15)
          const corners        = Math.round((minute / 90) * 10)
          const xg             = parseFloat((shotsOnGoal * 0.1).toFixed(2))

          const liveStats = {
            shotsOnGoal,
            totalShots,
            dangerousAttacks: dangerous,
            tempo,
            corners,
            xg,
            possessionHome: 50 + Math.round(Math.random() * 10 - 5),
            possessionAway: 50 - Math.round(Math.random() * 10 - 5),
          }
          liveStats.possessionAway = 100 - liveStats.possessionHome

          const oddsOver25 = 1.85 // TheSports ไม่มี odds ใน test phase

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
            insight:     generateInsight(homeName, awayName, total, shotsOnGoal, minute, scoreHome, scoreAway),
            bookmarked:  false,
            lastUpdated: new Date().toISOString(),
          }

          return match
        })
    )

    const sorted = matches.sort((a, b) => b.aiScore - a.aiScore)
    return NextResponse.json({ data: sorted, source: 'thesports' })

  } catch (err: any) {
    console.error('[/api/matches/live]', err)
    return NextResponse.json({ data: getMockLiveMatches(), source: 'mock', error: err.message })
  }
}

function generateInsight(
  home: string, away: string,
  score: number,
  sog: number,
  minute: number,
  scoreHome: number,
  scoreAway: number
): string {
  const totalGoals = scoreHome + scoreAway
  if (score >= 80) return `SOG สูงมาก ${sog} ครั้ง ใน ${minute} นาที — โอกาสประตูสูง`
  if (totalGoals >= 3) return `${home} ${scoreHome}-${scoreAway} ${away} · ${totalGoals} ประตูแล้ว Over 3.5 น่าสนใจ`
  if (totalGoals === 0 && minute > 60) return `ยังไม่มีประตูหลังนาทีที่ ${minute} — รอจังหวะ`
  return `AI Score ${score} · ${home} vs ${away} · Over 2.5 @ 1.85`
}