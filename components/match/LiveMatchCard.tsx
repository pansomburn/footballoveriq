'use client'
import { useState, useEffect } from 'react'
import { signalAccent } from '@/lib/scoring'
import type { LiveMatch } from '@/types'

interface Props {
  match:        LiveMatch
  index:        number
  onBookmark:   (id: string) => void
  onOpenDetail: (id: string) => void
  readOnly?:     boolean
}

function TagChip({ signal }: { signal: string }) {
  const map: Record<string, { label: string; icon: string; cls: string }> = {
    HOT:   { label: 'HOT',   icon: '🔥', cls: 'green' },
    WATCH: { label: 'WATCH', icon: '👁',  cls: 'amber' },
    WAIT:  { label: 'WAIT',  icon: '⏳', cls: 'orange' },
    SKIP:  { label: 'SKIP',  icon: '—',  cls: '' },
  }
  const t = map[signal] ?? map.SKIP
  return <span className={`chip ${t.cls}`}>{t.icon} {t.label}</span>
}

function signalReason(match: LiveMatch) {
  if (match.signal === 'HOT') {
    if (match.stats.shotsOnGoal >= 10) return `ยิงเข้ากรอบ ${match.stats.shotsOnGoal} ครั้ง`
    if (match.stats.dangerousAttacks >= 80) return `Danger สูง ${match.stats.dangerousAttacks}`
    return `AI Score สูง ${match.aiScore}`
  }
  if (match.signal === 'WATCH') {
    if (match.stats.dangerousAttacks >= 70) return `เริ่มกดดันต่อเนื่อง`
    return `น่าติดตามต่อ`
  }
  if (match.signal === 'WAIT') return 'ยังไม่ถึงเกณฑ์เข้าเล่น'
  return 'ไม่มีสัญญาณเด่น'
}

function TeamCrest({ name, size = 28 }: { name: string; size?: number }) {
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
      color: '#fff', fontSize: Math.round(size * 0.32), fontWeight: 700,
      letterSpacing: '-0.02em', flexShrink: 0,
      boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.15)',
    }}>
      {short}
    </div>
  )
}

function BookmarkBtn({ bookmarked, onClick }: { bookmarked: boolean; onClick: (e: React.MouseEvent) => void }) {
  return (
    <button onClick={onClick} style={{
      width: 28, height: 28, borderRadius: 6, display: 'flex',
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      background: bookmarked ? 'var(--green-soft)' : 'transparent',
      border: bookmarked ? '1px solid rgba(46,212,111,.3)' : '1px solid var(--hairline)',
      color: bookmarked ? 'var(--green-400)' : 'var(--text-3)',
      cursor: 'pointer',
    }} aria-label="bookmark">
      <svg width="13" height="13" viewBox="0 0 24 24"
        fill={bookmarked ? 'currentColor' : 'none'}
        stroke="currentColor" strokeWidth="2">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
    </button>
  )
}

export function LiveMatchCard({ match: m, index, onBookmark, onOpenDetail, readOnly = false }: Props) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const isHot = m.signal === 'HOT'
  const accentColor = signalAccent(m.signal)
  const reason = signalReason(m)
  const overLabel = m.overMarket ? `O${m.overMarket.line} @ ${m.overMarket.odds.toFixed(2)}` : null

  // ── Mobile layout ──────────────────────────────────────────────
  if (isMobile) {
    return (
      <div
        className="animate-fadeUp"
        style={{
          animationDelay: `${index * 0.04}s`,
          position: 'relative',
          background: 'var(--bg-elev-1)',
          border: `1px solid ${isHot ? 'rgba(46,212,111,.35)' : 'var(--hairline)'}`,
          borderRadius: 14, padding: '14px',
          cursor: readOnly ? 'default' : 'pointer',
        }}
        onClick={() => { if (!readOnly) onOpenDetail(m.id) }}
      >
        {isHot && <div className="accent-line" />}

        {/* Top row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <TagChip signal={m.signal} />
          <span style={{ fontSize: 11, color: 'var(--text-2)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {m.leagueFlag} {m.league}
          </span>
          <span style={{ fontSize: 11, color: 'var(--green-300)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span className="dot live" />{m.minute}&apos;
          </span>
          {!readOnly && <BookmarkBtn bookmarked={m.bookmarked} onClick={e => { e.stopPropagation(); onBookmark(m.id) }} />}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{
            fontSize: 11,
            color: isHot ? 'var(--green-300)' : 'var(--text-2)',
            background: isHot ? 'var(--green-soft)' : 'var(--bg-elev-2)',
            border: `1px solid ${isHot ? 'rgba(46,212,111,.28)' : 'var(--hairline)'}`,
            borderRadius: 999,
            padding: '4px 8px',
            lineHeight: 1.2,
          }}>{reason}</span>
          {overLabel && (
            <span style={{
              marginLeft: 'auto',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--green-300)',
              border: '1px solid rgba(46,212,111,.24)',
              background: 'rgba(46,212,111,.08)',
              borderRadius: 999,
              padding: '4px 8px',
              whiteSpace: 'nowrap',
            }}>{overLabel}</span>
          )}
        </div>

        {/* Teams + AI Score */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <TeamCrest name={m.homeTeam} size={24} />
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', flex: 1 }}>{m.homeTeam}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700, color: 'var(--text-1)' }}>{m.scoreHome}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <TeamCrest name={m.awayTeam} size={24} />
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', flex: 1 }}>{m.awayTeam}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700, color: 'var(--text-1)' }}>{m.scoreAway}</span>
            </div>
          </div>

          {/* AI Score block */}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            paddingLeft: 14, borderLeft: '1px solid var(--hairline)', minWidth: 60,
          }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 30, fontWeight: 700, color: accentColor, lineHeight: 1 }}>
              {m.aiScore}
            </span>
            <span style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              AI SCORE
            </span>
          </div>
        </div>

        {/* Mini stats */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 6, marginTop: 12, paddingTop: 10,
          borderTop: '1px solid var(--hairline)',
        }}>
          {[
            { val: m.stats.shotsOnGoal,           lbl: 'SOG' },
            { val: m.stats.dangerousAttacks, lbl: 'DANGER' },
            { val: m.stats.corners,               lbl: 'CORNERS' },
            { val: m.stats.tempo,                 lbl: 'TEMPO' },
          ].map(s => (
            <div key={s.lbl} style={{
              background: 'var(--bg-elev-2)', borderRadius: 8,
              padding: '7px 4px', textAlign: 'center',
            }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{s.val}</div>
              <div style={{ fontSize: 9, color: 'var(--text-3)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.lbl}</div>
            </div>
          ))}
        </div>

        {/* Insight */}
        <p style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5, margin: '10px 0 0' }}>
          💡 {m.insight}
        </p>
      </div>
    )
  }

  // ── Desktop layout ─────────────────────────────────────────────
  return (
    <div
      className="animate-fadeUp"
      style={{
        animationDelay: `${index * 0.04}s`,
        position: 'relative',
        background: 'var(--bg-elev-1)',
        border: `1px solid ${isHot ? 'rgba(46,212,111,.35)' : 'var(--hairline)'}`,
        borderRadius: 14, padding: '16px 18px',
        transition: 'border-color .15s',
        cursor: readOnly ? 'default' : 'pointer',
      }}
      onClick={() => { if (!readOnly) onOpenDetail(m.id) }}
      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = isHot ? 'rgba(46,212,111,.6)' : 'var(--hairline-strong)'}
      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = isHot ? 'rgba(46,212,111,.35)' : 'var(--hairline)'}
    >
      {isHot && <div className="accent-line" />}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <TagChip signal={m.signal} />
        <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{m.leagueFlag} {m.league}</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--green-300)' }}>
          <span className="dot live" />{m.minute}&apos;
        </span>
        <div style={{ flex: 1 }} />
        {!readOnly && <BookmarkBtn bookmarked={m.bookmarked} onClick={e => { e.stopPropagation(); onBookmark(m.id) }} />}
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
        padding: '9px 10px',
        borderRadius: 10,
        background: isHot ? 'var(--green-soft)' : 'var(--bg-elev-2)',
        border: `1px solid ${isHot ? 'rgba(46,212,111,.28)' : 'var(--hairline)'}`,
      }}>
        <span style={{ width: 6, height: 6, borderRadius: 999, background: accentColor, flexShrink: 0 }} />
        <span style={{ fontSize: 13, color: isHot ? 'var(--green-300)' : 'var(--text-2)', fontWeight: isHot ? 600 : 500 }}>
          {reason}
        </span>
        <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 12, color: accentColor, fontWeight: 700 }}>
          AI {m.aiScore}
        </span>
        {overLabel && (
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            color: 'var(--green-300)',
            fontWeight: 700,
            border: '1px solid rgba(46,212,111,.24)',
            background: 'rgba(46,212,111,.08)',
            borderRadius: 999,
            padding: '4px 8px',
            whiteSpace: 'nowrap',
          }}>{overLabel}</span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 16, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <TeamCrest name={m.homeTeam} size={32} />
          <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-1)' }}>{m.homeTeam}</span>
        </div>
        <div style={{
          background: 'var(--bg-elev-2)', border: '1px solid var(--hairline)',
          borderRadius: 10, padding: '8px 16px', minWidth: 80,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 600, color: 'var(--text-1)', lineHeight: 1 }}>{m.scoreHome}</span>
          <span style={{ color: 'var(--text-3)', fontSize: 16 }}>:</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 600, color: 'var(--text-1)', lineHeight: 1 }}>{m.scoreAway}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-end' }}>
          <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-1)', textAlign: 'right' }}>{m.awayTeam}</span>
          <TeamCrest name={m.awayTeam} size={32} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6, paddingTop: 12, borderTop: '1px solid var(--hairline)', marginBottom: 12 }}>
        {[
          { val: m.stats.shotsOnGoal,      lbl: 'SOG' },
          { val: m.stats.totalShots,       lbl: 'SHOTS' },
          { val: m.stats.dangerousAttacks, lbl: 'DANGER' },
          { val: m.stats.tempo,            lbl: 'TEMPO' },
          { val: m.stats.corners,          lbl: 'CORNERS' },
          { val: m.aiScore, lbl: 'AI SCORE', highlight: true },
        ].map(s => (
          <div key={s.lbl} style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600, color: s.highlight ? accentColor : 'var(--text-1)' }}>{s.val}</div>
            <div style={{ fontSize: 10, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-3)' }}>{s.lbl}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span style={{ fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.05em', textTransform: 'uppercase', flexShrink: 0 }}>AI SCORE</span>
        <div style={{ flex: 1, height: 6, borderRadius: 999, background: 'var(--bg-elev-3)', overflow: 'hidden' }}>
          <div className="aiscore-fill" style={{ width: `${m.aiScore}%` }} />
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: accentColor, minWidth: 28, textAlign: 'right' }}>{m.aiScore}</span>
      </div>

      <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.55, margin: 0 }}>💡 {m.insight}</p>

      {readOnly ? (
        <a
          href="/auth/login?mode=register"
          onClick={e => e.stopPropagation()}
          style={{
            marginTop: 12, width: '100%', height: 34,
            background: 'var(--green-soft)', border: '1px solid rgba(46,212,111,.28)',
            borderRadius: 8, color: 'var(--green-300)', fontSize: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            textDecoration: 'none', fontWeight: 600,
          }}
        >
          สมัครเพื่อเปิดรายละเอียด →
        </a>
      ) : (
        <button
          onClick={e => { e.stopPropagation(); onOpenDetail(m.id) }}
          style={{
            marginTop: 12, width: '100%', height: 34,
            background: 'transparent', border: '1px solid var(--hairline)',
            borderRadius: 8, color: 'var(--text-2)', fontSize: 12, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, transition: 'all .15s',
          }}
          onMouseEnter={e => { const b = e.currentTarget; b.style.borderColor = 'var(--green-500)'; b.style.color = 'var(--green-400)'; b.style.background = 'var(--green-soft)' }}
          onMouseLeave={e => { const b = e.currentTarget; b.style.borderColor = 'var(--hairline)'; b.style.color = 'var(--text-2)'; b.style.background = 'transparent' }}
        >
          ดูรายละเอียดเพิ่มเติม →
        </button>
      )}
    </div>
  )
}
