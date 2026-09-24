import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2, Receipt, Database, Sparkles, ShieldCheck } from 'lucide-react'
import { useApp, useApi, useAction } from '../context/AppContext'
import { api } from '../api/client'
import { Card, CardHeader, Button, PageHeader, Input, Field, Skeleton, Badge } from '../components/ui'

export default function Settings() {
  const { data } = useApi('/api/society')
  const [f, setF] = useState(null)
  const { run, busy } = useAction()
  const { logout } = useApp()
  useEffect(() => {
    if (data) setF({ approvalLimit: 25000, blockDefaulterBookings: true, ...data })
  }, [data])
  if (!f) return <Skeleton />
  const b = f.billing
  const setB = (k, v) => setF({ ...f, billing: { ...b, [k]: Number(v) } })
  return (
    <>
      <PageHeader title="Settings" subtitle="Society profile and rules. Charges live in Master tables → Charge heads." actions={<Button loading={busy} onClick={() => run(() => api.put('/api/society', { ...f, approvalLimit: Number(f.approvalLimit) }), 'Settings saved')}>Save changes</Button>} />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Society profile" icon={Building2} action={<Badge tone="purple">{f.plan} plan · {f.code}</Badge>} />
          <div className="space-y-4 p-5">
            <Field label="Name"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
            <Field label="Address"><Input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="City"><Input value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></Field>
              <Field label="Registration no."><Input value={f.registrationNo} onChange={(e) => setF({ ...f, registrationNo: e.target.value })} /></Field>
            </div>
            <p className="text-xs text-slate-500">Plan and status are managed by the platform owner.</p>
          </div>
        </Card>
        <Card>
          <CardHeader title="Billing rules" icon={Receipt} subtitle="Used by bill generation and late-fee runs" />
          <div className="grid gap-4 p-5 sm:grid-cols-3">
            <Field label="Due day of month"><Input type="number" min={1} max={28} value={b.dueDay} onChange={(e) => setB('dueDay', e.target.value)} /></Field>
            <Field label="Late fee % / month"><Input type="number" step="0.5" value={b.lateFeePct} onChange={(e) => setB('lateFeePct', e.target.value)} /></Field>
            <Field label="Grace days"><Input type="number" value={b.graceDays} onChange={(e) => setB('graceDays', e.target.value)} /></Field>
          </div>
          <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500 dark:border-slate-800">Maintenance rate, sinking fund, parking and other charges: <Link className="font-medium text-brand-600" to="/masters?tab=charge-heads">Master tables → Charge heads</Link></p>
        </Card>
        <Card>
          <CardHeader title="Controls" icon={ShieldCheck} />
          <div className="space-y-4 p-5">
            <Field label="Expense approval limit (₹)" hint="Expenses above this need a second committee member (maker–checker)."><Input type="number" value={f.approvalLimit} onChange={(e) => setF({ ...f, approvalLimit: e.target.value })} /></Field>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.blockDefaulterBookings !== false} onChange={(e) => setF({ ...f, blockDefaulterBookings: e.target.checked })} className="size-4 accent-brand-600" /> Block amenity bookings for units with 2+ unpaid bills</label>
          </div>
        </Card>
        <Card>
          <CardHeader title="AI features" icon={Sparkles} />
          <ul className="space-y-3 p-5 text-sm">
            {['Assistant chat & voice input', 'Ticket triage with SLA routing', 'Notice drafting & translation', 'Defaulter risk & ledger explanations', 'Spend, budget, SLA, lease & contract alerts'].map((x) => (
              <li key={x} className="flex items-center justify-between"><span>{x}</span><Badge tone="green">Enabled</Badge></li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader title="Demo data" icon={Database} />
          <div className="space-y-3 p-5 text-sm">
            <p className="text-slate-500">All societies live in your browser (localStorage). Reset restores the 3 sample societies.</p>
            <p className="text-slate-500">API mode: <strong>{import.meta.env.VITE_API_URL ? `Remote (${import.meta.env.VITE_API_URL})` : 'In-browser mock'}</strong></p>
            <Button variant="danger" onClick={async () => { await api.post('/api/system/reset'); await logout(); location.reload() }}>Reset demo data</Button>
          </div>
        </Card>
      </div>
    </>
  )
}
