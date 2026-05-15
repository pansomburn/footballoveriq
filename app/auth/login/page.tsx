'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Mode = 'login' | 'register'

// ── ย้ายออกมาข้างนอก LoginPage เพื่อไม่ให้ re-create ทุก render ──
interface FormPanelProps {
  isMobile: boolean
  mode: Mode
  email: string; setEmail: (v: string) => void
  password: string; setPassword: (v: string) => void
  name: string; setName: (v: string) => void
  loading: boolean
  error: string | null
  success: string | null
  focusedField: string | null; setFocusedField: (v: string | null) => void
  onSubmit: (e: React.FormEvent) => void
  onGoogle: () => void
  onDemo: () => void
  onToggleMode: () => void
}

function FormPanel({
  isMobile, mode, email, setEmail, password, setPassword,
  name, setName, loading, error, success,
  focusedField, setFocusedField,
  onSubmit, onGoogle, onDemo, onToggleMode,
}: FormPanelProps) {
  const fieldBorder = (field: string) =>
    focusedField === field ? 'var(--green-500)' : 'var(--hairline)'

  const inputWrap = (field: string): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 10,
    height: 48, padding: '0 14px',
    background: 'var(--bg-elev-1)',
    border: `1px solid ${fieldBorder(field)}`,
    borderRadius: 10, transition: 'border-color .15s',
  })

  const inputStyle: React.CSSProperties = {
    flex: 1, background: 'transparent', border: 'none',
    outline: 'none', color: 'var(--text-1)',
    fontSize: 16, fontFamily: 'inherit',
  }

  return (
    <div style={{
      width: '100%',
      maxWidth: isMobile ? '100%' : 420,
      padding: isMobile ? '32px 24px' : '0 48px',
      display: 'flex', flexDirection: 'column',
      justifyContent: isMobile ? 'flex-start' : 'center',
    }}>
      {isMobile && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'linear-gradient(135deg, var(--green-500), var(--green-700))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#062014', fontWeight: 800, fontSize: 16,
            boxShadow: '0 0 0 1px rgba(46,212,111,0.4), 0 0 24px rgba(46,212,111,0.3)',
          }}>OQ</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-1)', letterSpacing: '-0.02em' }}>OverIQ</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Live Football Assistant</div>
          </div>
        </div>
      )}

      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 8 }}>
          {mode === 'login' ? 'SIGN IN' : 'SIGN UP'}
        </div>
        <h2 style={{ fontSize: isMobile ? 28 : 32, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-1)', margin: 0, lineHeight: 1.1 }}>
          {mode === 'login'
            ? <>{isMobile ? <>ยินดีต้อนรับ<br /><span style={{ color: 'var(--green-400)' }}>กลับมาอีกครั้ง</span></> : 'ยินดีต้อนรับกลับมา'}</>
            : 'สมัครสมาชิก'}
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '8px 0 0' }}>
          {mode === 'login'
            ? isMobile ? 'เข้าสู่ระบบเพื่อดู AI Score แบบ real-time' : 'เข้าสู่ระบบเพื่อดูผลบอลสด AI Score แบบ real-time'
            : 'ทดลองใช้ฟรี 7 วัน ไม่ต้องใส่บัตร'}
        </p>
      </div>

      {error && (
        <div style={{ background: 'var(--red-soft)', border: '1px solid rgba(239,72,86,.25)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, color: 'var(--red)', fontSize: 14 }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ background: 'var(--green-soft)', border: '1px solid rgba(46,212,111,.25)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, color: 'var(--green-300)', fontSize: 14 }}>
          {success}
        </div>
      )}

      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {mode === 'register' && (
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 7 }}>ชื่อที่แสดง</label>
            <div style={inputWrap('name')}>
              <span style={{ fontSize: 14, color: 'var(--text-3)', flexShrink: 0 }}>👤</span>
              <input
                value={name} onChange={e => setName(e.target.value)}
                required={mode === 'register'} placeholder="ชื่อของคุณ"
                onFocus={() => setFocusedField('name')}
                onBlur={() => setFocusedField(null)}
                style={inputStyle}
              />
            </div>
          </div>
        )}

        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 7 }}>Email</label>
          <div style={inputWrap('email')}>
            <span style={{ fontSize: 14, color: 'var(--text-3)', flexShrink: 0 }}>✉</span>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              required placeholder="khun.player@example.com"
              autoComplete="email"
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
              style={inputStyle}
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 7 }}>Password</label>
          <div style={inputWrap('password')}>
            <span style={{ fontSize: 14, color: 'var(--text-3)', flexShrink: 0 }}>🔒</span>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              required placeholder="••••••••"
              autoComplete="current-password"
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
              style={inputStyle}
            />
          </div>
        </div>

        {mode === 'login' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-2)', cursor: 'pointer' }}>
              <input type="checkbox" style={{ accentColor: 'var(--green-500)', width: 15, height: 15 }} />
              Remember me
            </label>
            <button type="button" style={{ fontSize: 13, color: 'var(--green-400)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
              ลืมรหัสผ่าน?
            </button>
          </div>
        )}

        <button type="submit" disabled={loading} style={{
          width: '100%', height: 52, borderRadius: 10, border: 'none',
          background: loading ? 'var(--green-600)' : 'var(--green-500)',
          color: '#062014', fontSize: 16, fontWeight: 700,
          cursor: loading ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit', letterSpacing: '-0.01em',
          boxShadow: loading ? 'none' : '0 0 0 1px rgba(46,212,111,0.3), 0 8px 24px -8px rgba(46,212,111,0.4)',
          transition: 'all .15s',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          {loading ? '⏳ กำลังโหลด...' : mode === 'login' ? 'เข้าสู่ระบบ →' : 'สมัครสมาชิก →'}
        </button>
      </form>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
        <div style={{ flex: 1, height: 1, background: 'var(--hairline)' }} />
        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>หรือ</span>
        <div style={{ flex: 1, height: 1, background: 'var(--hairline)' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
        <button onClick={onGoogle} style={{
          height: 48, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          background: 'var(--bg-elev-1)', border: '1px solid var(--hairline)',
          color: 'var(--text-1)', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
        }}>
          <span style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#4285f4', flexShrink: 0 }}>G</span>
          Google
        </button>
        <button style={{
          height: 48, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          background: 'var(--bg-elev-1)', border: '1px solid var(--hairline)',
          color: 'var(--text-1)', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
        }}>
          <span style={{ width: 16, height: 16, borderRadius: '50%', background: '#06c755', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#fff', flexShrink: 0 }}>L</span>
          LINE
        </button>
      </div>

      <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--text-3)', margin: '0 0 16px' }}>
        {mode === 'login' ? 'ยังไม่มีบัญชี? ' : 'มีบัญชีแล้ว? '}
        <button onClick={onToggleMode}
          style={{ color: 'var(--green-400)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14 }}>
          {mode === 'login' ? 'สมัครสมาชิก — ทดลองฟรี 7 วัน' : 'เข้าสู่ระบบ'}
        </button>
      </p>

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--green-soft)', border: '1px solid rgba(46,212,111,.25)',
        borderRadius: 10, padding: '12px 16px',
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--green-300)' }}>🎁 ทดลองใช้ฟรี 7 วัน</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>ไม่ต้องใส่บัตรเครดิต</div>
        </div>
        <button onClick={onDemo} style={{
          padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
          background: 'var(--green-500)', color: '#062014', border: 'none',
          cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
        }}>ดู Demo →</button>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────
export default function LoginPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [mode,         setMode]         = useState<Mode>('login')
  const [email,        setEmail]        = useState('')
  const [password,     setPassword]     = useState('')
  const [name,         setName]         = useState('')
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [success,      setSuccess]      = useState<string | null>(null)
  const [isMobile,     setIsMobile]     = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(null); setSuccess(null)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push('/dashboard/live')
      } else {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { display_name: name } },
        })
        if (error) throw error
        setSuccess('สมัครสำเร็จ! กรุณาตรวจสอบอีเมลเพื่อยืนยัน')
      }
    } catch (err: any) {
      const msg: Record<string, string> = {
        'Invalid login credentials': 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
        'Email not confirmed':       'กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ',
        'User already registered':   'อีเมลนี้ถูกใช้งานแล้ว',
      }
      setError(msg[err.message] ?? err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    })
  }

  const formProps: FormPanelProps = {
    isMobile, mode,
    email, setEmail,
    password, setPassword,
    name, setName,
    loading, error, success,
    focusedField, setFocusedField,
    onSubmit: handleSubmit,
    onGoogle: handleGoogle,
    onDemo: () => router.push('/dashboard/live'),
    onToggleMode: () => {
      setMode(m => m === 'login' ? 'register' : 'login')
      setError(null); setSuccess(null)
    },
  }

  if (isMobile) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-deep)', overflowY: 'auto' }}>
        <FormPanel {...formProps} />
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1.1fr 1fr', background: 'var(--bg-deep)' }}>
      <div style={{
        position: 'relative', overflow: 'hidden',
        background: 'radial-gradient(circle at 20% 30%, rgba(46,212,111,.15), transparent 50%), radial-gradient(circle at 80% 70%, rgba(46,212,111,.08), transparent 50%), var(--bg-base)',
        borderRight: '1px solid var(--hairline)',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        padding: 48,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, var(--green-500), var(--green-700))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#062014', fontWeight: 800, fontSize: 16, letterSpacing: '-0.04em', boxShadow: '0 0 0 1px rgba(46,212,111,0.4), 0 0 24px rgba(46,212,111,0.35)' }}>OQ</div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-1)' }}>OverIQ</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Live Football Betting Assistant</div>
          </div>
        </div>
        <div style={{ maxWidth: 480 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, background: 'var(--green-soft)', border: '1px solid rgba(46,212,111,.3)', marginBottom: 20 }}>
            <span className="dot live" />
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--green-300)', letterSpacing: '0.06em' }}>LIVE • 12 MATCHES NOW</span>
          </div>
          <h1 style={{ fontSize: 46, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.05, margin: '0 0 16px', color: 'var(--text-1)' }}>
            ดูทุกคู่ <span style={{ color: 'var(--green-400)' }}>ในตาเดียว</span><br />ไม่พลาดจังหวะทอง
          </h1>
          <p style={{ fontSize: 15, color: 'var(--text-2)', lineHeight: 1.6, margin: '0 0 28px' }}>
            AI ของเราดูบอลสด <span style={{ color: 'var(--text-1)' }}>ทุกคู่พร้อมกัน</span> คำนวณ Shots, xG,<br />Dangerous Attack, Odds flow แล้วจัดอันดับ — แจ้งเตือนทันทีเมื่อถึงจังหวะ
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 16, background: 'var(--bg-elev-1)', borderRadius: 14, border: '1px solid rgba(46,212,111,.3)', maxWidth: 400 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
              <span style={{ fontSize: 11, color: 'var(--green-300)', display: 'inline-flex', alignItems: 'center', gap: 5 }}><span className="dot live" /> 67' • Premier League</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>Man City 1 – 1 Arsenal</span>
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>SOG 9 • xG 1.8 vs 1.4 • Over 2.5 @ 1.85</span>
            </div>
            <div style={{ textAlign: 'center', flexShrink: 0 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 700, color: 'var(--green-400)', lineHeight: 1 }}>84</div>
              <div style={{ fontSize: 9, color: 'var(--text-3)', letterSpacing: '0.06em', marginTop: 3 }}>AI SCORE</div>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 28, fontSize: 11, color: 'var(--text-3)' }}>
          <span>⚡ Real-time signals</span>
          <span>🎯 Personalized alerts</span>
          <span>📊 12+ leagues covered</span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-deep)', overflowY: 'auto' }}>
        <FormPanel {...formProps} />
      </div>
    </div>
  )
}