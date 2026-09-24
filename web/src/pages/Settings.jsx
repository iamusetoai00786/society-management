import { useEffect, useState } from 'react'
import { Building2, Receipt, Database, Sparkles } from 'lucide-react'
import { useApp, useApi, useAction } from '../context/AppContext'
import { api } from '../api/client'
import { Card, CardHeader, Button, PageHeader, Input, Field, Skeleton, Badge } from '../components/ui'

export default function Settings() {
  const { data } = useApi('/api/society')
  const [f, setF] = useState(null)
  const { run, busy } = useAction()
  const { logout } = useApp()
  useEffect(() => {
    if (data) setF(data)
  }, [data])
  if (!f) return <Skeleton />
  const b = f.billing
  const setB = (k, v) => setF({ ...f, billing: { ...b, [k]: Number(v) } })
  return (
    <>
      <PageHeader title="Settings" subtitle="Society profile, billing rules and demo data." actions={<Button loading={busy} onClick={() => run(() => api.put('/api/society', f), 'Settings saved')}>Save changes</Button>} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Society profile" icon={Building2} action={<Badge tone="purple">{f.plan} plan</Badge>} />
          <div className="space-y-4 p-5">
            <Field label="Name"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
            <Field label="Address"><Input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></Field>
            <Field label="Registration no."><Input value={f.registrationNo} onChange={(e) => setF({ ...f, registrationNo: e.target.value })} /></Field>
          </div>
        </Card>
        <Card>
          <CardHeader title="Billing rules" icon={Receipt} subtitle="Used when generating the next cycle" />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Rate per sq.ft (₹)"><Input type="number" step="0.1" value={b.ratePerSqft} onChange={(e) => setB('ratePerSqft', e.target.value)} /></Field>
            <Field label="Sinking fund (₹)"><Input type="number" value={b.sinkingFund} onChange={(e) => setB('sinkingFund', e.target.value)} /></Field>
            <Field label="Due day of month"><Input type="number" min={1} max={28} value={b.dueDay} onChange={(e) => setB('dueDay', e.target.value)} /></Field>
            <Field label="Late fee (% per month)"><Input type="number" value={b.lateFeePct} onChange={(e) => setB('lateFeePct', e.target.value)} /></Field>
            <Field label="Grace period (days)"><Input type="number" value={b.graceDays} onChange={(e) => setB('graceDays', e.target.value)} /></Field>
          </div>
        </Card>
        <Card>
          <CardHeader title="AI features" icon={Sparkles} />
          <ul className="space-y-3 p-5 text-sm">
            {['Assistant chat & voice input', 'Ticket auto-triage & suggested replies', 'Notice drafting & translation', 'Defaulter risk scoring', 'Spend anomaly detection'].map((x) => (
              <li key={x} className="flex items-center justify-between"><span>{x}</span><Badge tone="green">Enabled</Badge></li>
            ))}
          </ul>
          <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500 dark:border-slate-800">The demo uses a built-in heuristic engine. Point <code>/api/ai/*</code> at an LLM backend to go live.</p>
        </Card>
        <Card>
          <CardHeader title="Demo data" icon={Database} />
          <div className="space-y-3 p-5 text-sm">
            <p className="text-slate-500">All data lives in your browser (localStorage). Reset to restore the original sample society.</p>
            <p className="text-slate-500">API mode: <strong>{import.meta.env.VITE_API_URL ? `Remote (${import.meta.env.VITE_API_URL})` : 'In-browser mock'}</strong></p>
            <Button variant="danger" onClick={async () => { await api.post('/api/system/reset'); await logout(); location.reload() }}>Reset demo data</Button>
          </div>
        </Card>
      </div>
    </>
  )
}
