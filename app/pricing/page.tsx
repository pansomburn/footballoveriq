'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type Billing = 'weekly' | 'monthly'

const PLANS = {
  weekly: [
    { key:'free',         name:'Free',  price:0,   unit:'ตลอดไป',      btn:'เริ่มใช้ฟรี',         btnStyle:'outline', featured:false },
    { key:'basic_weekly', name:'Basic', price:149,  unit:'/สัปดาห์',   btn:'ทดลองฟรี 7 วัน',     btnStyle:'outline', featured:false },
    { key:'pro_weekly',   name:'Pro',   price:249,  unit:'/สัปดาห์',   btn:'ทดลองฟรี 7 วัน',     btnStyle:'green',   featured:true  },
  ],
  monthly: [
    { key:'free',          name:'Free',  price:0,    unit:'ตลอดไป',     btn:'เริ่มใช้ฟรี',         btnStyle:'outline', featured:false },
    { key:'basic_monthly', name:'Basic', price:199,  unit:'/เดือน',     btn:'ทดลองฟรี 7 วัน',     btnStyle:'outline', featured:false },
    { key:'pro_monthly',   name:'Pro',   price:399,  unit:'/เดือน',     btn:'ทดลองฟรี 7 วัน',     btnStyle:'green',   featured:true  },
  ],
}

const FEATURES: Record<string, string[][]> = {
  free:  [['Live In-play','3 คู่/วัน'],['Pre-match','3 คู่/วัน'],['AI Insight','✗'],['Notification','✗'],['Bookmark','✗']],
  basic: [['Live In-play','5 คู่/วัน'],['Pre-match','ครบทุกคู่'],['AI Insight','✓'],['Notification','✗'],['Bookmark','3 คู่']],
  pro:   [['Live In-play','ไม่จำกัด'], ['Pre-match','ครบทุกคู่'],['AI Insight','เต็ม+breakdown'],['Notification','Push+LINE'],['Bookmark','ไม่จำกัด']],
}

export default function PricingPage() {
  const router  = useRouter()
  const [billing, setBilling]   = useState<Billing>('monthly')
  const [loading, setLoading]   = useState<string|null>(null)
  const [error,   setError]     = useState<string|null>(null)

  // Load Omise.js
  useEffect(() => {
    const s = document.createElement('script')
    s.src = 'https://cdn.omise.co/omise.js'
    s.async = true
    document.head.appendChild(s)
    return () => { document.head.removeChild(s) }
  }, [])

  async function handleSelect(planKey: string) {
    if (planKey === 'free') { router.push('/dashboard/live'); return }
    setError(null)
    setLoading(planKey)

    try {
      const OmiseCard = (window as any).OmiseCard
      if (!OmiseCard) throw new Error('Payment system not loaded yet')

      const pubKey = process.env.NEXT_PUBLIC_OMISE_PUBLIC_KEY ?? 'pkey_test_placeholder'

      OmiseCard.configure({ publicKey: pubKey })
      OmiseCard.open({
        frameLabel:  'OverIQ',
        submitLabel: 'ชำระเงิน',
        currency:    'THB',
        amount:      PLANS[billing].find(p => p.key === planKey)?.price ?? 0 * 100,
        onCreateTokenSuccess: async (nonce: string) => {
          const res = await fetch('/api/payment/charge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: nonce, planKey }),
          })
          const data = await res.json()
          if (!res.ok) throw new Error(data.error)
          router.push('/dashboard/live?subscribed=1')
        },
        onFormClosed: () => setLoading(null),
      })
    } catch (err: any) {
      setError(err.message)
      setLoading(null)
    }
  }

  const plans = PLANS[billing]

  return (
    <div className="min-h-screen" style={{ background:'var(--bg)' }}>

      {/* Topbar */}
      <header style={{ background:'var(--bg2)', borderBottom:'1px solid var(--border)', height:52 }}
        className="flex items-center px-6 gap-4">
        <div className="flex items-center gap-2">
          <div style={{ width:28, height:28, background:'var(--green)', borderRadius:6 }}
            className="flex items-center justify-center font-mono text-[11px] text-white font-medium">OQ</div>
          <span className="text-[15px] font-semibold" style={{ color:'var(--text)' }}>OverIQ</span>
        </div>
        <button onClick={() => router.push('/dashboard/live')}
          style={{ color:'var(--muted)', background:'none', border:'none', fontSize:13 }}
          className="ml-auto cursor-pointer font-[inherit]">← กลับ Dashboard</button>
      </header>

      <div className="max-w-[900px] mx-auto px-6 py-12">

        {/* Hero */}
        <div className="text-center mb-10">
          <div className="text-[11px] font-semibold uppercase tracking-[.12em] mb-3" style={{ color:'var(--green)' }}>Pricing</div>
          <h1 className="text-[36px] font-semibold tracking-tight mb-3" style={{ color:'var(--text)', lineHeight:1.15 }}>
            เลือกแผนที่ใช่<br /><span style={{ color:'var(--green)' }}>สำหรับคุณ</span>
          </h1>
          <p className="text-[15px] max-w-[460px] mx-auto mb-6" style={{ color:'var(--muted)', lineHeight:1.7 }}>
            ทดลองใช้ฟรี 7 วันก่อน ไม่ต้องใส่บัตรเครดิต ยกเลิกได้ทุกเมื่อ
          </p>

          {/* Billing toggle */}
          <div style={{ background:'var(--bg3)', borderRadius:10, padding:4, border:'1px solid var(--border2)', display:'inline-flex', gap:2 }}>
            {(['weekly','monthly'] as Billing[]).map(b => (
              <button key={b} onClick={() => setBilling(b)}
                style={{
                  padding:'7px 20px', borderRadius:8, border:'none', cursor:'pointer',
                  fontFamily:'inherit', fontSize:13, fontWeight:500, transition:'all .15s',
                  background: billing === b ? 'var(--bg)'  : 'transparent',
                  color:      billing === b ? 'var(--text)' : 'var(--muted)',
                  boxShadow:  billing === b ? '0 1px 4px rgba(0,0,0,.3)' : 'none',
                }}
                className="flex items-center gap-[6px]">
                {b === 'weekly' ? 'รายสัปดาห์' : (
                  <><span>รายเดือน</span>
                  <span style={{ background:'rgba(0,166,81,.15)', color:'var(--green)', fontSize:11, fontWeight:600, padding:'2px 7px', borderRadius:999 }}>ประหยัดกว่า</span>
                  </>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Trial banner */}
        <div style={{ background:'linear-gradient(135deg,rgba(0,166,81,.12) 0%,rgba(0,166,81,.04) 100%)', border:'1px solid rgba(0,166,81,.2)', borderRadius:14, padding:'18px 24px', marginBottom:32 }}
          className="flex items-center gap-5 flex-wrap">
          <div className="text-[28px]">🎁</div>
          <div className="flex-1">
            <div className="text-[15px] font-semibold mb-1" style={{ color:'var(--text)' }}>ทดลองใช้ฟรี 7 วัน — Early Access Pricing</div>
            <div className="text-[13px]" style={{ color:'var(--muted)' }}>เข้าถึงฟีเจอร์ Pro ครบทุกอย่าง ราคา Early Access จะขึ้นหลังครบ 3 เดือน สมาชิกเก่าได้ราคาเดิมตลอด</div>
          </div>
          <button onClick={() => handleSelect('pro_monthly')}
            style={{ background:'var(--green)', color:'#fff', borderRadius:10, height:42, padding:'0 24px', border:'none', fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }}>
            เริ่มทดลองฟรี →
          </button>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background:'var(--red-bg)', border:'1px solid rgba(239,68,68,.2)', borderRadius:8, padding:'10px 14px', marginBottom:16, color:'var(--red)', fontSize:13 }}>
            ❌ {error}
          </div>
        )}

        {/* Plan cards */}
        <div className="grid gap-4 mb-10" style={{ gridTemplateColumns:'repeat(3,1fr)' }}>
          {plans.map(p => {
            const feats = FEATURES[p.key.split('_')[0]]
            const isLoading = loading === p.key
            return (
              <div key={p.key}
                style={{
                  background:  p.featured ? 'linear-gradient(160deg,rgba(0,166,81,.06) 0%,var(--bg2) 60%)' : 'var(--bg2)',
                  border:      p.featured ? '2px solid var(--green)' : '1px solid var(--border)',
                  borderRadius:16, padding:'28px 24px', display:'flex', flexDirection:'column',
                  position:'relative',
                }}>
                {p.featured && (
                  <div style={{ position:'absolute', top:-12, left:'50%', transform:'translateX(-50%)', background:'var(--green)', color:'#fff', fontSize:11, fontWeight:600, padding:'4px 14px', borderRadius:999, whiteSpace:'nowrap' }}>
                    ⭐ แนะนำ
                  </div>
                )}
                <div className="text-[12px] font-semibold uppercase tracking-[.08em] mb-3" style={{ color:'var(--muted)' }}>{p.name}</div>
                <div className="flex items-end gap-1 mb-1">
                  {p.price > 0 && <span className="text-[16px]" style={{ color:'var(--muted)', marginBottom:6 }}>฿</span>}
                  <span className="font-mono font-medium" style={{ fontSize:36, color:'var(--text)', lineHeight:1 }}>
                    {p.price === 0 ? 'ฟรี' : p.price}
                  </span>
                </div>
                <div className="text-[12px] mb-5" style={{ color:'var(--dim)' }}>{p.unit}</div>
                <div style={{ height:1, background:'var(--border)', marginBottom:20 }} />
                <div className="flex flex-col gap-[10px] flex-1 mb-6">
                  {feats.map(([name, val]) => (
                    <div key={name} className="flex items-start gap-[9px] text-[13px]">
                      <span style={{ color: val === '✗' ? 'var(--dim)' : 'var(--green)', fontSize:13, marginTop:1 }}>
                        {val === '✗' ? '—' : '✓'}
                      </span>
                      <span style={{ color: val === '✗' ? 'var(--dim)' : 'var(--text)' }}>
                        {name} {val !== '✓' && val !== '✗' ? <span style={{ color:'var(--muted)', fontSize:12 }}>({val})</span> : ''}
                      </span>
                    </div>
                  ))}
                </div>
                <button onClick={() => handleSelect(p.key)} disabled={isLoading}
                  style={{
                    width:'100%', height:46, borderRadius:10,
                    border: p.btnStyle !== 'green' ? '1px solid var(--border2)' : 'none',
                    fontFamily:'inherit', fontSize:14, fontWeight:600,
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    background: p.btnStyle === 'green' ? 'var(--green)' : 'transparent',
                    color: p.btnStyle === 'green' ? '#fff' : 'var(--text)',
                    opacity: isLoading ? .7 : 1,
                  }}>
                  {isLoading ? '⏳ กำลังโหลด...' : p.btn}
                </button>
              </div>
            )
          })}
        </div>

        {/* Payment methods */}
        <div className="text-center mb-4 text-[13px]" style={{ color:'var(--muted)' }}>ชำระเงินได้ผ่าน</div>
        <div className="flex justify-center gap-3 flex-wrap mb-10">
          {['💳 บัตรเครดิต/เดบิต','📱 PromptPay','🏦 โอนธนาคาร','🔒 ปลอดภัย SSL'].map(m => (
            <div key={m} style={{ background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:8, padding:'8px 18px', fontSize:12, color:'var(--muted)' }}>
              {m}
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div>
          <div className="text-[15px] font-semibold mb-4 flex items-center gap-2" style={{ color:'var(--text)' }}>❓ คำถามที่พบบ่อย</div>
          {[
            ['ต้องใส่บัตรเครดิตตอนทดลองใช้ไหม?','ไม่ต้องครับ ทดลองใช้ 7 วันฟรีโดยไม่ต้องผูกบัตร เมื่อครบ 7 วันระบบจะถามว่าอยากต่อไหม'],
            ['ยกเลิก subscription ได้เมื่อไหร่?','ยกเลิกได้ตลอดเวลาในหน้าตั้งค่า ใช้งานต่อได้จนครบรอบบิลที่จ่ายไป'],
            ['ราคา Early Access จะขึ้นเมื่อไหร่?','จะปรับราคาหลังครบ 3 เดือน สมาชิกที่สมัครก่อนได้ราคาเดิมตลอด (Grandfather pricing)'],
            ['รองรับ LINE Notification จริงไหม?','รองรับครับ แผน Pro จะได้รับแจ้งเตือนผ่าน LINE OA เพียง Follow แล้วเชื่อมในหน้าตั้งค่า'],
          ].map(([q, a]) => (
            <FaqItem key={q} q={q} a={a} />
          ))}
        </div>
      </div>
    </div>
  )
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderBottom:'1px solid var(--border)' }}>
      <button onClick={() => setOpen(v => !v)}
        style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 0', background:'none', border:'none', color:'var(--text)', fontFamily:'inherit', fontSize:14, fontWeight:500, cursor:'pointer', gap:12, textAlign:'left' }}>
        {q}
        <span style={{ color:'var(--dim)', fontSize:16, flexShrink:0, transition:'transform .25s', transform: open ? 'rotate(180deg)' : 'none' }}>▾</span>
      </button>
      {open && <div style={{ fontSize:13, color:'var(--muted)', lineHeight:1.75, paddingBottom:16 }}>{a}</div>}
    </div>
  )
}
