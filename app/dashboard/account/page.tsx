'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Topbar } from '@/components/layout/Topbar'
import { createClient } from '@/lib/supabase'

function PlanCard({ name, price, period, features, cta, highlight, current, disabled }: {
  name: string; price: string; period: string; features: string[];
  cta: string; highlight?: boolean; current?: boolean; disabled?: boolean;
}) {
  return (
    <div style={{
      padding: 18, borderRadius: 14, position: 'relative',
      background: highlight ? 'linear-gradient(160deg, rgba(46,212,111,.10), rgba(46,212,111,.02))' : 'var(--bg-deep)',
      border: '1px solid ' + (highlight ? 'rgba(46,212,111,.4)' : 'var(--hairline)'),
    }}>
      {highlight && (
        <div style={{ position: 'absolute', top: -10, left: 14, padding: '3px 8px', background: 'var(--green-500)', color: '#062014', fontSize: 10, fontWeight: 700, borderRadius: 999, letterSpacing: '0.04em' }}>
          POPULAR
        </div>
      )}
      <div style={{ fontSize: 13, fontWeight: 600, color: highlight ? 'var(--green-300)' : 'var(--text-2)', letterSpacing: '0.04em', marginBottom: 6 }}>{name}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 14 }}>
        <span style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text-1)' }}>{price}</span>
        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{period}</span>
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {features.map((f, i) => (
          <li key={i} style={{ fontSize: 12, color: 'var(--text-2)', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
            <span style={{ color: 'var(--green-400)', flexShrink: 0 }}>✓</span>{f}
          </li>
        ))}
      </ul>
      <button style={{
        width: '100%', padding: '8px 0', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
        background: highlight ? 'var(--green-500)' : 'var(--bg-elev-2)',
        color: highlight ? '#062014' : 'var(--text-1)',
        border: '1px solid ' + (highlight ? 'var(--green-500)' : 'var(--hairline)'),
        opacity: disabled || current ? 0.5 : 1,
        pointerEvents: disabled || current ? 'none' : 'auto',
      } as any}>{cta}</button>
    </div>
  )
}

export default function AccountPage() {
  const router = useRouter()
  const [isMobile, setIsMobile] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const handleLogout = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/auth/login')
    } catch (err) {
      console.error('Logout error:', err)
      router.push('/auth/login')
    }
  }

  // ── Mobile layout ──────────────────────────────────────────────
  if (isMobile) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-deep)', display: 'flex', flexDirection: 'column' }}>
        <Topbar />
        <div style={{ padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Profile card */}
          <div style={{ padding: 18, background: 'var(--bg-elev-1)', borderRadius: 16, border: '1px solid var(--hairline)', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, var(--green-500), var(--green-700))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: '#062014', flexShrink: 0 }}>KP</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-1)' }}>Khun Player</div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 999, background: 'var(--green-soft)', border: '1px solid rgba(46,212,111,.3)', color: 'var(--green-300)', fontSize: 11, fontWeight: 600, marginTop: 4 }}>⚡ PRO</span>
            </div>
          </div>

          {/* Stats */}
          <div style={{ padding: 18, background: 'linear-gradient(135deg, rgba(46,212,111,.10), rgba(46,212,111,.02))', border: '1px solid rgba(46,212,111,.3)', borderRadius: 14 }}>
            <div style={{ fontSize: 11, color: 'var(--green-300)', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 10, textTransform: 'uppercase' }}>YOUR STATS • 30D</div>
            {[
              { label: 'Alerts received',     value: '312' },
              { label: 'Avg AI Score followed', value: '78' },
              { label: 'Suggested winrate',   value: '64%', highlight: true },
            ].map(r => (
              <div key={r.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--hairline)' }}>
                <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{r.label}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 600, color: r.highlight ? 'var(--green-400)' : 'var(--text-1)' }}>{r.value}</span>
              </div>
            ))}
          </div>

          {/* Subscription */}
          <div style={{ padding: 18, background: 'var(--bg-elev-1)', borderRadius: 14, border: '1px solid var(--hairline)' }}>
            <div style={{ fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.08em', fontWeight: 600, textTransform: 'uppercase', marginBottom: 12 }}>SUBSCRIPTION</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)' }}>Pro Plan</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 600, color: 'var(--text-1)' }}>฿349/mo</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 14 }}>Next charge Dec 15</div>
            <button style={{ width: '100%', padding: '9px 0', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: 'transparent', color: 'var(--text-1)', border: '1px solid var(--hairline)' }}>
              Upgrade to Elite
            </button>
          </div>

          {/* Menu items */}
          <div style={{ background: 'var(--bg-elev-1)', borderRadius: 14, border: '1px solid var(--hairline)', overflow: 'hidden' }}>
            {[
              { label: 'Notification preferences', icon: '🔔' },
              { label: 'Connected accounts',       icon: '🔗' },
              { label: 'Data & privacy',           icon: '🔒' },
              { label: 'Help center',              icon: '❓' },
            ].map((item, i) => (
              <div key={item.label} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 16px', cursor: 'pointer',
                borderBottom: '1px solid var(--hairline)',
              }}>
                <span>{item.icon}</span>
                <span style={{ fontSize: 14, color: 'var(--text-1)', flex: 1 }}>{item.label}</span>
                <span style={{ color: 'var(--text-3)', fontSize: 16 }}>›</span>
              </div>
            ))}

            {/* Logout */}
            <button
              onClick={handleLogout}
              disabled={loading}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 16px', width: '100%', cursor: 'pointer',
                background: 'none', border: 'none', textAlign: 'left',
              }}>
              <span>🚪</span>
              <span style={{ fontSize: 14, color: 'var(--red)', fontWeight: 500 }}>
                {loading ? 'กำลังออก...' : 'Logout'}
              </span>
              <span style={{ color: 'var(--text-3)', fontSize: 16, marginLeft: 'auto' }}>›</span>
            </button>
          </div>

        </div>
      </div>
    )
  }

  // ── Desktop layout ─────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-deep)', display: 'flex', flexDirection: 'column' }}>
      <Topbar />
      <div style={{ padding: '24px 28px', maxWidth: 1080, margin: '0 auto', width: '100%' }}>
        <h2 style={{ fontSize: 26, fontWeight: 700, margin: '0 0 22px', letterSpacing: '-0.02em', color: 'var(--text-1)' }}>
          Account & Subscription
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Profile */}
            <div style={{ padding: 22, background: 'var(--bg-elev-1)', borderRadius: 16, border: '1px solid var(--hairline)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 56, height: 56, borderRadius: 14, background: 'linear-gradient(135deg, var(--green-500), var(--green-700))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#062014' }}>KP</div>
                <div>
                  <div style={{ fontSize: 19, fontWeight: 600, color: 'var(--text-1)' }}>Khun Player</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)' }}>khun.player@example.com • Member since Jan 2026</div>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                  <button style={{ padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: 'var(--bg-elev-2)', color: 'var(--text-1)', border: '1px solid var(--hairline)' }}>
                    Edit profile
                  </button>
                  <button
                    onClick={handleLogout}
                    disabled={loading}
                    style={{ padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: 'var(--red-soft)', color: 'var(--red)', border: '1px solid rgba(239,72,86,.25)' }}>
                    {loading ? 'กำลังออก...' : 'Logout'}
                  </button>
                </div>
              </div>
            </div>

            {/* Plans */}
            <div style={{ padding: 22, background: 'var(--bg-elev-1)', borderRadius: 16, border: '1px solid var(--hairline)' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-1)' }}>Choose your plan</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)' }}>เริ่มฟรี 7 วัน • ยกเลิกได้ทุกเมื่อ</div>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, padding: 3, background: 'var(--bg-deep)', borderRadius: 999, border: '1px solid var(--hairline)' }}>
                  <button style={{ padding: '5px 12px', borderRadius: 999, fontSize: 12, background: 'var(--green-500)', color: '#062014', fontWeight: 600, border: 'none', cursor: 'pointer' }}>Monthly</button>
                  <button style={{ padding: '5px 12px', borderRadius: 999, fontSize: 12, color: 'var(--text-2)', background: 'none', border: 'none', cursor: 'pointer' }}>Weekly</button>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <PlanCard name="Basic" price="฿0" period="forever" features={['Top 3 matches/day','AI Score (limited)','1 alert at a time','Web only']} cta="Current" disabled />
                <PlanCard name="Pro" price="฿349" period="/ month" highlight features={['Unlimited matches','Full AI Score + breakdown','Unlimited alerts','Pre-match AI analysis','Mobile push + LINE','Historical winrate data']} cta="Current plan" current />
                <PlanCard name="Elite" price="฿899" period="/ month" features={['Everything in Pro','Custom AI system prompts','Asian handicap + Corners (new)','Multi-account portfolio','Priority data feed (<2s)','API access']} cta="Upgrade →" />
              </div>
            </div>

            {/* Usage */}
            <div style={{ padding: 22, background: 'var(--bg-elev-1)', borderRadius: 16, border: '1px solid var(--hairline)' }}>
              <div style={{ fontSize: 12, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>AI Usage • this month</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {[
                  { label: 'Pre-match analyses', value: '84',   max: '∞',    ratio: null },
                  { label: 'Alerts received',    value: '312',  max: '∞',    ratio: null },
                  { label: 'AI tokens',          value: '148K', max: '500K', ratio: 0.296 },
                ].map(s => (
                  <div key={s.label} style={{ padding: 14, background: 'var(--bg-deep)', borderRadius: 10, border: '1px solid var(--hairline)' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 6 }}>{s.label}</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 8 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, color: 'var(--text-1)' }}>{s.value}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-3)' }}>/ {s.max}</span>
                    </div>
                    {s.ratio != null && (
                      <div style={{ height: 4, background: 'var(--bg-base)', borderRadius: 999, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${s.ratio * 100}%`, background: 'var(--green-500)', borderRadius: 999 }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right column */}
          <aside style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ padding: 18, background: 'linear-gradient(135deg, rgba(46,212,111,.10), rgba(46,212,111,.02))', border: '1px solid rgba(46,212,111,.3)', borderRadius: 14 }}>
              <div style={{ fontSize: 11, color: 'var(--green-300)', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase' }}>YOUR STATS</div>
              <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 14 }}>30 วันล่าสุด</div>
              {[
                { label: 'Alerts received',       value: '312' },
                { label: 'Avg AI Score followed', value: '78' },
                { label: 'Suggested winrate*',    value: '64%', highlight: true },
              ].map(r => (
                <div key={r.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--hairline)' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{r.label}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600, color: r.highlight ? 'var(--green-400)' : 'var(--text-1)' }}>{r.value}</span>
                </div>
              ))}
              <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 10, lineHeight: 1.4 }}>*จาก feedback ที่คุณรายงานกลับ — ผลลัพธ์อาจต่างจากความเป็นจริง</div>
            </div>

            <div style={{ padding: 18, background: 'var(--bg-elev-1)', borderRadius: 14, border: '1px solid var(--hairline)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.08em', fontWeight: 600, textTransform: 'uppercase', marginBottom: 14 }}>Payment method</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: 'var(--bg-deep)', borderRadius: 10, border: '1px solid var(--hairline)' }}>
                <div style={{ width: 36, height: 24, borderRadius: 4, background: 'linear-gradient(135deg, #1a1f71, #f7b600)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 9, fontWeight: 700 }}>VISA</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-1)' }}>•••• 4242</div>
                  <div style={{ fontSize: 10, color: 'var(--text-3)' }}>Next charge Dec 15</div>
                </div>
              </div>
              <button style={{ width: '100%', marginTop: 10, padding: '8px 0', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: 'var(--bg-elev-2)', color: 'var(--text-1)', border: '1px solid var(--hairline)' }}>
                Change payment method
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}