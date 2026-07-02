'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock3,
  Eye,
  ShieldCheck,
  Target,
  TrendingUp,
  XCircle,
} from 'lucide-react'

type Decision = 'PLAY' | 'WATCH' | 'WAIT' | 'SKIP'
type GoalWindow = 'NOW_5' | 'NEXT_10' | 'WAIT'
type MarketTrust = 'VERIFIED' | 'MISSING' | 'STALE'
type PressureSide = 'HOME' | 'AWAY' | 'BALANCED'

interface MockSignal {
  id: string
  decision: Decision
  league: string
  minute: number
  home: string
  away: string
  score: string
  confidence: number
  goalWindow: GoalWindow
  pressureSide: PressureSide
  headline: string
  action: string
  marketTrust: MarketTrust
  marketLabel: string
  lastUpdate: string
  evidence: Array<{ label: string; value: string; note: string; tone: 'good' | 'warn' | 'muted' }>
  risks: string[]
  split: {
    sog: [number, number]
    dangerous: [number, number]
    corners: [number, number]
    tempo: number
  }
  recent: Array<{ minute: string; text: string; impact: number }>
}

const SIGNALS: MockSignal[] = [
  {
    id: 'fr-swe',
    decision: 'PLAY',
    league: 'World Cup',
    minute: 73,
    home: 'France',
    away: 'Sweden',
    score: '1-1',
    confidence: 84,
    goalWindow: 'NEXT_10',
    pressureSide: 'HOME',
    headline: 'มีโอกาสเกิดประตูใน 5-10 นาที',
    action: 'ดูตลาด Over หรือ Next Goal ตอนนี้',
    marketTrust: 'VERIFIED',
    marketLabel: 'O2.25 @ 1.98',
    lastUpdate: '12s ago',
    evidence: [
      { label: 'Momentum spike', value: '+31', note: '5 นาทีล่าสุดแรงขึ้นชัด', tone: 'good' },
      { label: 'SOG split', value: '7-2', note: 'ฝรั่งเศสยิงเข้ากรอบนำ', tone: 'good' },
      { label: 'Goal need', value: 'Need 1', note: 'สกอร์ 1-1 ยังต้องการอีกลูก', tone: 'good' },
      { label: 'Market trust', value: 'Verified', note: 'ตลาด full-time goals O/U', tone: 'good' },
    ],
    risks: ['ราคาเริ่มขยับเร็ว ต้องไม่ไล่ถ้าต่ำกว่า 1.55', 'ถ้าไม่มี shot เพิ่มใน 3 นาทีให้ลดความมั่นใจ'],
    split: { sog: [7, 2], dangerous: [58, 24], corners: [6, 1], tempo: 166 },
    recent: [
      { minute: "68'", text: 'Dangerous attacks เพิ่มต่อเนื่อง', impact: 18 },
      { minute: "70'", text: 'ได้ corner ติดกันสองครั้ง', impact: 24 },
      { minute: "72'", text: 'ยิงเข้ากรอบเพิ่มอีก 1 ครั้ง', impact: 31 },
    ],
  },
  {
    id: 'liv-che',
    decision: 'WATCH',
    league: 'Premier League',
    minute: 61,
    home: 'Liverpool',
    away: 'Chelsea',
    score: '0-0',
    confidence: 66,
    goalWindow: 'WAIT',
    pressureSide: 'BALANCED',
    headline: 'แรงกดเริ่มมา แต่ยังไม่ถึงจุดเข้า',
    action: 'รอ pressure spike หรือ SOG เพิ่ม',
    marketTrust: 'MISSING',
    marketLabel: 'No verified O/U',
    lastUpdate: '18s ago',
    evidence: [
      { label: 'Momentum', value: '+14', note: 'เริ่มดีขึ้นแต่ยังไม่แรง', tone: 'warn' },
      { label: 'SOG split', value: '3-3', note: 'สองฝั่งยังสูสี', tone: 'muted' },
      { label: 'Goal need', value: 'Need 3', note: 'ยังไกลสำหรับ O2.5', tone: 'warn' },
      { label: 'Market trust', value: 'Missing', note: 'ยังไม่มีราคา goals ที่เชื่อถือได้', tone: 'warn' },
    ],
    risks: ['0-0 นาที 61 ยังต้องการหลายประตู', 'ยังไม่มี verified market มาช่วยยืนยัน'],
    split: { sog: [3, 3], dangerous: [39, 35], corners: [4, 3], tempo: 138 },
    recent: [
      { minute: "55'", text: 'Tempo เริ่มสูงขึ้น', impact: 8 },
      { minute: "58'", text: 'ทั้งสองทีมมี shot แต่ยังไม่เข้าเป้าเพิ่ม', impact: 12 },
      { minute: "60'", text: 'Danger ขยับขึ้นฝั่งเจ้าบ้าน', impact: 14 },
    ],
  },
  {
    id: 'mad-atm',
    decision: 'WAIT',
    league: 'La Liga',
    minute: 42,
    home: 'Real Madrid',
    away: 'Atletico Madrid',
    score: '1-0',
    confidence: 48,
    goalWindow: 'WAIT',
    pressureSide: 'HOME',
    headline: 'ยังไม่ใช่จังหวะประตูใกล้มา',
    action: 'รอดูครึ่งหลัง',
    marketTrust: 'VERIFIED',
    marketLabel: 'O2.5 @ 2.22',
    lastUpdate: '21s ago',
    evidence: [
      { label: 'Momentum', value: '+5', note: 'ยังนิ่ง', tone: 'muted' },
      { label: 'SOG split', value: '4-1', note: 'เจ้าบ้านดีกว่าแต่ไม่ถี่', tone: 'warn' },
      { label: 'Goal need', value: 'Need 2', note: 'ยังต้องการอีกสองลูก', tone: 'warn' },
      { label: 'Market trust', value: 'Verified', note: 'ราคาใช้ได้แต่ยังไม่ยืนยันจังหวะ', tone: 'good' },
    ],
    risks: ['ช่วงเวลาก่อนพักครึ่ง signal แกว่งง่าย', 'Atletico ยังไม่ได้เปิดเกมเต็มที่'],
    split: { sog: [4, 1], dangerous: [31, 19], corners: [3, 1], tempo: 104 },
    recent: [
      { minute: "36'", text: 'Real ครองเกมแต่จังหวะยิงลดลง', impact: 4 },
      { minute: "39'", text: 'ไม่มี SOG เพิ่ม', impact: 2 },
      { minute: "41'", text: 'Danger ขยับเล็กน้อย', impact: 5 },
    ],
  },
  {
    id: 'int-mil',
    decision: 'SKIP',
    league: 'Serie A',
    minute: 82,
    home: 'Inter Milan',
    away: 'AC Milan',
    score: '0-0',
    confidence: 24,
    goalWindow: 'WAIT',
    pressureSide: 'BALANCED',
    headline: 'ข้ามคู่นี้ก่อน โอกาสใกล้ประตูต่ำ',
    action: 'ไม่ต้องเสีย attention',
    marketTrust: 'STALE',
    marketLabel: 'Price stale',
    lastUpdate: '2m ago',
    evidence: [
      { label: 'Momentum', value: '-6', note: 'เกมแผ่วลง', tone: 'warn' },
      { label: 'SOG split', value: '2-1', note: 'คุณภาพโอกาสต่ำ', tone: 'warn' },
      { label: 'Goal need', value: 'Need 3', note: 'เวลาเหลือน้อยเกินไป', tone: 'warn' },
      { label: 'Market trust', value: 'Stale', note: 'ราคาไม่สดพอ', tone: 'warn' },
    ],
    risks: ['นาทีท้ายแต่ยังไม่มี pressure', 'ราคาหรือ feed ไม่สดพอ'],
    split: { sog: [2, 1], dangerous: [22, 18], corners: [2, 2], tempo: 74 },
    recent: [
      { minute: "76'", text: 'Tempo ลดลง', impact: -4 },
      { minute: "79'", text: 'ไม่มี shot ใหม่', impact: -5 },
      { minute: "82'", text: 'Feed price stale', impact: -6 },
    ],
  },
]

const DECISION_COPY: Record<Decision, { label: string; tone: string; bg: string; border: string; icon: React.ReactNode }> = {
  PLAY: {
    label: 'PLAY NOW',
    tone: 'var(--green-300)',
    bg: 'rgba(46,212,111,.12)',
    border: 'rgba(46,212,111,.36)',
    icon: <Target size={14} />,
  },
  WATCH: {
    label: 'WATCH',
    tone: 'var(--amber)',
    bg: 'rgba(245,165,36,.12)',
    border: 'rgba(245,165,36,.32)',
    icon: <Eye size={14} />,
  },
  WAIT: {
    label: 'WAIT',
    tone: 'var(--blue)',
    bg: 'rgba(91,157,255,.11)',
    border: 'rgba(91,157,255,.28)',
    icon: <Clock3 size={14} />,
  },
  SKIP: {
    label: 'SKIP',
    tone: 'var(--text-3)',
    bg: 'rgba(255,255,255,.04)',
    border: 'var(--hairline)',
    icon: <XCircle size={14} />,
  },
}

export default function GoalSignalMockupPage() {
  const [selectedId, setSelectedId] = useState(SIGNALS[0].id)
  const [isNarrow, setIsNarrow] = useState(false)
  const selected = useMemo(() => SIGNALS.find(signal => signal.id === selectedId) ?? SIGNALS[0], [selectedId])
  const playCount = SIGNALS.filter(signal => signal.decision === 'PLAY').length
  const watchCount = SIGNALS.filter(signal => signal.decision === 'WATCH').length

  useEffect(() => {
    const check = () => setIsNarrow(window.innerWidth < 900)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg-deep)', color: 'var(--text-1)' }}>
      <header style={{
        minHeight: 60,
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
        padding: isNarrow ? '10px 14px' : '0 20px',
        background: 'var(--bg-base)',
        borderBottom: '1px solid var(--hairline)',
        position: 'sticky',
        top: 0,
        zIndex: 20,
      }}>
        <div style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          display: 'grid',
          placeItems: 'center',
          background: 'var(--green-500)',
          color: '#062014',
          fontWeight: 900,
          fontSize: 12,
        }}>OQ</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800 }}>Goal Signal Mockup</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>AI decision-first live in-play concept</div>
        </div>
        <div style={{
          marginLeft: isNarrow ? 0 : 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: isNarrow ? '100%' : 'auto',
          overflowX: 'auto',
          paddingBottom: isNarrow ? 2 : 0,
        }}>
          <StatusPill label={`${playCount} PLAY`} tone="good" />
          <StatusPill label={`${watchCount} WATCH`} tone="warn" />
          {!isNarrow && <StatusPill label="LSports mock feed" tone="muted" />}
        </div>
      </header>

      <section style={{
        display: 'grid',
        gridTemplateColumns: isNarrow ? 'minmax(0, 1fr)' : 'minmax(380px, 0.9fr) minmax(420px, 1.1fr)',
        gap: 16,
        padding: isNarrow ? 10 : 16,
        maxWidth: 1360,
        margin: '0 auto',
      }}>
        <DashboardScreen selectedId={selectedId} onSelect={setSelectedId} />
        <DetailScreen signal={selected} />
      </section>
    </main>
  )
}

function DashboardScreen({ selectedId, onSelect }: { selectedId: string; onSelect: (id: string) => void }) {
  return (
    <section style={{
      minHeight: 'calc(100vh - 92px)',
      background: 'var(--bg-base)',
      border: '1px solid var(--hairline)',
      borderRadius: 14,
      overflow: 'hidden',
    }}>
      <div style={{ padding: 16, borderBottom: '1px solid var(--hairline)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 850, letterSpacing: '-0.02em' }}>AI Picks Now</div>
            <div style={{ color: 'var(--text-2)', fontSize: 12, marginTop: 4 }}>เรียงตามโอกาสประตูใกล้มา ไม่ใช่เรียงตามลีก</div>
          </div>
          <button style={{
            height: 34,
            padding: '0 12px',
            borderRadius: 8,
            border: '1px solid var(--hairline)',
            background: 'var(--bg-elev-1)',
            color: 'var(--text-2)',
            fontSize: 12,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}>
            <Bell size={14} />
            Alert armed
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
          <SummaryMetric label="Goal Soon" value="1" tone="good" />
          <SummaryMetric label="Building" value="1" tone="warn" />
          <SummaryMetric label="Ignored" value="2" tone="muted" />
        </div>
      </div>

      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <QueueBlock title="ควรดูทันที" subtitle="AI คิดว่าประตูใกล้มา">
          {SIGNALS.filter(signal => signal.decision === 'PLAY').map(signal => (
            <DecisionCard key={signal.id} signal={signal} selected={selectedId === signal.id} onSelect={onSelect} />
          ))}
        </QueueBlock>

        <QueueBlock title="กำลังจะเข้าโซน" subtitle="รอ trigger อีกนิด">
          {SIGNALS.filter(signal => signal.decision === 'WATCH').map(signal => (
            <DecisionCard key={signal.id} signal={signal} selected={selectedId === signal.id} onSelect={onSelect} />
          ))}
        </QueueBlock>

        <QueueBlock title="ยังไม่ต้องเสียเวลา" subtitle="AI ลด priority ให้">
          {SIGNALS.filter(signal => signal.decision === 'WAIT' || signal.decision === 'SKIP').map(signal => (
            <DecisionCard key={signal.id} signal={signal} selected={selectedId === signal.id} onSelect={onSelect} compact />
          ))}
        </QueueBlock>
      </div>
    </section>
  )
}

function DetailScreen({ signal }: { signal: MockSignal }) {
  const decision = DECISION_COPY[signal.decision]

  return (
    <section style={{
      minHeight: 'calc(100vh - 92px)',
      background: 'var(--bg-base)',
      border: '1px solid var(--hairline)',
      borderRadius: 14,
      overflow: 'hidden',
    }}>
      <div style={{
        padding: 18,
        borderBottom: '1px solid var(--hairline)',
        background: 'linear-gradient(180deg, rgba(46,212,111,.07), transparent)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <DecisionBadge decision={signal.decision} />
          <span style={{ color: 'var(--text-3)', fontSize: 12 }}>{signal.league}</span>
          <span style={{ marginLeft: 'auto', color: 'var(--green-300)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>{signal.minute}&apos; live</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 14 }}>
          <TeamName name={signal.home} align="left" />
          <div style={{
            minWidth: 96,
            borderRadius: 12,
            border: '1px solid var(--hairline)',
            background: 'var(--bg-elev-1)',
            padding: '10px 14px',
            textAlign: 'center',
          }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 30, fontWeight: 850 }}>{signal.score}</div>
            <div style={{ color: 'var(--text-3)', fontSize: 10, marginTop: 3 }}>CURRENT SCORE</div>
          </div>
          <TeamName name={signal.away} align="right" />
        </div>

        <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: '1fr 120px', gap: 14, alignItems: 'center' }}>
          <div>
            <div style={{ color: decision.tone, fontSize: 22, fontWeight: 900, letterSpacing: '-0.02em' }}>{signal.headline}</div>
            <div style={{ color: 'var(--text-2)', fontSize: 13, marginTop: 6, lineHeight: 1.55 }}>{signal.action}</div>
          </div>
          <ConfidenceMeter value={signal.confidence} tone={decision.tone} />
        </div>
      </div>

      <div style={{ padding: 16, display: 'grid', gap: 12 }}>
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
          <DecisionMetric icon={<Clock3 size={15} />} label="Goal window" value={windowLabel(signal.goalWindow)} />
          <DecisionMetric icon={<TrendingUp size={15} />} label="Pressure side" value={sideLabel(signal.pressureSide)} />
          <DecisionMetric icon={<ShieldCheck size={15} />} label="Market" value={signal.marketLabel} />
          <DecisionMetric icon={<Activity size={15} />} label="Updated" value={signal.lastUpdate} />
        </section>

        <Panel title="AI ตัดสินจากอะไร" meta="evidence">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
            {signal.evidence.map(item => (
              <EvidenceCard key={item.label} item={item} />
            ))}
          </div>
        </Panel>

        <Panel title="แรงกดดันแยกทีม" meta={`${signal.home} / ${signal.away}`}>
          <SplitRow label="Shots on goal" values={signal.split.sog} />
          <SplitRow label="Dangerous attacks" values={signal.split.dangerous} />
          <SplitRow label="Corners" values={signal.split.corners} />
          <div style={{ marginTop: 10 }}>
            <DecisionMetric icon={<Activity size={15} />} label="Tempo" value={`${signal.split.tempo}`} />
          </div>
        </Panel>

        <Panel title="ทำไมต้องตอนนี้" meta="recent 5 min">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {signal.recent.map(item => (
              <div key={`${item.minute}-${item.text}`} style={{
                display: 'grid',
                gridTemplateColumns: '48px 1fr 54px',
                alignItems: 'center',
                gap: 10,
                padding: '9px 10px',
                borderRadius: 10,
                background: 'var(--bg-elev-1)',
                border: '1px solid var(--hairline)',
              }}>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-3)', fontSize: 12 }}>{item.minute}</span>
                <span style={{ color: 'var(--text-2)', fontSize: 12 }}>{item.text}</span>
                <span style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: item.impact > 0 ? 'var(--green-300)' : 'var(--amber)', fontSize: 12 }}>
                  {item.impact > 0 ? '+' : ''}{item.impact}
                </span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="ความเสี่ยงที่ AI เห็น" meta={`${signal.risks.length} risks`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {signal.risks.map(risk => (
              <div key={risk} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, color: 'var(--text-2)', fontSize: 12, lineHeight: 1.5 }}>
                <AlertTriangle size={15} color="var(--amber)" style={{ marginTop: 2, flexShrink: 0 }} />
                <span>{risk}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </section>
  )
}

function QueueBlock({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, margin: '2px 2px 8px' }}>
        <span style={{ color: 'var(--text-1)', fontSize: 13, fontWeight: 800 }}>{title}</span>
        <span style={{ color: 'var(--text-3)', fontSize: 11 }}>{subtitle}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{children}</div>
    </section>
  )
}

function DecisionCard({ signal, selected, onSelect, compact = false }: {
  signal: MockSignal
  selected: boolean
  onSelect: (id: string) => void
  compact?: boolean
}) {
  const decision = DECISION_COPY[signal.decision]

  return (
    <button
      onClick={() => onSelect(signal.id)}
      style={{
        width: '100%',
        textAlign: 'left',
        padding: compact ? 10 : 12,
        borderRadius: 12,
        border: `1px solid ${selected ? decision.border : 'var(--hairline)'}`,
        background: selected ? 'var(--bg-elev-2)' : 'var(--bg-elev-1)',
        color: 'inherit',
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'start' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <DecisionBadge decision={signal.decision} />
            <span style={{ color: 'var(--text-3)', fontSize: 11 }}>{signal.minute}&apos; · {signal.league}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-1)', fontSize: compact ? 13 : 15, fontWeight: 800 }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{signal.home}</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-1)' }}>{signal.score}</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{signal.away}</span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: compact ? 22 : 28, fontWeight: 900, color: decision.tone, lineHeight: 1 }}>
            {signal.confidence}
          </div>
          <div style={{ color: 'var(--text-3)', fontSize: 9, marginTop: 3 }}>CONF</div>
        </div>
      </div>

      {!compact && (
        <>
          <div style={{ marginTop: 10, color: 'var(--text-2)', fontSize: 12, lineHeight: 1.45 }}>{signal.headline}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6, marginTop: 10 }}>
            <MiniStat label="Window" value={windowLabel(signal.goalWindow)} />
            <MiniStat label="SOG" value={`${signal.split.sog[0]}-${signal.split.sog[1]}`} />
            <MiniStat label="Market" value={signal.marketLabel} />
          </div>
        </>
      )}
    </button>
  )
}

function DecisionBadge({ decision }: { decision: Decision }) {
  const item = DECISION_COPY[decision]
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      color: item.tone,
      background: item.bg,
      border: `1px solid ${item.border}`,
      borderRadius: 999,
      padding: '4px 8px',
      fontSize: 11,
      fontWeight: 850,
      whiteSpace: 'nowrap',
    }}>
      {item.icon}
      {item.label}
    </span>
  )
}

function StatusPill({ label, tone }: { label: string; tone: 'good' | 'warn' | 'muted' }) {
  const color = tone === 'good' ? 'var(--green-300)' : tone === 'warn' ? 'var(--amber)' : 'var(--text-3)'
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      height: 28,
      padding: '0 10px',
      borderRadius: 999,
      border: '1px solid var(--hairline)',
      background: 'var(--bg-elev-1)',
      color,
      fontSize: 11,
      fontWeight: 700,
      whiteSpace: 'nowrap',
    }}>{label}</span>
  )
}

function SummaryMetric({ label, value, tone }: { label: string; value: string; tone: 'good' | 'warn' | 'muted' }) {
  const color = tone === 'good' ? 'var(--green-300)' : tone === 'warn' ? 'var(--amber)' : 'var(--text-2)'
  return (
    <div style={{ background: 'var(--bg-elev-1)', border: '1px solid var(--hairline)', borderRadius: 10, padding: '10px 11px' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, lineHeight: 1, fontWeight: 900, color }}>{value}</div>
      <div style={{ marginTop: 5, color: 'var(--text-3)', fontSize: 10 }}>{label}</div>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ minWidth: 0, background: 'var(--bg-elev-2)', borderRadius: 8, padding: '7px 8px' }}>
      <div style={{ color: 'var(--text-1)', fontSize: 11, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
      <div style={{ color: 'var(--text-3)', fontSize: 9, marginTop: 2 }}>{label}</div>
    </div>
  )
}

function TeamName({ name, align }: { name: string; align: 'left' | 'right' }) {
  return (
    <div style={{ minWidth: 0, textAlign: align }}>
      <div style={{ color: 'var(--text-1)', fontSize: 18, fontWeight: 850, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
      <div style={{ color: 'var(--text-3)', fontSize: 11, marginTop: 4 }}>{align === 'left' ? 'Home' : 'Away'}</div>
    </div>
  )
}

function ConfidenceMeter({ value, tone }: { value: number; tone: string }) {
  return (
    <div style={{
      borderRadius: 12,
      border: '1px solid var(--hairline)',
      background: 'var(--bg-elev-1)',
      padding: 12,
      textAlign: 'center',
    }}>
      <div style={{ fontFamily: 'var(--font-mono)', color: tone, fontSize: 34, fontWeight: 950, lineHeight: 1 }}>{value}</div>
      <div style={{ color: 'var(--text-3)', fontSize: 10, marginTop: 4 }}>CONFIDENCE</div>
      <div style={{ height: 6, borderRadius: 999, background: 'var(--bg-elev-3)', overflow: 'hidden', marginTop: 10 }}>
        <div style={{ width: `${value}%`, height: '100%', background: tone, borderRadius: 999 }} />
      </div>
    </div>
  )
}

function DecisionMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ minWidth: 0, background: 'var(--bg-elev-1)', border: '1px solid var(--hairline)', borderRadius: 10, padding: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-3)', fontSize: 10, marginBottom: 6 }}>
        {icon}
        {label}
      </div>
      <div style={{ color: 'var(--text-1)', fontSize: 13, fontWeight: 850, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
    </div>
  )
}

function Panel({ title, meta, children }: { title: string; meta: string; children: React.ReactNode }) {
  return (
    <section style={{ background: 'var(--bg-elev-1)', border: '1px solid var(--hairline)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '11px 13px', borderBottom: '1px solid var(--hairline)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ color: 'var(--text-1)', fontSize: 13, fontWeight: 850 }}>{title}</span>
        <span style={{ color: 'var(--text-3)', fontSize: 11 }}>{meta}</span>
      </div>
      <div style={{ padding: 13 }}>{children}</div>
    </section>
  )
}

function EvidenceCard({ item }: { item: MockSignal['evidence'][number] }) {
  const color = item.tone === 'good' ? 'var(--green-300)' : item.tone === 'warn' ? 'var(--amber)' : 'var(--text-2)'
  const icon = item.tone === 'good' ? <CheckCircle2 size={15} /> : item.tone === 'warn' ? <AlertTriangle size={15} /> : <Activity size={15} />

  return (
    <div style={{ background: 'var(--bg-elev-2)', border: '1px solid var(--hairline)', borderRadius: 10, padding: 11 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color, marginBottom: 7 }}>
        {icon}
        <span style={{ fontSize: 11, fontWeight: 800 }}>{item.label}</span>
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-1)', fontSize: 20, fontWeight: 900, lineHeight: 1 }}>{item.value}</div>
      <div style={{ color: 'var(--text-2)', fontSize: 11, lineHeight: 1.45, marginTop: 6 }}>{item.note}</div>
    </div>
  )
}

function SplitRow({ label, values }: { label: string; values: [number, number] }) {
  const total = Math.max(values[0] + values[1], 1)
  const homePct = Math.round((values[0] / total) * 100)
  const awayPct = 100 - homePct

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '52px 1fr 52px', gap: 10, alignItems: 'center', marginBottom: 10 }}>
      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-1)', fontWeight: 850, fontSize: 13 }}>{values[0]}</span>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, gap: 8 }}>
          <span style={{ color: 'var(--text-2)', fontSize: 11 }}>{label}</span>
          <span style={{ color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: 10 }}>{homePct}:{awayPct}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: `${homePct}fr ${awayPct}fr`, gap: 3, height: 7, background: 'var(--bg-elev-3)', borderRadius: 999, overflow: 'hidden' }}>
          <div style={{ background: 'var(--green-400)' }} />
          <div style={{ background: 'var(--amber)' }} />
        </div>
      </div>
      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-1)', fontWeight: 850, fontSize: 13, textAlign: 'right' }}>{values[1]}</span>
    </div>
  )
}

function windowLabel(window: GoalWindow) {
  if (window === 'NOW_5') return '0-5 min'
  if (window === 'NEXT_10') return '5-10 min'
  return 'Wait'
}

function sideLabel(side: PressureSide) {
  if (side === 'HOME') return 'Home pressure'
  if (side === 'AWAY') return 'Away pressure'
  return 'Balanced'
}
