'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { LiveMatchCard } from '@/components/match/LiveMatchCard'
import type { LiveMatch } from '@/types'

interface LiveMatchesResponse {
  data: LiveMatch[]
  source: string
  error?: string
}

export default function DemoPage() {
  const [matches, setMatches] = useState<LiveMatch[]>([])
  const [source, setSource] = useState('loading')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/matches/live', { cache: 'no-store' })
        const payload = await res.json() as LiveMatchesResponse
        if (!res.ok) throw new Error(payload.error ?? 'โหลด demo ไม่สำเร็จ')
        setMatches(payload.data.slice(0, 5).map(match => ({ ...match, bookmarked: false })))
        setSource(payload.source)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'โหลด demo ไม่สำเร็จ')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg-deep)', color: 'var(--text-1)' }}>
      <header style={{
        height: 60,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '0 20px',
        borderBottom: '1px solid var(--hairline)',
        background: 'var(--bg-base)',
      }}>
        <Link href="/auth/login" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: 'var(--text-1)' }}>
          <span style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: 'linear-gradient(135deg, var(--green-500), var(--green-700))',
            color: '#062014',
            fontWeight: 800,
            fontSize: 12,
            display: 'grid',
            placeItems: 'center',
          }}>OQ</span>
          <span style={{ fontWeight: 700 }}>OverIQ Demo</span>
        </Link>
        <Link href="/auth/login?mode=register" style={{
          marginLeft: 'auto',
          height: 36,
          display: 'inline-flex',
          alignItems: 'center',
          padding: '0 14px',
          borderRadius: 8,
          background: 'var(--green-500)',
          color: '#062014',
          fontSize: 13,
          fontWeight: 700,
          textDecoration: 'none',
        }}>สมัครใช้งาน</Link>
      </header>

      <section style={{ maxWidth: 920, margin: '0 auto', padding: '28px 16px 48px' }}>
        <div style={{ marginBottom: 18 }}>
          <div className="chip green" style={{ marginBottom: 12 }}>LIVE DEMO · {source}</div>
          <h1 style={{ margin: 0, fontSize: 30, lineHeight: 1.15, letterSpacing: '-0.02em' }}>
            ตัวอย่าง dashboard แบบ read-only
          </h1>
          <p style={{ margin: '8px 0 0', color: 'var(--text-2)', fontSize: 14, lineHeight: 1.6 }}>
            ดูรูปแบบ AI Score และ signal จากข้อมูลสดบางส่วน ก่อนสมัครใช้งานจริง
          </p>
        </div>

        {error && (
          <div style={{ padding: '12px 14px', borderRadius: 8, border: '1px solid rgba(245,158,11,.25)', background: 'var(--amber-bg)', color: 'var(--amber)', fontSize: 13 }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ padding: '48px 0', color: 'var(--text-2)', fontSize: 13 }}>กำลังโหลด demo...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {matches.map((match, index) => (
              <LiveMatchCard
                key={match.id}
                match={match}
                index={index}
                onBookmark={() => {}}
                onOpenDetail={() => {}}
                readOnly
              />
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
