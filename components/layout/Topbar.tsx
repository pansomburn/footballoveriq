'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

export function Topbar() {
  const path = usePathname()
  const isLive = path.includes('live')
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  return (
    <header style={{
      height: 60,
      borderBottom: '1px solid var(--hairline)',
      background: 'var(--bg-base)',
      display: 'flex', alignItems: 'center',
      padding: isMobile ? '0 14px' : '0 20px',
      gap: isMobile ? 10 : 16,
      position: 'sticky', top: 0, zIndex: 30,
    }}>

      {/* Logo */}
      <Link href="/dashboard/live" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', flexShrink: 0 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: 'linear-gradient(135deg, var(--green-500), var(--green-700))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#062014', fontWeight: 800, fontSize: 12, letterSpacing: '-0.04em',
          boxShadow: '0 0 0 1px rgba(46,212,111,0.4), 0 0 20px rgba(46,212,111,0.2)',
          flexShrink: 0,
        }}>OQ</div>
        {!isMobile && (
          <span style={{ fontWeight: 700, fontSize: 17, letterSpacing: '-0.02em', color: 'var(--text-1)' }}>
            OverIQ
          </span>
        )}
      </Link>

      {/* Mode tabs */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 2, padding: 3,
        background: 'var(--bg-elev-1)', borderRadius: 999, border: '1px solid var(--hairline)',
        flex: isMobile ? 1 : 'none',
      }}>
        <Link href="/dashboard/live" style={{
          padding: isMobile ? '7px 0' : '7px 14px',
          width: isMobile ? '50%' : 'auto', textAlign: 'center',
          borderRadius: 999, fontSize: 13, fontWeight: 600,
          background: isLive ? 'var(--green-500)' : 'transparent',
          color: isLive ? '#062014' : 'var(--text-2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          textDecoration: 'none', transition: 'all .15s', whiteSpace: 'nowrap',
        }}>
          {isLive && <span className="dot live" style={{ background: '#062014', boxShadow: 'none' }} />}
          Live In-play
        </Link>
        <Link href="/dashboard/prematch" style={{
          padding: isMobile ? '7px 0' : '7px 14px',
          width: isMobile ? '50%' : 'auto', textAlign: 'center',
          borderRadius: 999, fontSize: 13, fontWeight: 600,
          background: !isLive ? 'var(--green-500)' : 'transparent',
          color: !isLive ? '#062014' : 'var(--text-2)',
          textDecoration: 'none', transition: 'all .15s', whiteSpace: 'nowrap',
        }}>
          Pre-match
        </Link>
      </div>

      <div style={{ flex: isMobile ? 'none' : 1 }} />

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 10, flexShrink: 0 }}>
        {!isMobile && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '5px 10px', borderRadius: 999,
            background: 'var(--green-soft)', border: '1px solid rgba(46,212,111,.3)',
            color: 'var(--green-300)', fontSize: 11, fontWeight: 600,
          }}>⚡ PRO</span>
        )}

        {/* Notification */}
        <button style={{
          width: 34, height: 34, borderRadius: 8,
          background: 'var(--bg-elev-1)', border: '1px solid var(--hairline)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-2)', cursor: 'pointer', position: 'relative', flexShrink: 0,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </svg>
          <span style={{
            position: 'absolute', top: 4, right: 4,
            background: 'var(--green-400)', color: '#062014',
            fontSize: 9, fontWeight: 700, padding: '1px 4px',
            borderRadius: 999, minWidth: 14, textAlign: 'center',
          }}>5</span>
        </button>

        {/* Avatar → Account page */}
        <Link href="/dashboard/account" style={{
          width: 34, height: 34, borderRadius: 8,
          background: 'var(--bg-elev-1)', border: '1px solid var(--hairline)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700, color: 'var(--text-1)',
          textDecoration: 'none', flexShrink: 0,
          transition: 'border-color .15s',
        }}
          onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--green-500)'}
          onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--hairline)'}
        >KP</Link>
      </div>
    </header>
  )
}