'use client'
import { useState, useEffect, useCallback } from 'react'
import { Topbar }             from '@/components/layout/Topbar'
import { LiveMatchCard }      from '@/components/match/LiveMatchCard'
import { MatchDetailDrawer }  from '@/components/match/MatchDetailDrawer'
import { getMockLiveMatches } from '@/lib/mockData'
import type { LiveMatch, LiveFilter } from '@/types'

const LEAGUES = ['ALL','Premier League','La Liga','Bundesliga','Serie A','Ligue 1','Thai League']
const LEAGUE_FLAGS: Record<string,string> = {
  'ALL':'🌐','Premier League':'🏴󠁧󠁢󠁥󠁮󠁧󠁿','La Liga':'🇪🇸','Bundesliga':'🇩🇪',
  'Serie A':'🇮🇹','Ligue 1':'🇫🇷','Thai League':'🇹🇭',
}

export default function LiveDashboard() {
  const [matches,    setMatches]    = useState<LiveMatch[]>([])
  const [filter,     setFilter]     = useState<LiveFilter>({ signal:'ALL', league:'ALL', market:'ALL', search:'' })
  const [lastUpdate, setLastUpdate] = useState('')
  const [bookmarks,  setBookmarks]  = useState<Set<string>>(new Set(['l1','l2']))
  const [spinning,   setSpinning]   = useState(false)
  const [detail,     setDetail]     = useState<LiveMatch|null>(null)
  const [isMobile,   setIsMobile]   = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const load = useCallback(() => {
    const data = getMockLiveMatches().map(m => ({ ...m, bookmarked: bookmarks.has(m.id) }))
    setMatches(data)
    const n = new Date()
    setLastUpdate(`${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}:${String(n.getSeconds()).padStart(2,'0')}`)
  }, [bookmarks])

  useEffect(() => { load() }, [load])
  useEffect(() => { const t = setInterval(load, 8000); return () => clearInterval(t) }, [load])

  const handleBookmark = (id: string) => {
    setBookmarks(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  const handleRefresh = () => { setSpinning(true); load(); setTimeout(() => setSpinning(false), 600) }
  const handleOpenDetail = (id: string) => {
    const m = matches.find(x => x.id === id)
    if (m) setDetail({ ...m, bookmarked: bookmarks.has(m.id) })
  }

  const visible = matches.filter(m => {
    if (filter.signal === 'BOOKMARK' && !bookmarks.has(m.id)) return false
    if (filter.signal !== 'ALL' && filter.signal !== 'BOOKMARK' && m.signal !== filter.signal) return false
    if (filter.league !== 'ALL' && m.league !== filter.league) return false
    if (filter.search && !`${m.homeTeam} ${m.awayTeam} ${m.league}`.toLowerCase().includes(filter.search.toLowerCase())) return false
    return true
  })

  const counts = {
    all: matches.length,
    hot: matches.filter(m => m.signal === 'HOT').length,
    watch: matches.filter(m => m.signal === 'WATCH').length,
    wait: matches.filter(m => m.signal === 'WAIT').length,
    bookmark: bookmarks.size,
  }

  const NAV = [
    { key:'ALL',      icon:'⚽', label:'ทั้งหมด',  count: counts.all },
    { key:'HOT',      icon:'🔥', label:'HOT',       count: counts.hot },
    { key:'WATCH',    icon:'👁',  label:'WATCH',     count: counts.watch },
    { key:'WAIT',     icon:'⏳', label:'WAIT',       count: counts.wait },
    { key:'BOOKMARK', icon:'🔖', label:'Bookmarked', count: counts.bookmark },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-deep)', display: 'flex', flexDirection: 'column' }}>
      <Topbar />

      <div style={{ display: 'flex', flex: 1, height: 'calc(100vh - 60px)', overflow: 'hidden' }}>

        {/* ── Sidebar (desktop only) ── */}
        {!isMobile && (
          <aside style={{
            width: 232, flexShrink: 0,
            background: 'var(--bg-base)',
            borderRight: '1px solid var(--hairline)',
            overflowY: 'auto', padding: '20px 12px',
            position: 'sticky', top: 60,
            height: 'calc(100vh - 60px)',
          }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', color: 'var(--text-3)', padding: '0 12px 8px', textTransform: 'uppercase' }}>
              สัญญาณ • Signals
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 24 }}>
              {NAV.map(n => {
                const active = filter.signal === n.key
                return (
                  <button key={n.key}
                    onClick={() => setFilter(f => ({ ...f, signal: n.key as any }))}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      width: '100%', padding: '9px 12px', borderRadius: 8,
                      background: active ? 'var(--green-soft)' : 'transparent',
                      border: active ? '1px solid rgba(46,212,111,.25)' : '1px solid transparent',
                      color: active ? 'var(--green-300)' : 'var(--text-2)',
                      fontSize: 13, fontWeight: active ? 600 : 500,
                      cursor: 'pointer', textAlign: 'left', transition: 'all .15s',
                    }}>
                    <span style={{ width: 18, textAlign: 'center' }}>{n.icon}</span>
                    <span style={{ flex: 1 }}>{n.label}</span>
                    <span style={{ fontSize: 11, color: active ? 'var(--green-400)' : 'var(--text-3)', fontVariantNumeric: 'tabular-nums' }}>{n.count}</span>
                  </button>
                )
              })}
            </div>

            <div style={{ height: 1, background: 'var(--hairline)', margin: '0 12px 16px' }} />

            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', color: 'var(--text-3)', padding: '0 12px 8px', textTransform: 'uppercase' }}>
              ลีก • Leagues
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 24 }}>
              {LEAGUES.map(l => {
                const active = filter.league === l
                const cnt = l === 'ALL' ? matches.length : matches.filter(m => m.league === l).length
                return (
                  <button key={l}
                    onClick={() => setFilter(f => ({ ...f, league: l }))}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 12px', borderRadius: 8,
                      background: active ? 'var(--bg-elev-2)' : 'transparent',
                      border: 'none', color: active ? 'var(--text-1)' : 'var(--text-2)',
                      fontSize: 13, cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'all .15s',
                    }}>
                    <span>{LEAGUE_FLAGS[l]}</span>
                    <span style={{ flex: 1 }}>{l === 'ALL' ? 'ทั้งหมด' : l}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-3)', fontVariantNumeric: 'tabular-nums' }}>{cnt}</span>
                  </button>
                )
              })}
            </div>

            <div style={{ margin: '0 4px', padding: 14, borderRadius: 12, background: 'linear-gradient(135deg, rgba(46,212,111,.08), rgba(46,212,111,.02))', border: '1px solid rgba(46,212,111,.2)' }}>
              <div style={{ fontSize: 11, color: 'var(--green-300)', fontWeight: 600, marginBottom: 4 }}>⚡ Tips</div>
              <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>
                ติ๊ก <span style={{ color: 'var(--green-400)' }}>★</span> ที่คู่ที่สนใจ ระบบจะส่งแจ้งเตือนเมื่อถึงเกณฑ์
              </div>
            </div>
          </aside>
        )}

        {/* ── Main ── */}
        <main style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

          {/* Search bar */}
          <div style={{
            background: 'var(--bg-base)', borderBottom: '1px solid var(--hairline)',
            padding: isMobile ? '10px 14px' : '12px 20px',
            display: 'flex', alignItems: 'center', gap: 8,
            position: 'sticky', top: 0, zIndex: 10,
          }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--text-3)', pointerEvents: 'none' }}>🔍</span>
              <input
                value={filter.search}
                onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
                placeholder="ค้นหาทีมหรือลีก..."
                style={{
                  width: '100%', height: 36, background: 'var(--bg-elev-1)',
                  border: '1px solid var(--hairline)', borderRadius: 8, color: 'var(--text-1)',
                  paddingLeft: 32, paddingRight: 12, fontSize: 13, outline: 'none', fontFamily: 'inherit',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--green-500)'}
                onBlur={e => e.target.style.borderColor = 'var(--hairline)'}
              />
            </div>
            {!isMobile && (
              <select value={filter.market} onChange={e => setFilter(f => ({ ...f, market: e.target.value as any }))}
                style={{ height: 36, padding: '0 10px', background: 'var(--bg-elev-1)', border: '1px solid var(--hairline)', borderRadius: 8, color: 'var(--text-1)', fontSize: 13, outline: 'none', cursor: 'pointer', fontFamily: 'inherit', minWidth: 120 }}>
                <option value="ALL">ทุก market</option>
                <option value="OVER25">Over 2.5</option>
                <option value="BTTS">BTTS</option>
              </select>
            )}
            <button onClick={handleRefresh}
              style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-elev-1)', border: '1px solid var(--hairline)', borderRadius: 8, color: 'var(--text-2)', fontSize: 16, cursor: 'pointer', flexShrink: 0 }}
              className={spinning ? 'animate-spin-slow' : ''}>↻</button>
          </div>

          {/* Mobile: horizontal filter chips */}
          {isMobile && (
            <div style={{
              background: 'var(--bg-base)', borderBottom: '1px solid var(--hairline)',
              padding: '10px 14px', display: 'flex', gap: 8, overflowX: 'auto',
            }}>
              {NAV.map(n => {
                const active = filter.signal === n.key
                return (
                  <button key={n.key}
                    onClick={() => setFilter(f => ({ ...f, signal: n.key as any }))}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '7px 12px', borderRadius: 999, flexShrink: 0,
                      background: active ? 'var(--green-soft)' : 'var(--bg-elev-1)',
                      border: active ? '1px solid rgba(46,212,111,.4)' : '1px solid var(--hairline)',
                      color: active ? 'var(--green-300)' : 'var(--text-2)',
                      fontSize: 13, fontWeight: active ? 600 : 500, cursor: 'pointer',
                    }}>
                    <span>{n.icon} {n.label}</span>
                    <span style={{
                      background: active ? 'rgba(46,212,111,.2)' : 'var(--bg-elev-3)',
                      color: active ? 'var(--green-400)' : 'var(--text-3)',
                      fontSize: 11, fontWeight: 600, padding: '1px 6px', borderRadius: 999,
                    }}>{n.count}</span>
                  </button>
                )
              })}
            </div>
          )}

          {/* Count bar */}
          <div style={{
            background: 'var(--bg-base)', borderBottom: '1px solid var(--hairline)',
            padding: isMobile ? '8px 14px' : '10px 20px',
            display: 'flex', alignItems: 'center', gap: isMobile ? 12 : 16, flexWrap: 'wrap',
          }}>
            {[
              { val: counts.all,   lbl: 'คู่ทั้งหมด', col: 'var(--text-1)' },
              null,
              { val: counts.hot,   lbl: 'HOT',        col: 'var(--green-400)' },
              null,
              { val: counts.watch, lbl: 'WATCH',      col: 'var(--amber)' },
              ...(!isMobile ? [null, { val: `🔖 ${counts.bookmark}`, lbl: 'Bookmarked', col: 'var(--text-1)' }] : []),
            ].map((item, i) => item === null
              ? <div key={i} style={{ width: 1, height: 14, background: 'var(--hairline-strong)' }} />
              : <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: (item as any).col }}>{(item as any).val}</span>
                  <span style={{ color: 'var(--text-3)', fontSize: 12 }}>{(item as any).lbl}</span>
                </div>
            )}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--green-400)' }}>
              <span className="dot live" />
              {isMobile ? lastUpdate : `Live · อัปเดตเมื่อ ${lastUpdate}`}
            </div>
          </div>

          {/* Cards */}
          <div style={{ padding: isMobile ? '12px 14px' : '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {visible.length === 0
              ? <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '64px 0', color: 'var(--text-2)', textAlign: 'center' }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-1)', marginBottom: 4 }}>ไม่พบคู่ที่ตรงเงื่อนไข</div>
                  <div style={{ fontSize: 13 }}>ลองเปลี่ยน filter</div>
                </div>
              : visible.map((m, i) => (
                  <LiveMatchCard key={m.id} match={{ ...m, bookmarked: bookmarks.has(m.id) }}
                    index={i} onBookmark={handleBookmark} onOpenDetail={handleOpenDetail} />
                ))
            }
          </div>
        </main>
      </div>

      <MatchDetailDrawer match={detail} onClose={() => setDetail(null)} />
    </div>
  )
}