'use client'
import { useState } from 'react'

type AdminTab = 'overview' | 'users' | 'subscriptions' | 'ai_config' | 'weights' | 'accuracy'

// ── Mock admin data ──────────────────────────────────────────────
const MOCK_USERS = [
  { id:'u1', email:'test@gmail.com',  name:'สมชาย ใจดี',   tier:'pro',   status:'active',   joined:'14 พ.ค. 2026', lastLogin:'วันนี้' },
  { id:'u2', email:'demo@outlook.com',name:'มานี รักไทย',  tier:'basic', status:'trial',    joined:'12 พ.ค. 2026', lastLogin:'เมื่อวาน' },
  { id:'u3', email:'bet@line.me',     name:'วิชัย สมาร์ท', tier:'free',  status:'inactive', joined:'10 พ.ค. 2026', lastLogin:'3 วันที่แล้ว' },
]

const MOCK_SUBS = [
  { id:'s1', user:'สมชาย ใจดี',  plan:'Pro',   billing:'monthly', amount:'฿399',  start:'1 พ.ค.',  end:'1 มิ.ย.',  status:'active'   },
  { id:'s2', user:'มานี รักไทย', plan:'Basic', billing:'weekly',  amount:'฿149',  start:'12 พ.ค.', end:'19 พ.ค.', status:'trial'    },
  { id:'s3', user:'ณัฐ ทดสอบ',   plan:'Pro',   billing:'monthly', amount:'฿399',  start:'5 เม.ย.', end:'5 พ.ค.',  status:'expired'  },
]

const MOCK_WEIGHTS = [
  { mode:'live',     factor:'shots_on_goal',   weight:25 },
  { mode:'live',     factor:'xg',              weight:20 },
  { mode:'live',     factor:'dangerous_attacks',weight:20 },
  { mode:'live',     factor:'odds_strength',   weight:20 },
  { mode:'live',     factor:'match_context',   weight:15 },
  { mode:'prematch', factor:'odds_movement',   weight:25 },
  { mode:'prematch', factor:'h2h',             weight:20 },
  { mode:'prematch', factor:'form',            weight:20 },
  { mode:'prematch', factor:'injuries',        weight:15 },
  { mode:'prematch', factor:'team_context',    weight:10 },
]

export default function AdminPage() {
  const [tab, setTab] = useState<AdminTab>('overview')

  return (
    <div className="min-h-screen flex flex-col" style={{ background:'var(--bg)' }}>

      {/* Topbar */}
      <header style={{ background:'var(--bg2)', borderBottom:'1px solid var(--border)', height:52 }}
        className="flex items-center px-5 gap-4 sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <div style={{ width:28, height:28, background:'var(--green)', borderRadius:6 }}
            className="flex items-center justify-center font-mono text-[11px] text-white font-medium">OQ</div>
          <span className="text-[15px] font-semibold" style={{ color:'var(--text)' }}>OverIQ</span>
        </div>
        <div style={{ width:1, height:20, background:'var(--border2)' }} />
        <span style={{ background:'var(--amber-bg)', color:'var(--amber)', border:'1px solid rgba(245,158,11,.3)', fontSize:11, fontWeight:600, padding:'3px 9px', borderRadius:999 }}>
          ADMIN
        </span>
        <a href="/dashboard/live" style={{ color:'var(--muted)', fontSize:13, textDecoration:'none', marginLeft:'auto' }}>← Dashboard</a>
      </header>

      <div className="flex flex-1" style={{ minHeight:'calc(100vh - 52px)' }}>

        {/* Sidebar */}
        <aside style={{ width:200, background:'var(--bg2)', borderRight:'1px solid var(--border)', padding:'16px 12px' }}>
          {([
            { key:'overview',      icon:'📊', label:'Overview' },
            { key:'users',         icon:'👥', label:'Users' },
            { key:'subscriptions', icon:'💳', label:'Subscriptions' },
            { key:'ai_config',     icon:'🤖', label:'AI Config' },
            { key:'weights',       icon:'⚖️', label:'Scoring Weights' },
            { key:'accuracy',      icon:'🎯', label:'Accuracy' },
          ] as { key: AdminTab; icon: string; label: string }[]).map(n => (
            <button key={n.key} onClick={() => setTab(n.key)}
              style={{
                background: tab === n.key ? 'var(--green-bg)' : 'transparent',
                color:      tab === n.key ? 'var(--green)'    : 'var(--muted)',
              }}
              className="flex items-center gap-[10px] w-full px-2 py-[8px] rounded-lg text-[13px] cursor-pointer border-none font-[inherit] transition-all mb-[2px]">
              <span>{n.icon}</span><span>{n.label}</span>
            </button>
          ))}
        </aside>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {tab === 'overview'      && <OverviewTab />}
          {tab === 'users'         && <UsersTab />}
          {tab === 'subscriptions' && <SubsTab />}
          {tab === 'ai_config'     && <AIConfigTab />}
          {tab === 'weights'       && <WeightsTab />}
          {tab === 'accuracy'      && <AccuracyTab />}
        </main>
      </div>
    </div>
  )
}

// ── Overview Tab ─────────────────────────────────────────────────
function OverviewTab() {
  const stats = [
    { label:'MRR',             val:'฿47,100',  sub:'↑ 12% vs เดือนที่แล้ว', color:'var(--green)' },
    { label:'Active Subs',     val:'118',      sub:'Pro 74 · Basic 44',      color:'var(--text)'  },
    { label:'Free Trial',      val:'31',       sub:'avg 4.2 วันที่ใช้',      color:'var(--amber)' },
    { label:'Churn Rate',      val:'8.2%',     sub:'เป้า < 15%',             color:'var(--text)'  },
    { label:'Trial → Paid',    val:'22%',      sub:'เป้า > 20%',             color:'var(--green)' },
    { label:'AI Cost/day',     val:'฿48',      sub:'~฿0.41/user/day',       color:'var(--text)'  },
  ]
  return (
    <div>
      <h2 className="text-[18px] font-semibold mb-5" style={{ color:'var(--text)' }}>Overview</h2>
      <div className="grid gap-3 mb-6" style={{ gridTemplateColumns:'repeat(3,1fr)' }}>
        {stats.map(s => (
          <div key={s.label} style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:12, padding:'16px 20px' }}>
            <div className="text-[11px] uppercase tracking-[.06em] mb-2" style={{ color:'var(--muted)' }}>{s.label}</div>
            <div className="font-mono text-[26px] font-medium mb-1" style={{ color:s.color, lineHeight:1 }}>{s.val}</div>
            <div className="text-[12px]" style={{ color:'var(--dim)' }}>{s.sub}</div>
          </div>
        ))}
      </div>
      <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:12, padding:'16px 20px' }}>
        <div className="text-[13px] font-semibold mb-3" style={{ color:'var(--text)' }}>📡 System Status</div>
        {[
          { name:'Football API (api-sports.io)', status:'✓ Online', quota:'847 / 1000 req/วัน', ok:true },
          { name:'Supabase Database',             status:'✓ Online', quota:'Response 42ms',       ok:true },
          { name:'Omise Payment',                 status:'✓ Online', quota:'Last charge 2h ago',  ok:true },
          { name:'LINE OA Webhook',               status:'✗ Not configured', quota:'',            ok:false },
        ].map(s => (
          <div key={s.name} className="flex items-center gap-4 py-[10px]" style={{ borderBottom:'1px solid var(--border)' }}>
            <span className="text-[13px] flex-1" style={{ color:'var(--text)' }}>{s.name}</span>
            <span className="text-[12px] font-medium" style={{ color: s.ok ? 'var(--green)' : 'var(--red)' }}>{s.status}</span>
            <span className="text-[12px]" style={{ color:'var(--dim)' }}>{s.quota}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Users Tab ────────────────────────────────────────────────────
function UsersTab() {
  const [search, setSearch] = useState('')
  const filtered = MOCK_USERS.filter(u =>
    `${u.email} ${u.name}`.toLowerCase().includes(search.toLowerCase())
  )
  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[18px] font-semibold" style={{ color:'var(--text)' }}>Users ({MOCK_USERS.length})</h2>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหา email หรือชื่อ..."
          style={{ background:'var(--bg3)', border:'1px solid var(--border2)', color:'var(--text)', borderRadius:8, height:36, padding:'0 12px', fontSize:13, outline:'none', width:240 }} />
      </div>
      <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
          <thead>
            <tr style={{ borderBottom:'1px solid var(--border)' }}>
              {['ชื่อ','Email','Tier','Status','สมัคร','Login ล่าสุด','Actions'].map(h => (
                <th key={h} style={{ padding:'10px 16px', textAlign:'left', color:'var(--muted)', fontWeight:500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id} style={{ borderBottom:'1px solid var(--border)' }}
                className="hover:bg-[var(--bg3)] transition-colors">
                <td style={{ padding:'12px 16px', color:'var(--text)', fontWeight:500 }}>{u.name}</td>
                <td style={{ padding:'12px 16px', color:'var(--muted)' }}>{u.email}</td>
                <td style={{ padding:'12px 16px' }}>
                  <span style={{
                    fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:999,
                    background: u.tier === 'pro' ? 'var(--green-bg)' : u.tier === 'basic' ? 'var(--blue-bg)' : 'var(--bg4)',
                    color:      u.tier === 'pro' ? 'var(--green)'    : u.tier === 'basic' ? 'var(--blue)'   : 'var(--dim)',
                  }}>{u.tier.toUpperCase()}</span>
                </td>
                <td style={{ padding:'12px 16px' }}>
                  <span style={{
                    fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:999,
                    background: u.status === 'active' ? 'var(--green-bg)' : u.status === 'trial' ? 'var(--amber-bg)' : 'var(--bg4)',
                    color:      u.status === 'active' ? 'var(--green)'    : u.status === 'trial' ? 'var(--amber)'    : 'var(--dim)',
                  }}>{u.status}</span>
                </td>
                <td style={{ padding:'12px 16px', color:'var(--muted)' }}>{u.joined}</td>
                <td style={{ padding:'12px 16px', color:'var(--muted)' }}>{u.lastLogin}</td>
                <td style={{ padding:'12px 16px' }}>
                  <button style={{ fontSize:12, color:'var(--green)', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit' }}>
                    แก้ไข
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Subscriptions Tab ────────────────────────────────────────────
function SubsTab() {
  return (
    <div>
      <h2 className="text-[18px] font-semibold mb-5" style={{ color:'var(--text)' }}>Subscriptions</h2>
      <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
          <thead>
            <tr style={{ borderBottom:'1px solid var(--border)' }}>
              {['User','Plan','Billing','Amount','Start','End','Status','Actions'].map(h => (
                <th key={h} style={{ padding:'10px 16px', textAlign:'left', color:'var(--muted)', fontWeight:500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MOCK_SUBS.map(s => (
              <tr key={s.id} style={{ borderBottom:'1px solid var(--border)' }}>
                <td style={{ padding:'12px 16px', color:'var(--text)', fontWeight:500 }}>{s.user}</td>
                <td style={{ padding:'12px 16px', color:'var(--text)' }}>{s.plan}</td>
                <td style={{ padding:'12px 16px', color:'var(--muted)' }}>{s.billing}</td>
                <td style={{ padding:'12px 16px', color:'var(--green)', fontFamily:'monospace' }}>{s.amount}</td>
                <td style={{ padding:'12px 16px', color:'var(--muted)' }}>{s.start}</td>
                <td style={{ padding:'12px 16px', color:'var(--muted)' }}>{s.end}</td>
                <td style={{ padding:'12px 16px' }}>
                  <span style={{
                    fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:999,
                    background: s.status === 'active' ? 'var(--green-bg)' : s.status === 'trial' ? 'var(--amber-bg)' : 'var(--red-bg)',
                    color:      s.status === 'active' ? 'var(--green)'    : s.status === 'trial' ? 'var(--amber)'    : 'var(--red)',
                  }}>{s.status}</span>
                </td>
                <td style={{ padding:'12px 16px', display:'flex', gap:8 }}>
                  <button style={{ fontSize:12, color:'var(--amber)', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit' }}>ต่ออายุ</button>
                  <button style={{ fontSize:12, color:'var(--red)', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit' }}>ยกเลิก</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── AI Config Tab ────────────────────────────────────────────────
function AIConfigTab() {
  const [livePrompt, setLivePrompt] = useState(
    'คุณเป็นนักวิเคราะห์บอลมืออาชีพที่พูดภาษาไทย วิเคราะห์บอลสดจากข้อมูลสถิติที่ให้มา ให้ insight 2-3 ประโยคที่ชัดเจน ตรงประเด็น ว่าทำไมคู่นี้น่าสนใจสำหรับ Over/BTTS หรือไม่'
  )
  const [prePrompt, setPrePrompt] = useState(
    'คุณเป็นนักวิเคราะห์บอลก่อนเกม วิเคราะห์จากข้อมูล H2H, ฟอร์มทีม, ราคา และ lineup สรุป 2-3 ประโยคว่าคู่นี้มีโอกาส Over 2.5 หรือ BTTS มากน้อยแค่ไหน และทำไม'
  )
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[18px] font-semibold" style={{ color:'var(--text)' }}>AI System Prompts</h2>
        <button onClick={handleSave}
          style={{ background:'var(--green)', color:'#fff', border:'none', borderRadius:8, height:36, padding:'0 20px', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
          {saved ? '✓ บันทึกแล้ว' : 'บันทึก'}
        </button>
      </div>
      <div className="text-[13px] mb-4 p-3 rounded-lg" style={{ background:'var(--green-bg)', color:'var(--green)', border:'1px solid rgba(0,166,81,.2)' }}>
        💡 แก้ไข prompt ได้เลยโดยไม่ต้อง deploy ใหม่ การเปลี่ยนแปลงจะมีผลทันที
      </div>
      {[
        { key:'live',     label:'Live In-play Insight', val:livePrompt, set:setLivePrompt },
        { key:'prematch', label:'Pre-match Insight',    val:prePrompt,  set:setPrePrompt  },
      ].map(p => (
        <div key={p.key} style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:12, marginBottom:16, overflow:'hidden' }}>
          <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <span className="text-[13px] font-semibold" style={{ color:'var(--text)' }}>🤖 {p.label}</span>
            <span style={{ fontSize:11, color:'var(--dim)' }}>max_tokens: 300</span>
          </div>
          <div style={{ padding:16 }}>
            <textarea value={p.val} onChange={e => p.set(e.target.value)} rows={5}
              style={{ width:'100%', background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:8, color:'var(--text)', fontFamily:'inherit', fontSize:13, padding:'12px 14px', outline:'none', resize:'vertical', lineHeight:1.7 }} />
            <div className="flex items-center justify-between mt-2">
              <span style={{ fontSize:12, color:'var(--dim)' }}>{p.val.length} chars</span>
              <span style={{ fontSize:12, color:'var(--muted)' }}>≈ {Math.round(p.val.length/4)} input tokens</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Scoring Weights Tab ───────────────────────────────────────────
function WeightsTab() {
  const [weights, setWeights] = useState(MOCK_WEIGHTS)
  const [saved, setSaved] = useState(false)

  const update = (mode: string, factor: string, val: number) => {
    setWeights(ws => ws.map(w => w.mode === mode && w.factor === factor ? { ...w, weight: val } : w))
  }

  const totalLive = weights.filter(w => w.mode === 'live').reduce((s, w) => s + w.weight, 0)
  const totalPre  = weights.filter(w => w.mode === 'prematch').reduce((s, w) => s + w.weight, 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[18px] font-semibold" style={{ color:'var(--text)' }}>Scoring Weights</h2>
        <button onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000) }}
          style={{ background:'var(--green)', color:'#fff', border:'none', borderRadius:8, height:36, padding:'0 20px', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
          {saved ? '✓ บันทึกแล้ว' : 'บันทึก'}
        </button>
      </div>
      {[
        { mode:'live',     label:'Live In-play', total:totalLive },
        { mode:'prematch', label:'Pre-match',    total:totalPre  },
      ].map(g => (
        <div key={g.mode} style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:12, marginBottom:16, overflow:'hidden' }}>
          <div style={{ padding:'12px 18px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <span className="text-[13px] font-semibold" style={{ color:'var(--text)' }}>{g.label}</span>
            <span style={{ fontSize:12, color: g.total === 100 ? 'var(--green)' : 'var(--red)', fontWeight:600 }}>
              รวม: {g.total} / 100 {g.total !== 100 && '⚠️ ต้องรวมเป็น 100'}
            </span>
          </div>
          <div style={{ padding:16 }}>
            {weights.filter(w => w.mode === g.mode).map(w => (
              <div key={w.factor} className="flex items-center gap-4 mb-3">
                <span style={{ color:'var(--text)', fontSize:13, minWidth:160 }}>
                  {w.factor.replace(/_/g, ' ')}
                </span>
                <input type="range" min={0} max={50} value={w.weight}
                  onChange={e => update(w.mode, w.factor, Number(e.target.value))}
                  style={{ flex:1, accentColor:'var(--green)' }} />
                <span style={{ fontFamily:'monospace', fontSize:13, color:'var(--green)', minWidth:40, textAlign:'right', fontWeight:600 }}>
                  {w.weight}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Accuracy Tab ─────────────────────────────────────────────────
function AccuracyTab() {
  const data = [
    { date:'13 พ.ค.', total:18, hot:5, hotCorrect:4, watch:8, watchCorrect:5 },
    { date:'12 พ.ค.', total:22, hot:6, hotCorrect:5, watch:9, watchCorrect:6 },
    { date:'11 พ.ค.', total:20, hot:4, hotCorrect:3, watch:10, watchCorrect:7 },
    { date:'10 พ.ค.', total:16, hot:5, hotCorrect:4, watch:7, watchCorrect:4 },
    { date:'9 พ.ค.',  total:24, hot:7, hotCorrect:6, watch:11, watchCorrect:7 },
  ]
  return (
    <div>
      <h2 className="text-[18px] font-semibold mb-5" style={{ color:'var(--text)' }}>Prediction Accuracy</h2>
      <div className="grid gap-3 mb-6" style={{ gridTemplateColumns:'repeat(3,1fr)' }}>
        {[
          { label:'HOT Accuracy (7 วัน)', val:'80%', sub:'22/27 คู่ที่ระบุ HOT ผล Over จริง' },
          { label:'WATCH Accuracy (7 วัน)', val:'61%', sub:'31/51 คู่', },
          { label:'Total Matches Tracked', val:'142', sub:'ตั้งแต่ launch', },
        ].map(s => (
          <div key={s.label} style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:12, padding:'16px 20px' }}>
            <div className="text-[11px] uppercase tracking-[.06em] mb-2" style={{ color:'var(--muted)' }}>{s.label}</div>
            <div className="font-mono text-[26px] font-medium mb-1" style={{ color:'var(--green)', lineHeight:1 }}>{s.val}</div>
            <div className="text-[12px]" style={{ color:'var(--dim)' }}>{s.sub}</div>
          </div>
        ))}
      </div>
      <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
          <thead>
            <tr style={{ borderBottom:'1px solid var(--border)' }}>
              {['วันที่','คู่ทั้งหมด','HOT','HOT ถูก','HOT %','WATCH','WATCH ถูก','WATCH %'].map(h => (
                <th key={h} style={{ padding:'10px 16px', textAlign:'left', color:'var(--muted)', fontWeight:500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map(d => (
              <tr key={d.date} style={{ borderBottom:'1px solid var(--border)' }}>
                <td style={{ padding:'11px 16px', color:'var(--text)' }}>{d.date}</td>
                <td style={{ padding:'11px 16px', color:'var(--muted)' }}>{d.total}</td>
                <td style={{ padding:'11px 16px', color:'var(--text)' }}>{d.hot}</td>
                <td style={{ padding:'11px 16px', color:'var(--green)' }}>{d.hotCorrect}</td>
                <td style={{ padding:'11px 16px', color:'var(--green)', fontWeight:600 }}>
                  {Math.round(d.hotCorrect/d.hot*100)}%
                </td>
                <td style={{ padding:'11px 16px', color:'var(--text)' }}>{d.watch}</td>
                <td style={{ padding:'11px 16px', color:'var(--amber)' }}>{d.watchCorrect}</td>
                <td style={{ padding:'11px 16px', color:'var(--amber)', fontWeight:600 }}>
                  {Math.round(d.watchCorrect/d.watch*100)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
