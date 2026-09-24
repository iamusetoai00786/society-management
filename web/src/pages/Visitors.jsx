import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { UserPlus, KeyRound, LogOut as ExitIcon, Package, Car, User, Wrench, QrCode, Copy, Share2, Clock, ShieldCheck } from 'lucide-react'
import { useApp, useApi, useAction } from '../context/AppContext'
import { api } from '../api/client'
import { Card, CardHeader, Badge, Button, Table, PageHeader, Skeleton, Input, Field, Modal, Tabs, Stat, UnitLink, fmtTime, fmtDate, ago, cx } from '../components/ui'

const TYPES = [['guest', 'Guest', User], ['delivery', 'Delivery', Package], ['cab', 'Cab', Car], ['service', 'Service', Wrench]]
const COMPANIES = { delivery: ['Amazon', 'Flipkart', 'Swiggy', 'Zomato', 'Blinkit', 'Zepto', 'BigBasket'], cab: ['Uber', 'Ola', 'Rapido'] }

function QRCodeArt({ value }) {
  // Decorative QR-style grid derived from the code (not a scannable QR).
  const cells = [...Array(121)].map((_, i) => ((value.charCodeAt(i % value.length) * (i + 7)) % 5) < 2)
  const corner = (r, c) => (r < 3 && c < 3) || (r < 3 && c > 7) || (r > 7 && c < 3)
  return (
    <div className="grid grid-cols-11 gap-0.5 rounded-xl bg-white p-3">
      {cells.map((on, i) => {
        const r = Math.floor(i / 11)
        const c = i % 11
        return <div key={i} className={cx('size-3 rounded-[2px]', corner(r, c) || on ? 'bg-slate-900' : 'bg-white')} />
      })}
    </div>
  )
}

function GatePass({ open, onClose }) {
  const [f, setF] = useState({ name: '', phone: '', type: 'guest' })
  const [pass, setPass] = useState(null)
  const { run, busy } = useAction()
  const { toast, society } = useApp()
  const create = async () => setPass(await run(() => api.post('/api/visitors/preapprove', f), 'Gate pass created'))
  const close = () => (setPass(null), setF({ name: '', phone: '', type: 'guest' }), onClose())
  const msg = pass && `Your entry pass for ${society?.name} (${pass.unitId}): OTP ${pass.code}, valid till ${fmtDate(pass.validUntil, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
  return (
    <Modal open={open} onClose={close} title={pass ? 'Gate pass ready' : 'Pre-approve a visitor'} footer={!pass && <><Button variant="secondary" onClick={close}>Cancel</Button><Button loading={busy} onClick={create} disabled={!f.name}>Create pass</Button></>}>
      {pass ? (
        <div className="flex flex-col items-center text-center">
          <QRCodeArt value={pass.code + pass.name} />
          <p className="mt-4 text-sm text-slate-500">Entry OTP for {pass.name}</p>
          <p className="font-mono text-4xl font-bold tracking-[0.3em]">{pass.code}</p>
          <p className="mt-1 text-xs text-slate-500">Valid for 24 hours · one-time use</p>
          <div className="mt-5 flex gap-2">
            <Button variant="secondary" icon={Copy} onClick={() => (navigator.clipboard?.writeText(msg), toast('Copied'))}>Copy</Button>
            <Button icon={Share2} onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')}>Share on WhatsApp</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-2">
            {TYPES.map(([v, l, I]) => (
              <button key={v} onClick={() => setF({ ...f, type: v })} className={cx('flex flex-col items-center gap-1 rounded-xl border p-3 text-xs font-medium', f.type === v ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-white' : 'border-slate-200 dark:border-slate-700')}><I className="size-5" />{l}</button>
            ))}
          </div>
          <Field label="Visitor name"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Anil Mehta" /></Field>
          <Field label="Phone (optional)"><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="+91" /></Field>
        </div>
      )}
    </Modal>
  )
}

function GateConsole() {
  const [f, setF] = useState({ name: '', phone: '', unitId: '', type: 'delivery', company: 'Amazon', vehicle: '' })
  const [code, setCode] = useState('')
  const { run, busy } = useAction()
  const { data: units } = useApi('/api/units')
  const { data: passes } = useApi('/api/visitors/preapprovals')
  const unit = units?.find((u) => u.id === f.unitId)
  const log = async (leaveAtGate = false) => {
    await run(() => api.post('/api/visitors', { ...f, leaveAtGate }), leaveAtGate ? 'Parcel left at gate. Resident notified' : 'Approval request sent to resident')
    setF({ ...f, name: '', phone: '', unitId: '', vehicle: '' })
  }
  const verify = async () => {
    const v = await run(() => api.post('/api/visitors/verify-code', { code }), (v) => `✅ ${v.name} checked in for ${v.unitId}`)
    if (v) setCode('')
  }
  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <Card className="lg:col-span-3">
        <CardHeader title="New entry" subtitle="Log a visitor and ask the resident to approve" icon={UserPlus} />
        <div className="space-y-4 p-5">
          <div className="grid grid-cols-4 gap-2">
            {TYPES.map(([v, l, I]) => (
              <button key={v} onClick={() => setF({ ...f, type: v, company: COMPANIES[v]?.[0] || '' })} className={cx('flex flex-col items-center gap-1.5 rounded-2xl border-2 p-4 text-sm font-semibold transition', f.type === v ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-white' : 'border-slate-200 dark:border-slate-700')}><I className="size-7" />{l}</button>
            ))}
          </div>
          {COMPANIES[f.type] && (
            <div className="flex flex-wrap gap-2">
              {COMPANIES[f.type].map((c) => <button key={c} onClick={() => setF({ ...f, company: c, name: f.name || `${c} Partner` })} className={cx('rounded-full border px-3 py-1.5 text-sm', f.company === c ? 'border-brand-500 bg-brand-600 text-white' : 'border-slate-200 dark:border-slate-700')}>{c}</button>)}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name"><Input className="py-3 text-base" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
            <Field label="Flat / Unit" hint={f.unitId ? (unit ? (unit.occupancy === 'vacant' ? '⚠️ Vacant unit' : `✓ ${unit.residents.map((r) => r.name).join(', ')}`) : '⚠️ No such unit') : 'Type or pick from the list'}><Input list="unit-list" className="py-3 text-base uppercase" value={f.unitId} onChange={(e) => setF({ ...f, unitId: e.target.value.toUpperCase() })} placeholder="B-203" /></Field>
            <Field label="Phone"><Input className="py-3 text-base" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
            <Field label="Vehicle no."><Input className="py-3 text-base uppercase" value={f.vehicle} onChange={(e) => setF({ ...f, vehicle: e.target.value.toUpperCase() })} /></Field>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="lg" loading={busy} disabled={!f.name || !f.unitId} onClick={() => log(false)} className="flex-1">Request approval</Button>
            {f.type === 'delivery' && <Button size="lg" variant="secondary" disabled={!f.name || !f.unitId} onClick={() => log(true)}>Leave at gate</Button>}
          </div>
        </div>
      </Card>
      <div className="space-y-6 lg:col-span-2">
        <Card className="ai-gradient p-5 text-white">
          <p className="flex items-center gap-2 font-semibold"><KeyRound className="size-5" /> Verify gate pass</p>
          <p className="mt-1 text-sm text-white/80">Enter the 6-digit OTP shown by the visitor</p>
          <div className="mt-4 flex gap-2">
            <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" placeholder="••••••" className="w-full rounded-xl bg-white/20 px-4 py-3 text-center font-mono text-2xl tracking-[0.4em] text-white outline-none placeholder:text-white/50" />
            <button onClick={verify} disabled={code.length !== 6} className="rounded-xl bg-white px-4 font-semibold text-brand-700 disabled:opacity-50">Verify</button>
          </div>
          <p className="mt-2 text-xs text-white/70">{passes?.[0] ? `Demo: ${passes[0].name}'s code is ${passes[0].code}` : 'No active passes right now'}</p>
          <datalist id="unit-list">{(units || []).filter((u) => u.occupancy !== 'vacant').map((u) => <option key={u.id} value={u.id}>{u.residents.map((r) => r.name).join(', ')}</option>)}</datalist>
        </Card>
        <DailyHelp />
      </div>
    </div>
  )
}

function DailyHelp() {
  const { data } = useApi('/api/daily-help')
  const { run } = useAction()
  return (
    <Card>
      <CardHeader title="Daily help" subtitle="Tap to mark entry / exit" icon={ShieldCheck} />
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {(data || []).map((h) => (
          <li key={h.id} className="flex items-center gap-3 px-5 py-3">
            <div className="flex-1"><p className="text-sm font-medium">{h.name} <span className="text-xs text-slate-500">· {h.role}</span></p><p className="text-xs text-slate-500">{h.units.join(', ')}</p></div>
            <Button size="sm" variant={h.inside ? 'secondary' : 'success'} onClick={() => run(() => api.post(`/api/daily-help/${h.id}/toggle`), `${h.name} marked ${h.inside ? 'out' : 'in'}`)}>{h.inside ? 'Mark out' : 'Mark in'}</Button>
          </li>
        ))}
      </ul>
    </Card>
  )
}

export default function Visitors() {
  const { user } = useApp()
  const [params] = useSearchParams()
  const [tab, setTab] = useState(user.role === 'guard' ? 'gate' : 'log')
  const [status, setStatus] = useState('')
  const [pass, setPass] = useState(params.get('pass') === '1')
  const { data, loading } = useApi(`/api/visitors?status=${status}`)
  const { data: passes } = useApi(user.role === 'resident' ? '/api/visitors/preapprovals' : null)
  const { run } = useAction()
  const today = new Date().toISOString().slice(0, 10)
  const list = data || []
  return (
    <>
      <PageHeader title={user.role === 'guard' ? 'Gate Console · Gate 1' : 'Visitors & Gate'} subtitle={user.role === 'guard' ? `On duty: ${user.name}` : 'Every entry is logged, approved and traceable.'}
        actions={user.role !== 'guard' && <Button icon={QrCode} onClick={() => setPass(true)}>Create gate pass</Button>} />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Today" value={list.filter((v) => v.checkIn.startsWith(today)).length} icon={User} tone="brand" />
        <Stat label="Inside now" value={list.filter((v) => v.status === 'inside').length} icon={ShieldCheck} tone="sky" />
        <Stat label="Waiting approval" value={list.filter((v) => v.status === 'pending').length} icon={Clock} tone="amber" />
        <Stat label="Deliveries today" value={list.filter((v) => v.type === 'delivery' && v.checkIn.startsWith(today)).length} icon={Package} tone="green" />
      </div>
      {user.role === 'guard' && <div className="mb-4"><Tabs value={tab} onChange={setTab} tabs={[{ value: 'gate', label: 'New entry' }, { value: 'log', label: 'Visitor log' }]} /></div>}
      {tab === 'gate' ? <GateConsole /> : (
        <div className="grid gap-6 xl:grid-cols-3">
          <Card className={user.role === 'resident' ? 'xl:col-span-2' : 'xl:col-span-3'}>
            <div className="border-b border-slate-100 p-4 dark:border-slate-800">
              <Tabs value={status} onChange={setStatus} tabs={[{ value: '', label: 'All' }, { value: 'pending', label: 'Pending' }, { value: 'inside', label: 'Inside' }, { value: 'exited', label: 'Exited' }, { value: 'denied', label: 'Denied' }]} />
            </div>
            {loading && !data ? <Skeleton /> : (
              <Table rows={list.slice(0, 60)} empty="No visitors" columns={[
                { key: 'name', label: 'Visitor', render: (v) => <div><p className="font-medium">{v.name}</p><p className="text-xs capitalize text-slate-500">{v.type}{v.company ? ` · ${v.company}` : ''}</p></div> },
                { key: 'unitId', label: 'Unit', render: (v) => <UnitLink id={v.unitId} /> },
                { key: 'gate', label: 'Gate', className: 'text-xs text-slate-500' },
                { key: 'loggedBy', label: 'Logged by', className: 'text-xs text-slate-500' },
                { key: 'vehicle', label: 'Vehicle', render: (v) => v.vehicle || '—', className: 'text-xs text-slate-500' },
                { key: 'checkIn', label: 'In', render: (v) => <span title={fmtDate(v.checkIn)}>{v.checkIn.startsWith(today) ? fmtTime(v.checkIn) : ago(v.checkIn)}</span> },
                { key: 'checkOut', label: 'Out', render: (v) => fmtTime(v.checkOut) },
                { key: 'status', label: 'Status', render: (v) => <Badge>{v.status}</Badge> },
                { key: 'x', label: '', render: (v) => v.status === 'pending' && user.role !== 'guard' ? (
                  <div className="flex gap-1"><Button size="sm" variant="success" onClick={() => run(() => api.post(`/api/visitors/${v.id}/approve`), 'Approved')}>Allow</Button><Button size="sm" variant="secondary" onClick={() => run(() => api.post(`/api/visitors/${v.id}/deny`), 'Denied')}>Deny</Button></div>
                ) : v.status === 'inside' && user.role !== 'resident' ? <Button size="sm" variant="secondary" icon={ExitIcon} onClick={() => run(() => api.post(`/api/visitors/${v.id}/checkout`), 'Checked out')}>Exit</Button> : null },
              ]} />
            )}
          </Card>
          {user.role === 'resident' && (
            <Card>
              <CardHeader title="Active gate passes" icon={KeyRound} />
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {(passes || []).map((p) => (
                  <li key={p.id} className="flex items-center justify-between px-5 py-3">
                    <div><p className="text-sm font-medium">{p.name}</p><p className="text-xs text-slate-500">till {fmtDate(p.validUntil, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p></div>
                    <span className="font-mono text-lg font-bold tracking-widest text-brand-600">{p.code}</span>
                  </li>
                ))}
                {passes && !passes.length && <li className="px-5 py-8 text-center text-sm text-slate-500">No active passes</li>}
              </ul>
            </Card>
          )}
        </div>
      )}
      <GatePass open={pass} onClose={() => setPass(false)} />
    </>
  )
}
