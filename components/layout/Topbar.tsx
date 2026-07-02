'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

interface NotificationItem {
  id: string
  match_id: string
  type: string
  message: string
  ai_score: number | null
  sent_at: string
  read_at: string | null
}

interface NotificationsResponse {
  data: NotificationItem[]
  unread: number
}

export function Topbar() {
  const path = usePathname()
  const isLive = path.includes('live')
  const [isMobile, setIsMobile] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unread, setUnread] = useState(0)
  const [notifOpen, setNotifOpen] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const loadNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications', { cache: 'no-store' })
      if (!res.ok) return
      const payload = await res.json() as NotificationsResponse
      setNotifications(payload.data)
      setUnread(payload.unread)
    } catch (err) {
      console.warn('[notifications]', err)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => { void loadNotifications() }, 0)
    const interval = setInterval(() => { void loadNotifications() }, 30000)
    return () => {
      clearTimeout(t)
      clearInterval(interval)
    }
  }, [loadNotifications])

  const markNotificationRead = async (id: string) => {
    setNotifications(prev => prev.map(item => item.id === id ? { ...item, read_at: new Date().toISOString() } : item))
    setUnread(prev => Math.max(0, prev - 1))

    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
    } catch (err) {
      console.warn('[notification read]', err)
    }
  }

  const markAllRead = async () => {
    setNotifications(prev => prev.map(item => ({ ...item, read_at: item.read_at ?? new Date().toISOString() })))
    setUnread(0)

    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      })
    } catch (err) {
      console.warn('[notifications read all]', err)
    }
  }

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
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setNotifOpen(v => !v)}
            style={{
              width: 34, height: 34, borderRadius: 8,
              background: notifOpen ? 'var(--green-soft)' : 'var(--bg-elev-1)',
              border: notifOpen ? '1px solid rgba(46,212,111,.35)' : '1px solid var(--hairline)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: notifOpen ? 'var(--green-400)' : 'var(--text-2)',
              cursor: 'pointer', position: 'relative', flexShrink: 0,
            }}
            aria-label="notifications"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
            {unread > 0 && (
              <span style={{
                position: 'absolute', top: 4, right: 4,
                background: 'var(--green-400)', color: '#062014',
                fontSize: 9, fontWeight: 700, padding: '1px 4px',
                borderRadius: 999, minWidth: 14, textAlign: 'center',
              }}>{Math.min(unread, 9)}</span>
            )}
          </button>

          {notifOpen && (
            <div style={{
              position: 'absolute',
              top: 42,
              right: 0,
              width: isMobile ? 'calc(100vw - 28px)' : 360,
              maxHeight: 420,
              overflowY: 'auto',
              background: 'var(--bg-base)',
              border: '1px solid var(--hairline)',
              borderRadius: 10,
              boxShadow: '0 18px 48px rgba(0,0,0,.35)',
              zIndex: 60,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', padding: '12px 14px', borderBottom: '1px solid var(--hairline)' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>Notifications</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{unread} unread</div>
                </div>
                <button
                  onClick={() => { void markAllRead() }}
                  style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--green-400)', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}
                >
                  Mark all read
                </button>
              </div>

              {notifications.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
                  ยังไม่มีแจ้งเตือน
                </div>
              ) : notifications.map(item => (
                <button
                  key={item.id}
                  onClick={() => { void markNotificationRead(item.id) }}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    display: 'flex',
                    gap: 10,
                    textAlign: 'left',
                    background: item.read_at ? 'transparent' : 'var(--green-soft)',
                    border: 'none',
                    borderBottom: '1px solid var(--hairline)',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  <span style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: item.read_at ? 'var(--text-3)' : 'var(--green-400)',
                    marginTop: 5,
                    flexShrink: 0,
                  }} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 12, color: 'var(--text-1)', lineHeight: 1.45 }}>{item.message}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5, fontSize: 10, color: 'var(--text-3)' }}>
                      <span>{item.type}</span>
                      {item.ai_score != null && <span>AI {item.ai_score}</span>}
                      <span>{formatTime(item.sent_at)}</span>
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

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

function formatTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
