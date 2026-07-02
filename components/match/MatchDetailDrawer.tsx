'use client'

import { useEffect, useMemo, useState } from 'react'
import { calcLiveScore, signalAccent } from '@/lib/scoring'
import type { LiveMatch, ScoreBreakdown, Signal, TeamLiveStats } from '@/types'

interface Props {
  match: LiveMatch | null
  onClose: () => void
}

interface DecisionSummary {
  label: string
  title: string
  body: string
  tone: 'hot' | 'watch' | 'wait'
}

interface MetricCard {
  label: string
  value: string
  hint: string
  tone: 'strong' | 'neutral' | 'risk'
}

function TeamCrest({ name, size = 40 }: { name: string; size?: number }) {
  const short = name.slice(0, 3).toUpperCase()
  const colors: Record<string, string> = {
    MAN: '#6CABDD', ARS: '#EF0107', BAY: '#DC052D', BVB: '#FDE100',
    RMA: '#FEBE10', ATL: '#CB3524', CHE: '#034694', LIV: '#C8102E',
    PSG: '#004170', MCI: '#6CABDD', LEV: '#E32221', MON: '#E30613',
  }
  const bg = colors[short] ?? '#1c3329'

  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: bg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      fontSize: Math.round(size * 0.3),
      fontWeight: 700,
      letterSpacing: '-0.02em',
      flexShrink: 0,
      boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.2)',
    }}>
      {short}
    </div>
  )
}

function SignalChip({ signal }: { signal: Signal }) {
  const map: Record<Signal, { label: string; icon: string; cls: string }> = {
    HOT: { label: 'HOT', icon: '🔥', cls: 'green' },
    WATCH: { label: 'WATCH', icon: '👁', cls: 'amber' },
    WAIT: { label: 'WAIT', icon: '⏳', cls: 'orange' },
  }
  const tag = map[signal]
  return <span className={`chip ${tag.cls}`}>{tag.icon} {tag.label}</span>
}

export function MatchDetailDrawer({ match: m, onClose }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(Boolean(m)), 0)
    return () => clearTimeout(timer)
  }, [m])

  const model = useMemo(() => {
    if (!m) return null
    const { breakdown } = calcLiveScore(m.stats, m.overMarket?.odds ?? 1.85, m.minute, m.scoreHome, m.scoreAway)
    return buildDecisionModel(m, breakdown)
  }, [m])

  if (!m || !model) return null

  const accentColor = signalAccent(m.signal)
  const totalGoals = m.scoreHome + m.scoreAway
  const timeLeft = Math.max(0, 90 - m.minute)
  const teamStats = resolvedTeamStats(m)

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,.6)',
          zIndex: 40,
          opacity: visible ? 1 : 0,
          transition: 'opacity .2s',
          pointerEvents: visible ? 'auto' : 'none',
        }}
      />

      <div style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: 'min(560px, 100vw)',
        background: 'var(--bg-deep)',
        borderLeft: '1px solid var(--hairline)',
        zIndex: 50,
        transform: visible ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform .28s cubic-bezier(.4,0,.2,1)',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{
          background: 'var(--bg-base)',
          borderBottom: '1px solid var(--hairline)',
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          position: 'sticky',
          top: 0,
          zIndex: 10,
          flexShrink: 0,
        }}>
          <button onClick={onClose} style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            flexShrink: 0,
            background: 'var(--bg-elev-1)',
            border: '1px solid var(--hairline)',
            color: 'var(--text-2)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
          }}>✕</button>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>Live Decision</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{m.leagueFlag} {m.league}</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--green-400)' }}>
            <span className="dot live" />
            {m.minute}&apos; · {timeLeft}m left
          </div>
        </div>

        <div style={{ padding: '14px 16px 20px', display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
          <section style={{
            position: 'relative',
            background: 'var(--bg-elev-1)',
            border: `1px solid ${m.signal === 'HOT' ? 'rgba(46,212,111,.36)' : 'var(--hairline)'}`,
            borderRadius: 14,
            overflow: 'hidden',
          }}>
            {m.signal === 'HOT' && <div className="accent-line" />}
            <div style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <SignalChip signal={m.signal} />
                <span style={{ fontSize: 12, color: 'var(--text-2)' }}>
                  {model.summary.label}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <TeamBlock name={m.homeTeam} label="เหย้า" align="left" />
                <div style={{
                  background: 'var(--bg-elev-2)',
                  border: '1px solid var(--hairline)',
                  borderRadius: 12,
                  padding: '10px 16px',
                  textAlign: 'center',
                  minWidth: 92,
                }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 30, fontWeight: 700, color: 'var(--text-1)', lineHeight: 1 }}>
                    {m.scoreHome}<span style={{ color: 'var(--text-3)', margin: '0 4px' }}>:</span>{m.scoreAway}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 4 }}>{totalGoals} goals</div>
                </div>
                <TeamBlock name={m.awayTeam} label="เยือน" align="right" />
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '72px 1fr auto',
                alignItems: 'center',
                gap: 10,
              }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 30, fontWeight: 800, color: accentColor, lineHeight: 1 }}>{m.aiScore}</div>
                  <div style={{ fontSize: 9, color: 'var(--text-3)', letterSpacing: '0.06em', marginTop: 3 }}>AI SCORE</div>
                </div>
                <div style={{ height: 7, borderRadius: 999, background: 'var(--bg-elev-3)', overflow: 'hidden' }}>
                  <div className="aiscore-fill" style={{ width: `${m.aiScore}%` }} />
                </div>
                <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--text-2)' }}>
                  updated<br />{formatClock(m.lastUpdated)}
                </div>
              </div>
            </div>
          </section>

          <section style={{
            background: summaryBackground(model.summary.tone),
            border: `1px solid ${summaryBorder(model.summary.tone)}`,
            borderRadius: 14,
            padding: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                display: 'grid',
                placeItems: 'center',
                background: 'rgba(255,255,255,.06)',
                color: accentColor,
                fontFamily: 'var(--font-mono)',
                fontSize: 18,
                fontWeight: 800,
                flexShrink: 0,
              }}>{model.actionIcon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-1)', marginBottom: 5 }}>{model.summary.title}</div>
                <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>{model.summary.body}</div>
              </div>
            </div>
          </section>

          <MarketSnapshot match={m} />

          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
            {model.metrics.map(metric => (
              <MetricTile key={metric.label} metric={metric} />
            ))}
          </section>

          <Section title="แรงกดดันแยกทีม" meta={`${m.homeTeam} / ${m.awayTeam}`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <TeamStatRow label="Shots on Goal" home={teamStats.home.shotsOnGoal} away={teamStats.away.shotsOnGoal} />
              <TeamStatRow label="Total Shots" home={teamStats.home.totalShots} away={teamStats.away.totalShots} />
              <TeamStatRow label="Dangerous Attacks" home={teamStats.home.dangerousAttacks} away={teamStats.away.dangerousAttacks} />
              <TeamStatRow label="Corners" home={teamStats.home.corners} away={teamStats.away.corners} />
              <TeamStatRow label="Possession" home={teamStats.home.possession} away={teamStats.away.possession} suffix="%" />
            </div>
          </Section>

          <Section title="เหตุผลหลักของคะแนน" meta={`${m.aiScore}/100`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {model.keyDrivers.map(driver => (
                <DriverRow key={driver.factor} driver={driver} accentColor={accentColor} />
              ))}
            </div>
          </Section>

          <Section title="จุดที่ต้องระวัง" meta={`${model.risks.length} risks`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {model.risks.map(risk => (
                <div key={risk} style={{
                  display: 'flex',
                  gap: 8,
                  padding: '9px 10px',
                  borderRadius: 10,
                  background: 'var(--bg-elev-2)',
                  border: '1px solid var(--hairline)',
                  color: 'var(--text-2)',
                  fontSize: 12,
                  lineHeight: 1.5,
                }}>
                  <span style={{ color: 'var(--amber)', flexShrink: 0 }}>!</span>
                  <span>{risk}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section title="แผนที่เหมาะกับจังหวะนี้" meta="model lean">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
              {model.marketLeans.map(lean => (
                <div key={lean.name} style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  gap: 10,
                  padding: '11px 12px',
                  borderRadius: 10,
                  background: lean.recommended ? 'var(--green-soft)' : 'var(--bg-elev-2)',
                  border: `1px solid ${lean.recommended ? 'rgba(46,212,111,.28)' : 'var(--hairline)'}`,
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>{lean.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-2)', lineHeight: 1.5, marginTop: 3 }}>{lean.reason}</div>
                  </div>
                  <div style={{
                    alignSelf: 'center',
                    fontSize: 11,
                    fontWeight: 700,
                    color: lean.recommended ? 'var(--green-300)' : 'var(--text-3)',
                    border: `1px solid ${lean.recommended ? 'rgba(46,212,111,.28)' : 'var(--hairline)'}`,
                    borderRadius: 999,
                    padding: '4px 8px',
                    whiteSpace: 'nowrap',
                  }}>{lean.label}</div>
                </div>
              ))}
            </div>
            <p style={{ margin: '10px 0 0', fontSize: 11, color: 'var(--text-3)', lineHeight: 1.5 }}>
              ราคา Over มาจาก LSports feed ล่าสุด ส่วน Next Goal และ BTTS ยังเป็น model lean จากสถิติสด
            </p>
          </Section>

          <section style={{
            background: 'var(--bg-elev-1)',
            border: `1px solid ${m.bookmarked ? 'rgba(46,212,111,.25)' : 'var(--hairline)'}`,
            borderRadius: 12,
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: m.bookmarked ? 'var(--green-soft)' : 'var(--bg-elev-2)',
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
            }}>{m.bookmarked ? '🔔' : '🔕'}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>
                {m.bookmarked ? 'เปิด alert สำหรับคู่นี้แล้ว' : 'ยังไม่ได้เปิด alert'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-2)', lineHeight: 1.5, marginTop: 2 }}>
                {m.bookmarked
                  ? 'ระบบจะส่งแจ้งเตือนเมื่อมี goal, pressure spike หรือ AI Score ถึงเกณฑ์'
                  : 'กด bookmark บนการ์ดหลักเพื่อให้ระบบติดตามคู่นี้แบบ realtime'}
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  )
}

function TeamBlock({ name, label, align }: { name: string; label: string; align: 'left' | 'right' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: align === 'left' ? 'flex-start' : 'flex-end', gap: 6, minWidth: 0 }}>
      <TeamCrest name={name} size={40} />
      <span style={{
        fontSize: 15,
        fontWeight: 700,
        color: 'var(--text-1)',
        letterSpacing: '-0.01em',
        textAlign: align,
        maxWidth: '100%',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>{name}</span>
      <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{label}</span>
    </div>
  )
}

function Section({ title, meta, children }: { title: string; meta?: string; children: React.ReactNode }) {
  return (
    <section style={{ background: 'var(--bg-elev-1)', border: '1px solid var(--hairline)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '11px 14px', borderBottom: '1px solid var(--hairline)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>{title}</span>
        {meta && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-3)' }}>{meta}</span>}
      </div>
      <div style={{ padding: 14 }}>{children}</div>
    </section>
  )
}

function MetricTile({ metric }: { metric: MetricCard }) {
  const toneColor = metric.tone === 'strong'
    ? 'var(--green-400)'
    : metric.tone === 'risk'
      ? 'var(--amber)'
      : 'var(--text-1)'

  return (
    <div style={{ background: 'var(--bg-elev-1)', border: '1px solid var(--hairline)', borderRadius: 12, padding: '11px 12px' }}>
      <div style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 5 }}>{metric.label}</div>
      <div style={{ fontFamily: 'var(--font-mono)', color: toneColor, fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{metric.value}</div>
      <div style={{ color: 'var(--text-2)', fontSize: 11, lineHeight: 1.45, marginTop: 6 }}>{metric.hint}</div>
    </div>
  )
}

function MarketSnapshot({ match }: { match: LiveMatch }) {
  const market = match.overMarket

  return (
    <section style={{
      background: market ? 'rgba(46,212,111,.08)' : 'var(--bg-elev-1)',
      border: `1px solid ${market ? 'rgba(46,212,111,.24)' : 'var(--hairline)'}`,
      borderRadius: 12,
      padding: '12px 14px',
      display: 'grid',
      gridTemplateColumns: '1fr auto',
      gap: 12,
      alignItems: 'center',
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>Over market ล่าสุด</div>
        <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-1)' }}>
          {market ? `Over ${market.line}` : 'ยังไม่มีราคา Over'}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-2)', lineHeight: 1.5, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {market
            ? `${market.marketName || 'Total Goals'} · updated ${formatClock(market.updatedAt ?? match.lastUpdated)}`
            : 'ระบบยังใช้ AI score และ stats สดเป็นหลักจนกว่า feed จะส่งราคาเข้ามา'}
        </div>
      </div>
      <div style={{
        minWidth: 82,
        borderRadius: 10,
        border: `1px solid ${market ? 'rgba(46,212,111,.3)' : 'var(--hairline)'}`,
        background: market ? 'var(--green-soft)' : 'var(--bg-elev-2)',
        padding: '9px 10px',
        textAlign: 'center',
      }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 800, color: market ? 'var(--green-300)' : 'var(--text-3)', lineHeight: 1 }}>
          {market ? market.odds.toFixed(2) : 'N/A'}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 4 }}>ODDS</div>
      </div>
    </section>
  )
}

function TeamStatRow({ label, home, away, suffix = '' }: { label: string; home: number; away: number; suffix?: string }) {
  const total = Math.max(home + away, 1)
  const homePct = Math.round((home / total) * 100)
  const awayPct = 100 - homePct

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '58px 1fr 58px', gap: 10, alignItems: 'center' }}>
      <div style={{ textAlign: 'left' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 800, color: 'var(--text-1)' }}>{home}{suffix}</div>
      </div>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 5 }}>
          <span style={{ fontSize: 11, color: 'var(--text-2)' }}>{label}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-3)' }}>{homePct}:{awayPct}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: `${homePct}fr ${awayPct}fr`, gap: 3, height: 7, borderRadius: 999, overflow: 'hidden', background: 'var(--bg-elev-3)' }}>
          <div style={{ minWidth: home > 0 ? 3 : 0, background: 'var(--green-400)' }} />
          <div style={{ minWidth: away > 0 ? 3 : 0, background: 'var(--amber)' }} />
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 800, color: 'var(--text-1)' }}>{away}{suffix}</div>
      </div>
    </div>
  )
}

function DriverRow({ driver, accentColor }: { driver: ScoreBreakdown; accentColor: string }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr 42px', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{driver.factor}</span>
      <div style={{ height: 6, borderRadius: 999, background: 'var(--bg-elev-3)', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: '100%',
          background: accentColor,
          borderRadius: 999,
          transform: `scaleX(${driver.pct / 100})`,
          transformOrigin: 'left center',
          transition: 'transform .25s ease-out',
        }} />
      </div>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: 'var(--text-1)', textAlign: 'right' }}>
        {driver.points}
      </span>
    </div>
  )
}

function buildDecisionModel(match: LiveMatch, breakdown: ScoreBreakdown[]) {
  const totalGoals = match.scoreHome + match.scoreAway
  const timeLeft = Math.max(0, 90 - match.minute)
  const needForOver25 = Math.max(0, 3 - totalGoals)
  const topDrivers = [...breakdown].sort((a, b) => b.points - a.points).slice(0, 3)
  const pressure = pressureLabel(match)
  const summary = decisionSummary(match, needForOver25, timeLeft)
  const risks = riskList(match, needForOver25, timeLeft)
  const overMetric = match.overMarket

  return {
    summary,
    actionIcon: actionIcon(summary),
    keyDrivers: topDrivers,
    risks,
    metrics: [
      {
        label: 'Pressure',
        value: pressure.value,
        hint: pressure.hint,
        tone: pressure.tone,
      },
      {
        label: overMetric ? `O${overMetric.line}` : 'Over',
        value: overMetric ? overMetric.odds.toFixed(2) : 'N/A',
        hint: overMetric ? 'ราคา Over ล่าสุดจาก feed' : 'ยังไม่มีราคา Over ใน feed',
        tone: overMetric ? (overMetric.odds >= 1.65 ? 'strong' : 'neutral') : 'risk',
      },
      {
        label: 'Goal Need',
        value: needForOver25 === 0 ? 'Done' : `${needForOver25}`,
        hint: needForOver25 === 0 ? 'Over 2.5 เข้าแล้ว' : `ต้องการอีก ${needForOver25} ประตู`,
        tone: needForOver25 <= 1 ? 'strong' : 'risk',
      },
      {
        label: 'Tempo',
        value: String(match.stats.tempo),
        hint: match.stats.tempo >= 140 ? 'เกมเปิดและเร็ว' : 'จังหวะเกมยังไม่เร่ง',
        tone: match.stats.tempo >= 140 ? 'strong' : 'neutral',
      },
    ] satisfies MetricCard[],
    marketLeans: marketLeans(match, needForOver25, timeLeft),
  }
}

function decisionSummary(match: LiveMatch, needGoals: number, timeLeft: number): DecisionSummary {
  const marketText = marketSentence(match)

  if (timeLeft === 0) {
    return {
      label: needGoals === 0 ? 'Confirmed' : 'Too late',
      title: needGoals === 0 ? 'สัญญาณนี้เป็น confirmation ไม่ใช่ entry ใหม่' : 'เวลาหมดแล้ว ไม่ควรไล่ราคา',
      body: needGoals === 0
        ? `ประตูรวมถึงเป้าหมายแล้ว AI Score ${match.aiScore} ใช้ยืนยันว่าระบบอ่านเกมถูกทาง แต่ไม่ควรใช้เป็นจุดเข้าใหม่`
        : `เหลือเวลา 0 นาทีและยังต้องการอีก ${needGoals} ประตู สัญญาณนี้ควรถูกเก็บเป็นข้อมูลย้อนหลังมากกว่าใช้ตัดสินใจสด`,
      tone: needGoals === 0 ? 'watch' : 'wait',
    }
  }

  if (match.signal === 'HOT') {
    return {
      label: 'Actionable',
      title: needGoals <= 1 ? 'จังหวะนี้ควรถูกจับตาทันที' : 'สัญญาณแรง แต่ยังต้องการประตูหลายลูก',
      body: `AI Score ${match.aiScore} มาจากแรงกดดันและโอกาสยิงที่สูง เหลือเวลาประมาณ ${timeLeft} นาที ${marketText}`,
      tone: 'hot',
    }
  }

  if (match.signal === 'WATCH') {
    return {
      label: 'Watchlist',
      title: 'ยังไม่ใช่จังหวะเข้า แต่ควรเฝ้าดู',
      body: `เกมเริ่มมีแรงกดดัน แต่ AI Score ${match.aiScore} ยังไม่ถึงโซน HOT รอ pressure spike, corner ต่อเนื่อง หรือราคาขยับก่อน ${marketText}`,
      tone: 'watch',
    }
  }

  return {
    label: 'No entry',
    title: 'ยังไม่ควรให้ความสำคัญสูง',
    body: `ข้อมูลสดยังไม่สนับสนุนจังหวะเข้าเล่นชัดเจน เก็บไว้ดูต่อได้ แต่ไม่ควรแย่ง attention จากคู่ HOT`,
    tone: 'wait',
  }
}

function actionIcon(summary: DecisionSummary) {
  if (summary.label === 'Confirmed') return 'OK'
  if (summary.label === 'Too late') return 'END'
  if (summary.tone === 'hot') return 'GO'
  if (summary.tone === 'watch') return 'EYE'
  return 'NO'
}

function pressureLabel(match: LiveMatch): MetricCard {
  const score = Math.round((match.stats.shotsOnGoal * 3) + (match.stats.dangerousAttacks * 0.45) + (match.stats.corners * 2))
  if (score >= 90) return { label: 'Pressure', value: 'High', hint: 'ยิงและบุกอันตรายถี่', tone: 'strong' }
  if (score >= 60) return { label: 'Pressure', value: 'Mid', hint: 'มีแรงกดดันแต่ยังไม่สุด', tone: 'neutral' }
  return { label: 'Pressure', value: 'Low', hint: 'ยังไม่เห็นแรงกดชัด', tone: 'risk' }
}

function riskList(match: LiveMatch, needGoals: number, timeLeft: number) {
  const risks: string[] = []

  if (timeLeft <= 10 && needGoals > 0) risks.push('เวลาเหลือน้อย ต้องการประตูเร็ว ความเสี่ยงเรื่องราคาไหลสูง')
  if (needGoals >= 2) risks.push('ยังต้องการอย่างน้อย 2 ประตูสำหรับ Over 2.5 แม้ pressure จะดี')
  if (match.stats.xg < 1.2 && match.stats.shotsOnGoal < 6) risks.push('xG และ shots on goal ยังไม่ยืนยันคุณภาพโอกาส')
  if (match.stats.dangerousAttacks < 45) risks.push('Dangerous attacks ต่ำ เกมอาจไม่ได้กดดันจริง')
  if (match.minute < 25) risks.push('เกมยังเร็วเกินไป สัญญาณอาจแกว่งจาก sample size น้อย')
  if (!match.overMarket) risks.push('ยังไม่มีราคา Over ล่าสุดจาก feed ต้องระวังการตัดสินใจจาก stats อย่างเดียว')
  if (match.overMarket && match.overMarket.odds < 1.45) risks.push('ราคา Over ต่ำมากแล้ว value อาจไม่คุ้มแม้สัญญาณเกมดี')

  if (risks.length === 0) {
    risks.push('ไม่มี risk ใหญ่จาก stats สด แต่ยังต้องเทียบราคาตลาดจริงก่อนเข้า')
  }

  return risks
}

function marketLeans(match: LiveMatch, needGoals: number, timeLeft: number) {
  const pressureGood = match.stats.shotsOnGoal >= 8 || match.stats.dangerousAttacks >= 75
  const bttsOpen = match.scoreHome === 0 || match.scoreAway === 0
  const over = match.overMarket

  return [
    {
      name: over ? `Over ${over.line}` : 'Over market',
      label: over ? `@ ${over.odds.toFixed(2)}` : 'No price',
      recommended: Boolean(over && pressureGood && needGoals <= 1),
      reason: needGoals === 0
        ? 'ประตูรวมถึงโซน Over แล้ว ใช้เป็น confirmation ไม่ใช่ entry ใหม่'
        : over
          ? `ราคา feed ล่าสุดที่ ${over.odds.toFixed(2)}, pressure ${pressureGood ? 'สนับสนุน' : 'ยังไม่พอ'} และเหลือ ${timeLeft} นาที`
          : `ยังไม่มีราคา feed, pressure ${pressureGood ? 'สนับสนุน' : 'ยังไม่พอ'} และเหลือ ${timeLeft} นาที`,
    },
    {
      name: 'Next Goal',
      label: match.signal === 'HOT' ? 'Active' : 'Wait',
      recommended: match.signal === 'HOT',
      reason: match.signal === 'HOT'
        ? 'เหมาะกับการดูตลาด goal ถัดไป เพราะแรงกดดันกำลังชัด'
        : 'รอให้ AI Score หรือ pressure ขยับก่อน',
    },
    {
      name: 'BTTS',
      label: bttsOpen ? 'Conditional' : 'Done',
      recommended: false,
      reason: bttsOpen
        ? 'ต้องดูว่าทีมที่ยังไม่ยิงมี momentum หรือไม่ ไม่ควรตัดสินจาก score อย่างเดียว'
        : 'ทั้งสองทีมยิงแล้ว จบเงื่อนไข BTTS',
    },
  ]
}

function marketSentence(match: LiveMatch) {
  if (!match.overMarket) return 'ยังไม่มีราคา Over ล่าสุดจาก feed ให้เทียบ value'
  return `ราคา Over ล่าสุดคือ O${match.overMarket.line} @ ${match.overMarket.odds.toFixed(2)}`
}

function resolvedTeamStats(match: LiveMatch): { home: TeamLiveStats; away: TeamLiveStats } {
  if (match.statsByTeam) return match.statsByTeam

  const split = (total: number) => {
    const home = Math.round(total * (match.stats.possessionHome || 50) / 100)
    return { home, away: Math.max(0, total - home) }
  }

  const shotsOnGoal = split(match.stats.shotsOnGoal)
  const totalShots = split(match.stats.totalShots)
  const dangerousAttacks = split(match.stats.dangerousAttacks)
  const attacks = split(match.stats.tempo)
  const corners = split(match.stats.corners)

  return {
    home: {
      shotsOnGoal: shotsOnGoal.home,
      totalShots: totalShots.home,
      dangerousAttacks: dangerousAttacks.home,
      attacks: attacks.home,
      corners: corners.home,
      possession: match.stats.possessionHome,
    },
    away: {
      shotsOnGoal: shotsOnGoal.away,
      totalShots: totalShots.away,
      dangerousAttacks: dangerousAttacks.away,
      attacks: attacks.away,
      corners: corners.away,
      possession: match.stats.possessionAway,
    },
  }
}

function summaryBackground(tone: DecisionSummary['tone']) {
  if (tone === 'hot') return 'linear-gradient(135deg, rgba(46,212,111,.14), rgba(46,212,111,.04))'
  if (tone === 'watch') return 'linear-gradient(135deg, rgba(245,165,36,.13), rgba(245,165,36,.04))'
  return 'var(--bg-elev-1)'
}

function summaryBorder(tone: DecisionSummary['tone']) {
  if (tone === 'hot') return 'rgba(46,212,111,.32)'
  if (tone === 'watch') return 'rgba(245,165,36,.28)'
  return 'var(--hairline)'
}

function formatClock(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--:--'
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}
