import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Sparkles, Plus, Trash2, Check, ArrowLeft, ArrowRight, Receipt, UserCog, ClipboardCheck, Layers } from 'lucide-react'
import { useApp, useAction } from '../context/AppContext'
import { api } from '../api/client'
import { Card, Button, PageHeader, Input, Select, Field, Textarea, Badge, AIBadge, inr, cx } from '../components/ui'

const STEPS = [['Profile', Building2], ['Structure', Layers], ['Billing', Receipt], ['First admin', UserCog], ['Review', ClipboardCheck]]
const BASIS = [{ value: 'per_sqft', label: 'Per sq.ft' }, { value: 'fixed', label: 'Fixed' }, { value: 'per_parking', label: 'Per parking slot' }]

function Rows({ rows, setRows, cols, blank }) {
  return (
    <div className="space-y-2">
      <div className="hidden gap-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:grid" style={{ gridTemplateColumns: `${cols.map((c) => c.w || '1fr').join(' ')} 36px` }}>
        {cols.map((c) => <span key={c.k}>{c.label}</span>)}<span />
      </div>
      {rows.map((r, i) => (
        <div key={i} className="grid gap-2 sm:items-center" style={{ gridTemplateColumns: `${cols.map((c) => c.w || '1fr').join(' ')} 36px` }}>
          {cols.map((c) => c.options
            ? <Select key={c.k} value={r[c.k]} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, [c.k]: e.target.value } : x)))} options={c.options} />
            : <Input key={c.k} type={c.type} value={r[c.k]} placeholder={c.label} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, [c.k]: e.target.value } : x)))} />)}
          <button onClick={() => setRows(rows.filter((_, j) => j !== i))} className="grid size-9 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Remove"><Trash2 className="size-4" /></button>
        </div>
      ))}
      <Button size="sm" variant="ghost" icon={Plus} onClick={() => setRows([...rows, blank])}>Add row</Button>
    </div>
  )
}

export default function OnboardSociety() {
  const navigate = useNavigate()
  const { switchSociety } = useApp()
  const { run, busy } = useAction()
  const [step, setStep] = useState(0)
  const [done, setDone] = useState(null)
  const [profile, setProfile] = useState({ name: 'Palm Grove Heights', code: 'PG', city: 'Hyderabad', address: 'Road 12, Banjara Hills, Hyderabad 500034', registrationNo: '', plan: 'Standard' })
  const [describe, setDescribe] = useState('2 towers A and B, 8 floors, 4 flats per floor, 2BHK and 3BHK')
  const [aiNote, setAiNote] = useState('')
  const [thinking, setThinking] = useState(false)
  const [blocks, setBlocks] = useState([{ code: 'A', name: 'Tower A', floors: 8, unitsPerFloor: 4 }])
  const [types, setTypes] = useState([{ name: '2BHK', areaSqft: 1100 }, { name: '3BHK', areaSqft: 1500 }])
  const [heads, setHeads] = useState([{ name: 'Maintenance', basis: 'per_sqft', rate: 3 }, { name: 'Sinking Fund', basis: 'fixed', rate: 500 }, { name: 'Parking', basis: 'per_parking', rate: 250 }])
  const [rules, setRules] = useState({ dueDay: 10, lateFeePct: 2, graceDays: 5 })
  const [admin, setAdmin] = useState({ name: 'Ravi Teja', title: 'Secretary', phone: '+91 90000 12345', email: 'ravi@palmgrove.in' })

  const totalUnits = blocks.reduce((a, b) => a + Number(b.floors || 0) * Number(b.unitsPerFloor || 0), 0)
  const avgArea = types.reduce((a, t) => a + Number(t.areaSqft || 0), 0) / (types.length || 1)
  const estBill = heads.reduce((a, h) => a + (h.basis === 'per_sqft' ? h.rate * avgArea : h.basis === 'fixed' ? Number(h.rate) : Number(h.rate) * 0.8), 0)
  const valid = [profile.name && profile.code && profile.city, blocks.length && types.length && totalUnits > 0, heads.length > 0, admin.name, true]

  const generate = async () => {
    setThinking(true)
    const r = await api.post('/api/ai/structure', { text: describe })
    setBlocks(r.blocks)
    setTypes(r.unitTypes)
    setAiNote(r.explanation)
    setThinking(false)
  }
  const create = async () => {
    const r = await run(() => api.post('/api/platform/societies', { ...profile, blocks, unitTypes: types, chargeHeads: heads, billing: rules, admin }), (x) => `${x.society.name} is live with ${x.units} units`)
    setDone(r)
  }

  if (done) {
    return (
      <Card className="mx-auto max-w-2xl p-8 text-center">
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15"><Check className="size-9" /></div>
        <h2 className="mt-4 text-2xl font-bold">{done.society.name} is live 🎉</h2>
        <p className="mt-2 text-sm text-slate-500">{done.units} units created. Default complaint categories, expense categories and 2 amenities were added. {done.admin.name} can now log in as admin.</p>
        <div className="mx-auto mt-6 max-w-md space-y-2 text-left text-sm">
          <p className="font-semibold">What the committee does next:</p>
          {['Masters → Staff: add guards (gate login) and maintenance staff', 'Masters → Complaint categories: set the default assignee', 'Residents: add owners/tenants and give them app access', 'Parking: allot slots (parking is billed per slot)', 'Billing: generate the first cycle', 'Notices: publish a welcome notice'].map((x, i) => (
            <p key={x} className="flex gap-2"><span className="grid size-5 shrink-0 place-items-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-700">{i + 1}</span>{x}</p>
          ))}
        </div>
        <div className="mt-8 flex justify-center gap-2">
          <Button variant="secondary" onClick={() => navigate('/societies')}>All societies</Button>
          <Button onClick={() => (switchSociety({ id: done.society.id, name: done.society.name, code: done.society.code }), navigate('/guide'))}>Open {done.society.name} <ArrowRight className="size-4" /></Button>
        </div>
      </Card>
    )
  }

  return (
    <>
      <PageHeader title="Onboard a society" subtitle="Five steps. Creates the society, its master tables, all units and the first admin login." />
      <div className="mb-6 flex flex-wrap gap-2">
        {STEPS.map(([label, Icon], i) => (
          <button key={label} onClick={() => i <= step && setStep(i)} className={cx('flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition', i === step ? 'border-brand-600 bg-brand-600 text-white' : i < step ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300' : 'border-slate-200 text-slate-400 dark:border-slate-700')}>
            {i < step ? <Check className="size-4" /> : <Icon className="size-4" />} {i + 1}. {label}
          </button>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <Card className="p-6">
          {step === 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Society name"><Input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} /></Field>
              <Field label="Short code" hint="2–4 letters, used in invoice and ticket numbers"><Input value={profile.code} maxLength={4} onChange={(e) => setProfile({ ...profile, code: e.target.value.toUpperCase() })} /></Field>
              <Field label="City"><Input value={profile.city} onChange={(e) => setProfile({ ...profile, city: e.target.value })} /></Field>
              <Field label="Plan"><Select value={profile.plan} onChange={(e) => setProfile({ ...profile, plan: e.target.value })} options={[{ value: 'Basic', label: 'Basic · ₹15/unit' }, { value: 'Standard', label: 'Standard · ₹25/unit' }, { value: 'Premium', label: 'Premium · ₹40/unit (AI)' }]} /></Field>
              <div className="sm:col-span-2"><Field label="Address"><Input value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} /></Field></div>
              <Field label="Registration no. (optional)"><Input value={profile.registrationNo} onChange={(e) => setProfile({ ...profile, registrationNo: e.target.value })} /></Field>
            </div>
          )}
          {step === 1 && (
            <div className="space-y-6">
              <div className="ai-border rounded-2xl bg-gradient-to-br from-indigo-50 to-fuchsia-50 p-4 dark:from-indigo-500/10 dark:to-fuchsia-500/10">
                <p className="mb-2 flex items-center gap-2 text-sm font-semibold"><Sparkles className="size-4 text-violet-500" /> Describe the society in plain English <AIBadge /></p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Textarea rows={2} value={describe} onChange={(e) => setDescribe(e.target.value)} placeholder="e.g. 3 towers A, B, C with 12 floors and 4 flats per floor, 2BHK and 3BHK / 40 villas" />
                  <Button variant="ai" loading={thinking} onClick={generate} className="sm:self-start">Build structure</Button>
                </div>
                {aiNote && <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{aiNote}</p>}
              </div>
              <div>
                <p className="mb-2 font-semibold">Blocks</p>
                <Rows rows={blocks} setRows={setBlocks} blank={{ code: '', name: '', floors: 1, unitsPerFloor: 4 }} cols={[{ k: 'code', label: 'Code', w: '90px' }, { k: 'name', label: 'Name' }, { k: 'floors', label: 'Floors', type: 'number', w: '100px' }, { k: 'unitsPerFloor', label: 'Per floor', type: 'number', w: '100px' }]} />
              </div>
              <div>
                <p className="mb-2 font-semibold">Unit types</p>
                <Rows rows={types} setRows={setTypes} blank={{ name: '', areaSqft: 1000 }} cols={[{ k: 'name', label: 'Type' }, { k: 'areaSqft', label: 'Area sq.ft', type: 'number', w: '140px' }]} />
                <p className="mt-2 text-xs text-slate-500">Units on each floor cycle through these types (flat 1 → first type, flat 2 → second…). You can change any unit later in Masters → Units.</p>
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <p className="mb-2 font-semibold">Charge heads (what each monthly bill contains)</p>
                <Rows rows={heads} setRows={setHeads} blank={{ name: '', basis: 'fixed', rate: 0 }} cols={[{ k: 'name', label: 'Name' }, { k: 'basis', label: 'Basis', options: BASIS, w: '170px' }, { k: 'rate', label: 'Rate ₹', type: 'number', w: '110px' }]} />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Due day of month"><Input type="number" min={1} max={28} value={rules.dueDay} onChange={(e) => setRules({ ...rules, dueDay: e.target.value })} /></Field>
                <Field label="Late fee % / month"><Input type="number" value={rules.lateFeePct} onChange={(e) => setRules({ ...rules, lateFeePct: e.target.value })} /></Field>
                <Field label="Grace days"><Input type="number" value={rules.graceDays} onChange={(e) => setRules({ ...rules, graceDays: e.target.value })} /></Field>
              </div>
            </div>
          )}
          {step === 3 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name"><Input value={admin.name} onChange={(e) => setAdmin({ ...admin, name: e.target.value })} /></Field>
              <Field label="Title"><Select value={admin.title} onChange={(e) => setAdmin({ ...admin, title: e.target.value })} options={['Secretary', 'Treasurer', 'President', 'Facility Manager']} /></Field>
              <Field label="Mobile (OTP login)"><Input value={admin.phone} onChange={(e) => setAdmin({ ...admin, phone: e.target.value })} /></Field>
              <Field label="Email"><Input value={admin.email} onChange={(e) => setAdmin({ ...admin, email: e.target.value })} /></Field>
              <p className="text-xs text-slate-500 sm:col-span-2">This person gets the admin login. They can add more committee members, guards and residents from inside the society.</p>
            </div>
          )}
          {step === 4 && (
            <div className="space-y-4 text-sm">
              {[
                ['Society', `${profile.name} (${profile.code}) · ${profile.city} · ${profile.plan}`],
                ['Blocks', blocks.map((b) => `${b.name}: ${b.floors}×${b.unitsPerFloor}`).join(' · ')],
                ['Unit types', types.map((t) => `${t.name} ${t.areaSqft} sq.ft`).join(' · ')],
                ['Units to create', totalUnits],
                ['Charge heads', heads.map((h) => `${h.name} (${h.basis === 'per_sqft' ? `₹${h.rate}/sq.ft` : h.basis === 'per_parking' ? `₹${h.rate}/slot` : inr(h.rate)})`).join(' · ')],
                ['Rules', `Due on day ${rules.dueDay} · ${rules.lateFeePct}% late fee after ${rules.graceDays} days`],
                ['First admin', `${admin.name} (${admin.title}) · ${admin.phone}`],
                ['Also created', 'Complaint categories (9) with SLAs · expense categories (9) · Clubhouse & Gym amenities'],
              ].map(([k, v]) => (
                <div key={k} className="grid gap-1 border-b border-slate-100 pb-3 sm:grid-cols-[160px_1fr] dark:border-slate-800"><span className="text-slate-500">{k}</span><span className="font-medium">{v}</span></div>
              ))}
            </div>
          )}
          <div className="mt-8 flex justify-between">
            <Button variant="secondary" icon={ArrowLeft} disabled={step === 0} onClick={() => setStep(step - 1)}>Back</Button>
            {step < 4 ? <Button disabled={!valid[step]} onClick={() => setStep(step + 1)}>Continue <ArrowRight className="size-4" /></Button> : <Button loading={busy} onClick={create} icon={Check}>Create society</Button>}
          </div>
        </Card>
        <Card className="h-fit p-5 xl:sticky xl:top-24">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Live preview</p>
          <p className="mt-2 text-lg font-bold">{profile.name || 'New society'}</p>
          <p className="text-sm text-slate-500">{profile.city}</p>
          <div className="mt-4 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-xl bg-slate-50 py-3 dark:bg-slate-800/60"><p className="text-xl font-bold">{totalUnits}</p><p className="text-[11px] text-slate-500">Units</p></div>
            <div className="rounded-xl bg-slate-50 py-3 dark:bg-slate-800/60"><p className="text-xl font-bold">{blocks.length}</p><p className="text-[11px] text-slate-500">Blocks</p></div>
            <div className="col-span-2 rounded-xl bg-slate-50 py-3 dark:bg-slate-800/60"><p className="text-xl font-bold">{inr(estBill)}</p><p className="text-[11px] text-slate-500">Typical monthly bill per unit</p></div>
          </div>
          <div className="mt-4 flex flex-wrap gap-1.5">{blocks.map((b, i) => <Badge key={i} tone="blue">{`${b.code || '?'}-${Number(b.floors) > 1 ? '1' : ''}01 …`}</Badge>)}</div>
          <p className="mt-4 text-xs text-slate-500">MRR for the platform: <strong>{inr(totalUnits * ({ Basic: 15, Standard: 25, Premium: 40 }[profile.plan] || 0))}</strong></p>
        </Card>
      </div>
    </>
  )
}
