import { NextResponse } from 'next/server'
import { getLiveFixtures } from '@/lib/theSportsApi'
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

    if (!user || !secret) {
      return NextResponse.json({ data: getMockLiveMatches(), source: 'mock' })
    }

    const fixtures = await getLiveFixtures() as any[]

    if (fixtures.length === 0) {
      return NextResponse.json({ data: getMockLiveMatches(), source: 'mock-empty' })
    }

    const matches = fixtures.map(f => {
      const detail = f._detail
      const homeName = f.teams.home.name
      const awayName = f.teams.away.name

      const scoreHome = detail?.scoreHome ?? f.goals.home ?? 0
      const scoreAway = detail?.scoreAway ?? f.goals.away ?? 0
      const minute    = detail?.minute ?? f.fixture.status.elapsed ?? 45

      const liveStats = {
        shotsOnGoal:      detail?.shotsOnTarget    ?? 0,
        totalShots:       (detail?.shotsOnTarget ?? 0) + (detail?.shotsOffTarget ?? 0),
        dangerousAttacks: detail?.dangerousAttacks ?? 0,
        tempo:            detail?.attacks          ?? 0,
        corners:          detail?.corners          ?? 0,
        xg:               parseFloat(((detail?.shotsOnTarget ?? 0) * 0.1).toFixed(2)),
        possessionHome:   detail?.possessionHome   ?? 50,
        possessionAway:   detail?.possessionAway   ?? 50,
      }

      const { total } = calcLiveScore(liveStats, 1.85, minute, scoreHome, scoreAway)
      const signal    = scoreToSignal(total)

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
        insight:     generateInsight(homeName, awayName, total, liveStats.shotsOnGoal, minute, scoreHome, scoreAway),
        bookmarked:  false,
        lastUpdated: new Date().toISOString(),
      }

      return match
    })

    return NextResponse.json({
      data: matches.sort((a, b) => b.aiScore - a.aiScore),
      source: 'thesports',
    })

  } catch (err: any) {
    console.error('[/api/matches/live]', err)
    return NextResponse.json({ data: getMockLiveMatches(), source: 'mock', error: err.message })
  }
}

function generateInsight(home: string, away: string, score: number, sog: number, minute: number, sh: number, sa: number): string {
  const total = sh + sa
  if (score >= 80) return `SOG ${sog} ครั้งใน ${minute} นาที — โอกาสประตูสูง`
  if (total >= 3)  return `${sh}-${sa} ${total} ประตูแล้ว Over 3.5 น่าสนใจ`
  if (total === 0 && minute > 60) return `ยังไม่มีประตูหลังนาที ${minute} — รอจังหวะ`
  return `AI Score ${score} · ${home} vs ${away}`
}