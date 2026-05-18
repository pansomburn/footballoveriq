'use client'
import { useEffect, useState } from 'react'
import { signalAccent, calcLiveScore } from '@/lib/scoring'
import type { LiveMatch } from '@/types'

interface Props {
  match:   LiveMatch | null
  onClose: () => void
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
      width: size, height: size, borderRadius: '50%', background: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontSize: Math.round(size * 0.3), fontWeight: 700,
      letterSpacing: '-0.02em', flexShrink: 0,
      boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.2)',
    }}>
      {short}
    </div>
  )
}

export function MatchDetailDrawer({ match: m, onClose }: Props) {
  const [visible,    setVisible]    = useState(false)
  const [notifOn,    setNotifOn]    = useState(true)
  const [insightTxt, setInsightTxt] = useState('')

  useEffect(() => {
    if (m) { setVisible(true); typeInsight(m.insight) }
    else setVisible(false)
  }, [m])

  function typeInsight(text: string) {
    setInsightTxt('')
    let i = 0
    const t = setInterval(() => {
      setInsightTxt(text.slice(0, ++i))
      if (i >= text.length) clearInterval(t)
    }, 18)
    return () => clearInterval(t)
  }

  if (!m) return null

  const { breakdown } = calcLiveScore(m.stats, 1.85, m.minute, m.scoreHome, m.scoreAway)
  const accentColor = signalAccent(m.signal)

  const signal = m.signal
  const tagMap: Record<string, { label: string; icon: string; cls: string }> = {
    HOT:   { label: 'HOT',   icon: '🔥', cls: 'green' },
    WATCH: { label: 'WATCH', icon: '👁',  cls: 'amber' },
    WAIT:  { label: 'WAIT',  icon: '⏳', cls: 'orange' },
    SKIP:  { label: 'SKIP',  icon: '—',  cls: '' },
  }
  const tag = tagMap[signal] ?? tagMap.SKIP

  const vsStats = [
    { label: 'Possession',       home: m.stats.possessionHome ?? 55, away: m.stats.possessionAway ?? 45, unit: '%' },
    { label: 'Shots on Goal',    home: m.stats.shotsOnGoal,          away: Math.max(1, m.stats.shotsOnGoal - 3), unit: '' },
    { label: 'Dangerous Attacks',home: Math.round(m.stats.dangerousAttacks * 0.62), away: Math.round(m.stats.dangerousAttacks * 0.38), unit: '' },
  ]

  const markets = [
    { key: 'over25', name: 'Over 2.5', desc: 'ต้องการอีก 1 ประตู',  odds: 1.72, recommended: true },
    { key: 'btts',   name: 'BTTS',     desc: 'ทั้งสองทีมยิงได้แล้ว', odds: 1.65, recommended: false },
    { key: 'over35', name: 'Over 3.5', desc: 'ความเสี่ยงสูงกว่า',   odds: 3.10, recommended: false },
  ]

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,.6)',
          zIndex: 40,
          opacity: visible ? 1 : 0,
          transition: 'opacity .25s',
          pointerEvents: visible ? 'auto' : 'none',
        }}
      />

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 'min(520px, 100vw)',
        background: 'var(--bg-deep)',
        borderLeft: '1px solid var(--hairline)',
        zIndex: 50,
        transform: visible ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform .3s cubic-bezier(.4,0,.2,1)',
        overflowY: 'auto',
        display: 'flex', flexDirection: 'column',
      }}>

        {/* Header */}
        <div style={{
          background: 'var(--bg-base)',
          borderBottom: '1px solid var(--hairline)',
          padding: '14px 18px',
          display: 'flex', alignItems: 'center', gap: 12,
          position: 'sticky', top: 0, zIndex: 10,
          flexShrink: 0,
        }}>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: 'var(--bg-elev-1)', border: '1px solid var(--hairline)',
            color: 'var(--text-2)', cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontSize: 14,
          }}>✕</button>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>Match Detail</span>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--green-400)' }}>
            <span className="dot live" />
            Live · {m.minute}'
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>

          {/* Hero card */}
          <div style={{
            position: 'relative',
            background: 'var(--bg-elev-1)',
            border: `1px solid ${signal === 'HOT' ? 'rgba(46,212,111,.35)' : 'var(--hairline)'}`,
            borderRadius: 14, overflow: 'hidden',
          }}>
            {signal === 'HOT' && <div className="accent-line" />}
            <div style={{ padding: '14px 16px' }}>
              {/* Tag + league */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <span className={`chip ${tag.cls}`}>{tag.icon} {tag.label}</span>
                <span style={{ fontSize: 11, color: 'var(--text-2)' }}>
                  <span className="dot live" style={{ marginRight: 5 }} />
                  {m.minute}' 2H · {m.leagueFlag} {m.league}
                </span>
              </div>

              {/* Teams + score */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
                  <TeamCrest name={m.homeTeam} size={40} />
                  <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)', letterSpacing: '-0.01em' }}>{m.homeTeam}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-3)' }}>เหย้า</span>
                </div>
                <div style={{
                  background: 'var(--bg-elev-2)', border: '1px solid var(--hairline)',
                  borderRadius: 12, padding: '10px 16px', textAlign: 'center', minWidth: 90,
                }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 30, fontWeight: 700, color: 'var(--text-1)', lineHeight: 1 }}>
                    {m.scoreHome}<span style={{ color: 'var(--text-3)', margin: '0 4px' }}>:</span>{m.scoreAway}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 4 }}>นาที {m.minute}'</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                  <TeamCrest name={m.awayTeam} size={40} />
                  <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)', letterSpacing: '-0.01em' }}>{m.awayTeam}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-3)' }}>เยือน</span>
                </div>
              </div>

              {/* AI Score bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.06em', textTransform: 'uppercase', flexShrink: 0 }}>AI SCORE</span>
                <div style={{ flex: 1, height: 6, borderRadius: 999, background: 'var(--bg-elev-3)', overflow: 'hidden' }}>
                  <div className="aiscore-fill" style={{ width: `${m.aiScore}%` }} />
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700, color: accentColor, minWidth: 36, textAlign: 'right' }}>
                  {m.aiScore}
                </span>
              </div>
            </div>
          </div>

          {/* Notification toggle */}
          <div style={{
            background: 'var(--bg-elev-1)',
            border: '1px solid rgba(46,212,111,.2)',
            borderRadius: 12, padding: '12px 16px',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{ width: 38, height: 38, background: 'var(--green-soft)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🔔</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>แจ้งเตือนคู่นี้</div>
              <div style={{ fontSize: 11, color: 'var(--text-2)' }}>Push เมื่อ AI Score พุ่ง หรือมีสัญญาณพิเศษ</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{notifOn ? 'เปิดอยู่' : 'ปิดอยู่'}</span>
              <button onClick={() => setNotifOn(v => !v)} style={{
                width: 44, height: 24, borderRadius: 999, border: 'none', cursor: 'pointer',
                background: notifOn ? 'var(--green-500)' : 'var(--bg-elev-3)',
                position: 'relative', transition: 'background .2s', flexShrink: 0,
              }}>
                <span style={{
                  position: 'absolute', top: 3,
                  left: notifOn ? 'calc(100% - 21px)' : 3,
                  width: 18, height: 18, borderRadius: '50%', background: '#fff',
                  transition: 'left .2s',
                }} />
              </button>
            </div>
          </div>

          {/* Live Stats */}
          <div style={{ background: 'var(--bg-elev-1)', border: '1px solid var(--hairline)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--hairline)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>📊 Live Statistics</span>
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>รวมทั้งสองทีม</span>
            </div>
            <div style={{ padding: '14px 16px' }}>
              {/* Stats grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
                {[
                  { val: m.stats.shotsOnGoal,           lbl: 'SHOTS ON GOAL', col: 'var(--green-400)' },
                  { val: m.stats.totalShots,             lbl: 'TOTAL SHOTS',   col: 'var(--text-1)' },
                  { val: m.stats.dangerousAttacks,       lbl: 'DANGER ATK',    col: 'var(--amber)' },
                  { val: m.stats.tempo,                  lbl: 'TEMPO',         col: 'var(--text-1)' },
                  { val: m.stats.corners,                lbl: 'CORNERS',       col: 'var(--text-1)' },
                  { val: (m.stats.xg ?? 0).toFixed(2), lbl: 'XG',            col: 'var(--green-400)' },
                ].map(s => (
                  <div key={s.lbl} style={{ background: 'var(--bg-elev-2)', borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700, color: s.col, lineHeight: 1 }}>{s.val}</div>
                    <div style={{ fontSize: 9, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-3)' }}>{s.lbl}</div>
                  </div>
                ))}
              </div>

              {/* VS bars */}
              {vsStats.map(s => {
                const total = s.home + s.away || 1
                const hp = Math.round(s.home / total * 100)
                return (
                  <div key={s.label} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{s.label}</span>
                      <div style={{ display: 'flex', gap: 6, fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                        <span style={{ color: 'var(--green-400)' }}>{s.home}{s.unit}</span>
                        <span style={{ color: 'var(--text-3)' }}>·</span>
                        <span style={{ color: 'var(--amber)' }}>{s.away}{s.unit}</span>
                      </div>
                    </div>
                    <div style={{ height: 6, borderRadius: 999, overflow: 'hidden', display: 'grid', gridTemplateColumns: `${hp}fr ${100 - hp}fr`, background: 'var(--bg-elev-3)' }}>
                      <div style={{ background: 'var(--green-500)', borderRadius: '999px 0 0 999px' }} />
                      <div style={{ background: 'var(--amber)', borderRadius: '0 999px 999px 0' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Score Breakdown */}
          <div style={{ background: 'var(--bg-elev-1)', border: '1px solid var(--hairline)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--hairline)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>🧮 Score Breakdown</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-3)' }}>{m.aiScore}/100</span>
            </div>
            <div style={{ padding: '8px 16px' }}>
              {breakdown.map((b, i) => (
                <div key={b.factor} style={{
                  display: 'grid', gridTemplateColumns: '130px 1fr 36px',
                  alignItems: 'center', gap: 12, padding: '8px 0',
                  borderBottom: i < breakdown.length - 1 ? '1px solid var(--hairline)' : 'none',
                }}>
                  <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{b.factor}</span>
                  <div style={{ height: 5, borderRadius: 999, background: 'var(--bg-elev-3)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${b.pct}%`, background: accentColor, borderRadius: 999, transition: 'width .7s' }} />
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--text-1)', textAlign: 'right' }}>{b.points}</span>
                </div>
              ))}
            </div>
          </div>

          {/* AI Insight */}
          <div style={{ background: 'var(--bg-elev-1)', border: '1px solid var(--hairline)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--hairline)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>🤖 AI Insight</span>
              <span style={{ background: 'var(--green-soft)', color: 'var(--green-300)', border: '1px solid rgba(46,212,111,.2)', fontSize: 11, padding: '2px 8px', borderRadius: 999, fontWeight: 600 }}>
                สร้างโดย AI
              </span>
            </div>
            <div style={{ padding: 16 }}>
              <div style={{ background: 'var(--bg-elev-2)', borderRadius: 10, padding: 14, border: '1px solid var(--hairline)', lineHeight: 1.7, fontSize: 14, color: 'var(--text-1)', minHeight: 60 }}>
                {insightTxt}
                <span style={{ display: 'inline-block', width: 2, height: 14, marginLeft: 2, background: 'var(--green-400)', verticalAlign: 'middle' }} className="animate-blink" />
              </div>
            </div>
          </div>

          {/* Markets */}
          <div style={{ background: 'var(--bg-elev-1)', border: '1px solid var(--hairline)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--hairline)' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>💰 ตลาดที่แนะนำ</span>
            </div>
            <div style={{ padding: 14, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {markets.map(mk => (
                <div key={mk.key} style={{
                  background: mk.recommended ? 'var(--green-soft)' : 'var(--bg-elev-2)',
                  border: mk.recommended ? '1px solid rgba(46,212,111,.3)' : '1px solid var(--hairline)',
                  borderRadius: 10, padding: '12px 10px', cursor: 'pointer',
                }}>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: mk.recommended ? 'var(--green-300)' : 'var(--text-3)', marginBottom: 6 }}>
                    {mk.recommended ? '⭐ แนะนำ' : 'ทางเลือก'}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', marginBottom: 4 }}>{mk.name}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700, color: mk.recommended ? 'var(--green-400)' : 'var(--text-1)', lineHeight: 1 }}>
                    {mk.odds.toFixed(2)}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-2)', marginTop: 6, lineHeight: 1.4 }}>{mk.desc}</div>
                  <span style={{
                    display: 'inline-block', fontSize: 10, fontWeight: 600,
                    padding: '2px 7px', borderRadius: 999, marginTop: 8,
                    background: mk.recommended ? 'rgba(46,212,111,.15)' : 'var(--amber-soft)',
                    color: mk.recommended ? 'var(--green-400)' : 'var(--amber)',
                  }}>
                    {mk.recommended ? '+Edge' : 'Fair Price'}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </>
  )
}