'use client'
import { useEffect, useState } from 'react'
import { SignalBadge } from '@/components/ui/SignalBadge'
import { AIScoreBar }  from '@/components/ui/AIScoreBar'
import { signalAccent, calcLiveScore, scoreToSignal } from '@/lib/scoring'
import type { LiveMatch } from '@/types'

interface Props {
  match:   LiveMatch | null
  onClose: () => void
}

const MARKETS = [
  { key:'over25', name:'Over 2.5',  desc:'ต้องการอีก 1 ประตู', valueTag:'strong' },
  { key:'btts',   name:'BTTS',      desc:'ทั้งสองทีมยิงได้แล้ว', valueTag:'strong' },
  { key:'over35', name:'Over 3.5',  desc:'ความเสี่ยงสูงกว่า', valueTag:'fair' },
]

export function MatchDetailDrawer({ match: m, onClose }: Props) {
  const [visible,    setVisible]    = useState(false)
  const [notifOn,    setNotifOn]    = useState(true)
  const [insightTxt, setInsightTxt] = useState('')
  const [openFactor, setOpenFactor] = useState<string|null>(null)

  useEffect(() => {
    if (m) { setVisible(true); typeInsight(m.insight) }
    else    setVisible(false)
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

  const vsStats = [
    { label:'Possession', home: m.stats.possessionHome, away: m.stats.possessionAway, unit:'%' },
    { label:'Shots on Goal', home: m.stats.shotsOnGoal, away: Math.max(1, m.stats.shotsOnGoal - 3), unit:'' },
    { label:'Dangerous Attacks', home: Math.round(m.stats.dangerousAttacks * 0.62), away: Math.round(m.stats.dangerousAttacks * 0.38), unit:'' },
  ]

  const oddsMap: Record<string,number> = {
    over25: 1.72 + Math.random() * 0.3,
    btts:   1.65 + Math.random() * 0.2,
    over35: 3.00 + Math.random() * 0.4,
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,.55)',
          zIndex:40, opacity: visible ? 1 : 0,
          transition:'opacity .25s',
          pointerEvents: visible ? 'auto' : 'none',
        }}
      />

      {/* Drawer */}
      <div style={{
        position:'fixed', top:0, right:0, bottom:0,
        width: 'min(540px, 100vw)',
        background:'var(--bg)',
        borderLeft:'1px solid var(--border)',
        zIndex:50,
        transform: visible ? 'translateX(0)' : 'translateX(100%)',
        transition:'transform .3s cubic-bezier(.4,0,.2,1)',
        overflowY:'auto',
        display:'flex', flexDirection:'column',
      }}>

        {/* Drawer header */}
        <div style={{ background:'var(--bg2)', borderBottom:'1px solid var(--border)', padding:'14px 20px' }}
          className="flex items-center gap-3 sticky top-0 z-10">
          <button onClick={onClose}
            style={{ width:32, height:32, borderRadius:8, background:'var(--bg3)', border:'1px solid var(--border2)', color:'var(--muted)' }}
            className="flex items-center justify-center cursor-pointer text-[16px] transition-all hover:text-[var(--text)] hover:border-[var(--border2)]">
            ✕
          </button>
          <div style={{ width:1, height:20, background:'var(--border2)' }} />
          <span className="text-[14px] font-medium" style={{ color:'var(--text)' }}>Match Detail</span>
          <div className="flex items-center gap-[6px] text-[12px] ml-auto" style={{ color:'var(--green)' }}>
            <span className="w-[6px] h-[6px] rounded-full animate-blink" style={{ background:'var(--green)' }} />
            Live · {m.minute}'
          </div>
        </div>

        <div className="p-5 flex flex-col gap-4">

          {/* Hero */}
          <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
            <div style={{ height:3, background: signalAccent(m.signal) }} />
            <div className="p-5">
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <SignalBadge signal={m.signal} />
                <span className="text-[12px]" style={{ color:'var(--muted)' }}>{m.leagueFlag} {m.league}</span>
              </div>
              <div className="grid gap-4 mb-4" style={{ gridTemplateColumns:'1fr 90px 1fr', alignItems:'center' }}>
                <div>
                  <div className="text-[18px] font-semibold tracking-tight" style={{ color:'var(--text)' }}>{m.homeTeam}</div>
                  <div className="text-[12px] mt-1" style={{ color:'var(--muted)' }}>เหย้า</div>
                </div>
                <div style={{ background:'var(--bg3)', borderRadius:10, padding:'10px 14px', textAlign:'center', border:'1px solid var(--border2)' }}>
                  <div className="font-mono text-[28px] font-medium" style={{ color:'var(--text)', lineHeight:1 }}>
                    {m.scoreHome}<span style={{ color:'var(--dim)', margin:'0 3px' }}>-</span>{m.scoreAway}
                  </div>
                  <div className="text-[10px] mt-1" style={{ color:'var(--dim)' }}>นาที {m.minute}'</div>
                </div>
                <div className="text-right">
                  <div className="text-[18px] font-semibold tracking-tight" style={{ color:'var(--text)' }}>{m.awayTeam}</div>
                  <div className="text-[12px] mt-1" style={{ color:'var(--muted)' }}>เยือน</div>
                </div>
              </div>
              <AIScoreBar score={m.aiScore} signal={m.signal} size="lg" />
            </div>
          </div>

          {/* Notification */}
          <div style={{ background:'var(--bg2)', border:'1px solid rgba(0,166,81,.2)', borderRadius:12, padding:'14px 16px' }}
            className="flex items-center gap-4">
            <div style={{ width:40, height:40, background:'var(--green-bg)', borderRadius:10 }}
              className="flex items-center justify-center text-[20px] flex-shrink-0">🔔</div>
            <div className="flex-1">
              <div className="text-[14px] font-semibold" style={{ color:'var(--text)' }}>แจ้งเตือนคู่นี้</div>
              <div className="text-[12px]" style={{ color:'var(--muted)' }}>Push เมื่อ AI Score พุ่ง หรือมีสัญญาณพิเศษ</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[12px]" style={{ color:'var(--muted)' }}>{notifOn ? 'เปิดอยู่' : 'ปิดอยู่'}</span>
              <button onClick={() => setNotifOn(v => !v)}
                style={{
                  width:44, height:24, borderRadius:999, border:'none', cursor:'pointer',
                  background: notifOn ? 'var(--green)' : 'var(--bg4)',
                  position:'relative', transition:'background .2s',
                }}>
                <span style={{
                  position:'absolute', top:3, left: notifOn ? 'calc(100% - 21px)' : 3,
                  width:18, height:18, borderRadius:'50%', background:'#fff',
                  transition:'left .2s',
                }} />
              </button>
            </div>
          </div>

          {/* Live Stats */}
          <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
            <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)' }}
              className="flex items-center justify-between">
              <span className="text-[13px] font-semibold flex items-center gap-2" style={{ color:'var(--text)' }}>📊 Live Statistics</span>
              <span className="text-[12px]" style={{ color:'var(--dim)' }}>รวมทั้งสองทีม</span>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-3 gap-[10px] mb-4">
                {[
                  { val: m.stats.shotsOnGoal,     lbl:'Shots on Goal', color:'var(--green)' },
                  { val: m.stats.totalShots,       lbl:'Total Shots',   color:'var(--text)' },
                  { val: m.stats.dangerousAttacks, lbl:'Danger Atk',   color:'var(--amber)' },
                  { val: m.stats.tempo,            lbl:'Tempo',        color:'var(--text)' },
                  { val: m.stats.corners,          lbl:'Corners',      color:'var(--text)' },
                  { val: m.stats.xg.toFixed(2),   lbl:'xG',           color:'var(--green)' },
                ].map(s => (
                  <div key={s.lbl} style={{ background:'var(--bg3)', borderRadius:8, padding:'12px 14px', textAlign:'center' }}>
                    <div className="font-mono text-[22px] font-medium" style={{ color:s.color, lineHeight:1 }}>{s.val}</div>
                    <div className="text-[11px] mt-1 uppercase tracking-[.04em]" style={{ color:'var(--muted)' }}>{s.lbl}</div>
                  </div>
                ))}
              </div>

              {/* vs bars */}
              {vsStats.map(s => {
                const total = s.home + s.away
                const hp = Math.round(s.home / total * 100)
                return (
                  <div key={s.label} className="mb-3">
                    <div className="flex justify-between items-center text-[12px] mb-[5px]">
                      <span style={{ color:'var(--muted)' }}>{s.label}</span>
                      <div className="flex gap-2">
                        <span className="font-mono font-medium" style={{ color:'var(--green)' }}>{s.home}{s.unit}</span>
                        <span style={{ color:'var(--dim)' }}>·</span>
                        <span className="font-mono font-medium" style={{ color:'var(--amber)' }}>{s.away}{s.unit}</span>
                      </div>
                    </div>
                    <div className="grid h-[6px] rounded-full overflow-hidden" style={{ gridTemplateColumns:`${hp}fr ${100-hp}fr`, background:'var(--bg4)' }}>
                      <div style={{ background:'var(--green)', borderRadius:'999px 0 0 999px' }} />
                      <div style={{ background:'var(--amber)', borderRadius:'0 999px 999px 0' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Score Breakdown */}
          <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
            <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)' }}
              className="flex items-center justify-between">
              <span className="text-[13px] font-semibold flex items-center gap-2" style={{ color:'var(--text)' }}>🧮 Score Breakdown</span>
              <span className="font-mono text-[12px]" style={{ color:'var(--dim)' }}>{m.aiScore}/100</span>
            </div>
            <div className="p-4 flex flex-col gap-0">
              {breakdown.map((b, i) => (
                <div key={b.factor} style={{ borderBottom: i < breakdown.length-1 ? '1px solid var(--border)' : 'none', display:'grid', gridTemplateColumns:'130px 1fr 38px', alignItems:'center', gap:12, padding:'8px 0' }}>
                  <span className="text-[13px] font-medium" style={{ color:'var(--text)' }}>{b.factor}</span>
                  <div className="h-[6px] rounded-full overflow-hidden" style={{ background:'var(--bg4)' }}>
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width:`${b.pct}%`, background: signalAccent(m.signal) }} />
                  </div>
                  <span className="font-mono text-[13px] font-medium text-right" style={{ color:'var(--text)' }}>{b.points}</span>
                </div>
              ))}
            </div>
          </div>

          {/* AI Insight */}
          <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
            <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)' }}
              className="flex items-center justify-between">
              <span className="text-[13px] font-semibold flex items-center gap-2" style={{ color:'var(--text)' }}>🤖 AI Insight</span>
              <span style={{ background:'var(--green-bg)', color:'var(--green)', border:'1px solid rgba(0,166,81,.2)', fontSize:11, padding:'2px 8px', borderRadius:999 }}>
                สร้างโดย AI
              </span>
            </div>
            <div className="p-4">
              <div style={{ background:'var(--bg3)', borderRadius:10, padding:16, border:'1px solid var(--border2)', lineHeight:1.75, fontSize:14, color:'var(--text)', minHeight:80 }}>
                {insightTxt}
                <span className="inline-block w-[2px] h-[14px] ml-[2px] animate-blink" style={{ background:'var(--green)', verticalAlign:'middle' }} />
              </div>
            </div>
          </div>

          {/* Markets */}
          <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
            <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)' }}>
              <span className="text-[13px] font-semibold flex items-center gap-2" style={{ color:'var(--text)' }}>💰 ตลาดที่แนะนำ</span>
            </div>
            <div className="p-4 grid grid-cols-3 gap-[10px]">
              {MARKETS.map((mk, i) => (
                <div key={mk.key}
                  style={{
                    background: i === 0 ? 'var(--green-bg)' : 'var(--bg3)',
                    border:     i === 0 ? '1px solid rgba(0,166,81,.3)' : '1px solid var(--border2)',
                    borderRadius:10, padding:14, cursor:'pointer',
                  }}
                  className="transition-all hover:border-[var(--green)]">
                  <div className="text-[10px] font-semibold uppercase tracking-[.08em] mb-[6px]" style={{ color:'var(--muted)' }}>
                    {i === 0 ? '⭐ แนะนำ' : 'ทางเลือก'}
                  </div>
                  <div className="text-[16px] font-semibold mb-1" style={{ color:'var(--text)' }}>{mk.name}</div>
                  <div className="font-mono text-[22px] font-medium" style={{ color:'var(--green)', lineHeight:1 }}>
                    {oddsMap[mk.key].toFixed(2)}
                  </div>
                  <div className="text-[11px] mt-[6px]" style={{ color:'var(--muted)', lineHeight:1.5 }}>{mk.desc}</div>
                  <span style={{
                    display:'inline-block', fontSize:11, fontWeight:600,
                    padding:'2px 8px', borderRadius:999, marginTop:6,
                    background: mk.valueTag === 'strong' ? 'rgba(0,166,81,.15)' : 'var(--amber-bg)',
                    color:      mk.valueTag === 'strong' ? 'var(--green)' : 'var(--amber)',
                  }}>
                    {mk.valueTag === 'strong' ? '+Edge' : 'Fair Price'}
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
