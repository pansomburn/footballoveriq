import type { LiveMatch, PreMatch } from '@/types'
import { calcLiveScore, calcPreScore, scoreToSignal } from './scoring'

// ─── Live mock data ───────────────────────────────────────────
const RAW_LIVE = [
  { id:'l1', homeTeam:'Manchester City', awayTeam:'Arsenal',         league:'Premier League', leagueFlag:'🏴󠁧󠁢󠁥󠁮󠁧󠁿', minute:67, scoreHome:1, scoreAway:1, sog:9,  shots:18, da:82, tempo:78, corners:8,  xg:1.87, possH:58, possA:42, bookmarked:true  },
  { id:'l2', homeTeam:'Real Madrid',     awayTeam:'Atletico Madrid', league:'La Liga',         leagueFlag:'🇪🇸', minute:54, scoreHome:1, scoreAway:0, sog:7,  shots:15, da:74, tempo:71, corners:6,  xg:1.52, possH:62, possA:38, bookmarked:true  },
  { id:'l3', homeTeam:'Bayern Munich',   awayTeam:'Leverkusen',      league:'Bundesliga',      leagueFlag:'🇩🇪', minute:38, scoreHome:0, scoreAway:0, sog:6,  shots:14, da:70, tempo:74, corners:5,  xg:1.20, possH:55, possA:45, bookmarked:false },
  { id:'l4', homeTeam:'PSG',             awayTeam:'Monaco',          league:'Ligue 1',         leagueFlag:'🇫🇷', minute:71, scoreHome:2, scoreAway:1, sog:8,  shots:16, da:76, tempo:68, corners:9,  xg:1.65, possH:60, possA:40, bookmarked:false },
  { id:'l5', homeTeam:'Liverpool',       awayTeam:'Chelsea',         league:'Premier League', leagueFlag:'🏴󠁧󠁢󠁥󠁮󠁧󠁿', minute:45, scoreHome:1, scoreAway:1, sog:5,  shots:12, da:61, tempo:63, corners:5,  xg:1.10, possH:52, possA:48, bookmarked:false },
  { id:'l6', homeTeam:'Barcelona',       awayTeam:'Sevilla',         league:'La Liga',         leagueFlag:'🇪🇸', minute:29, scoreHome:0, scoreAway:0, sog:4,  shots:10, da:58, tempo:60, corners:4,  xg:0.88, possH:65, possA:35, bookmarked:false },
  { id:'l7', homeTeam:'Dortmund',        awayTeam:'Frankfurt',       league:'Bundesliga',      leagueFlag:'🇩🇪', minute:62, scoreHome:1, scoreAway:2, sog:5,  shots:11, da:55, tempo:57, corners:6,  xg:0.95, possH:48, possA:52, bookmarked:false },
  { id:'l8', homeTeam:'Napoli',          awayTeam:'Juventus',        league:'Serie A',         leagueFlag:'🇮🇹', minute:50, scoreHome:0, scoreAway:0, sog:4,  shots:9,  da:52, tempo:54, corners:3,  xg:0.80, possH:50, possA:50, bookmarked:false },
  { id:'l9', homeTeam:'Inter Milan',     awayTeam:'AC Milan',        league:'Serie A',         leagueFlag:'🇮🇹', minute:78, scoreHome:0, scoreAway:0, sog:3,  shots:7,  da:42, tempo:40, corners:4,  xg:0.55, possH:45, possA:55, bookmarked:false },
  { id:'l10',homeTeam:'Tottenham',       awayTeam:'West Ham',        league:'Premier League', leagueFlag:'🏴󠁧󠁢󠁥󠁮󠁧󠁿', minute:82, scoreHome:1, scoreAway:1, sog:2,  shots:6,  da:38, tempo:36, corners:3,  xg:0.42, possH:54, possA:46, bookmarked:false },
  { id:'l11',homeTeam:'Buriram United',  awayTeam:'BG Pathum',       league:'Thai League',     leagueFlag:'🇹🇭', minute:44, scoreHome:1, scoreAway:0, sog:3,  shots:7,  da:36, tempo:38, corners:2,  xg:0.60, possH:53, possA:47, bookmarked:false },
]

export function getMockLiveMatches(): LiveMatch[] {
  return RAW_LIVE.map(m => {
    const stats = {
      shotsOnGoal: m.sog, totalShots: m.shots, dangerousAttacks: m.da,
      tempo: m.tempo, corners: m.corners, xg: m.xg,
      possessionHome: m.possH, possessionAway: m.possA,
    }
    const oddsOver25 = 1.75 + Math.random() * 0.6
    const { total } = calcLiveScore(stats, oddsOver25, m.minute, m.scoreHome, m.scoreAway)
    const signal = scoreToSignal(total)

    const insights: Record<string,string> = {
      l1: 'SOG สูงมาก ราคา Over 2.5 ยังค้ำ 1.85 ทั้งสองทีมบุกต่อเนื่อง',
      l2: 'Real กดดันต่อเนื่อง Atletico โดนใบแดง เกมเปิดขึ้น',
      l3: '0-0 ช่วงต้น แต่ tempo สูง คาดประตูมาช่วงกลาง–ปลาย',
      l4: '2-1 นาที 71 ราคา Over 3.5 ลงมา 1.95 น่าสนใจ',
      l5: 'ครึ่งแรกสูสี ครึ่งหลังอาจเปิดมากขึ้น รอดูโมเมนตัม',
      l6: 'Barca ครองเกมแต่ยังไม่ทำประตู รอดูนาที 35+',
      l7: 'Dortmund ตามอยู่ 1-2 กำลังกดดัน อาจได้ประตูเพิ่ม',
      l8: '0-0 ครึ่งแรกค่อนข้างปิด รอดูครึ่งหลัง',
      l9: '0-0 ปลายเกม เกมปิดมาก ความเสี่ยงสูง',
      l10:'ปลายเกม 1-1 ราคา Over 2.5 แพงแล้ว ไม่คุ้ม',
      l11:'ข้อมูล stat จำกัด ความมั่นใจต่ำ',
    }

    return {
      id: m.id, homeTeam: m.homeTeam, awayTeam: m.awayTeam,
      league: m.league, leagueFlag: m.leagueFlag,
      minute: m.minute, scoreHome: m.scoreHome, scoreAway: m.scoreAway,
      signal, aiScore: total, stats, bookmarked: m.bookmarked,
      insight: insights[m.id] ?? 'กำลังวิเคราะห์ข้อมูล...',
      lastUpdated: new Date().toISOString(),
    }
  }).sort((a, b) => b.aiScore - a.aiScore)
}

// ─── Pre-match mock data ──────────────────────────────────────
const RAW_PRE = [
  { id:'p1', homeTeam:'Man City',    awayTeam:'Arsenal',     league:'Premier League', leagueFlag:'🏴󠁧󠁢󠁥󠁮󠁧󠁿', kickoff:'20:45', o25:1.78, o35:3.10, btts:1.68, h2h:75, avgGoals:2.8, lineMove:7,  injured:'Haaland', ctx:0.9, insight:'H2H 75% Over · ฟอร์มเฉลี่ย 2.8 · ราคาไหลเข้า Over', bookmarked:true  },
  { id:'p2', homeTeam:'Barcelona',   awayTeam:'Real Madrid', league:'La Liga',         leagueFlag:'🇪🇸', kickoff:'21:00', o25:1.85, o35:3.30, btts:1.72, h2h:68, avgGoals:2.6, lineMove:5,  injured:null,       ctx:0.85,insight:'El Clasico มักมีประตูสูง · ทั้งสองทีมฟอร์มดี', bookmarked:false },
  { id:'p3', homeTeam:'Bayern',      awayTeam:'Leverkusen',  league:'Bundesliga',      leagueFlag:'🇩🇪', kickoff:'22:30', o25:1.90, o35:3.20, btts:1.75, h2h:70, avgGoals:2.9, lineMove:4,  injured:null,       ctx:0.7, insight:'Bundesliga ลีก avg goals สูงสุดในยุโรป', bookmarked:true  },
  { id:'p4', homeTeam:'PSG',         awayTeam:'Lyon',        league:'Ligue 1',         leagueFlag:'🇫🇷', kickoff:'21:05', o25:1.95, o35:3.60, btts:1.80, h2h:60, avgGoals:2.4, lineMove:2,  injured:'Mbappé',   ctx:0.6, insight:'ตัวเจ็บกองหน้าหลัก ราคา Over ยังไม่ปรับ', bookmarked:false },
  { id:'p5', homeTeam:'Inter',       awayTeam:'Napoli',      league:'Serie A',         leagueFlag:'🇮🇹', kickoff:'20:00', o25:2.05, o35:3.80, btts:1.85, h2h:55, avgGoals:2.1, lineMove:1,  injured:null,       ctx:0.5, insight:'Serie A มักปิดเกม ราคาเกิน 2.0 เสี่ยงสูง', bookmarked:false },
  { id:'p6', homeTeam:'Buriram',     awayTeam:'BG Pathum',   league:'Thai League',     leagueFlag:'🇹🇭', kickoff:'18:00', o25:2.20, o35:4.50, btts:2.00, h2h:45, avgGoals:1.8, lineMove:0,  injured:null,       ctx:0.4, insight:'ข้อมูลสถิติจำกัด ไม่แนะนำในตอนนี้', bookmarked:false },
]

export function getMockPreMatches(date?: string): PreMatch[] {
  return RAW_PRE.map(m => {
    const factors = {
      oddsOver25: m.o25, oddsOver35: m.o35, oddsBtts: m.btts,
      h2hOver: m.h2h, avgGoals: m.avgGoals, lineMovement: m.lineMove,
    }
    const { total } = calcPreScore(factors, !!m.injured, m.ctx)
    const signal = scoreToSignal(total)

    const today = new Date()
    const iso = `${today.toISOString().split('T')[0]}T${m.kickoff}:00+07:00`

    return {
      id: m.id, homeTeam: m.homeTeam, awayTeam: m.awayTeam,
      league: m.league, leagueFlag: m.leagueFlag,
      kickoffTime: iso, signal, aiScore: total,
      factors, injuredKey: m.injured, teamContext: null,
      insight: m.insight, bookmarked: m.bookmarked,
    }
  }).sort((a, b) => b.aiScore - a.aiScore)
}
