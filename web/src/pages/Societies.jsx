import { useNavigate } from 'react-router-dom'
import { Building2, Users, Wallet, Wrench, PlusCircle, ArrowRight, Globe2, Pause, Play } from 'lucide-react'
import { useApp, useApi, useAction } from '../context/AppContext'
import { api } from '../api/client'
import { Card, CardHeader, Badge, Button, Table, PageHeader, Skeleton, Stat, Select, inr } from '../components/ui'

export function PlatformOverview() {
  const { data } = useApi('/api/platform/overview')
  const { switchSociety, askAssistant } = useApp()
  const navigate = useNavigate()
  if (!data) return <Skeleton rows={6} />
  const t = data.totals
  const open = (x) => (switchSociety({ id: x.id, name: x.name, code: x.code }), navigate('/'))
  return (
    <>
      <PageHeader title="Platform overview" subtitle="Every society on SocietyOS, in one view." actions={<><Button variant="secondary" onClick={() => askAssistant('Which society has the lowest collection?')}>Ask AI</Button><Button icon={PlusCircle} onClick={() => navigate('/societies/new')}>Onboard society</Button></>} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Societies" value={t.societies} sub={`${t.active} active`} icon={Building2} />
        <Stat label="Units managed" value={t.units.toLocaleString('en-IN')} icon={Globe2} tone="sky" />
        <Stat label="Residents" value={t.residents.toLocaleString('en-IN')} icon={Users} tone="green" />
        <Stat label="MRR" value={inr(t.mrr)} sub="Active societies × units × plan price" icon={Wallet} tone="amber" />
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {data.societies.map((x) => (
          <Card key={x.id} className="flex flex-col p-5">
            <div className="flex items-start gap-3">
              <div className="grid size-11 place-items-center rounded-xl bg-brand-50 font-bold text-brand-700 dark:bg-brand-500/10 dark:text-brand-100">{x.code}</div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{x.name}</p>
                <p className="text-xs text-slate-500">{x.city} · since {new Date(x.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</p>
              </div>
              <Badge tone={x.status === 'active' ? 'green' : 'red'}>{x.status}</Badge>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              {[['Units', `${x.occupied}/${x.units}`], ['Collection', `${Math.round(x.collectionRate * 100)}%`], ['Open tickets', x.openTickets]].map(([l, v]) => (
                <div key={l} className="rounded-xl bg-slate-50 py-2 dark:bg-slate-800/60"><p className="font-bold">{v}</p><p className="text-[11px] text-slate-500">{l}</p></div>
              ))}
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.round(x.collectionRate * 100)}%` }} /></div>
            <p className="mt-3 text-xs text-slate-500">Admins: {x.admins.join(', ') || '—'} · {x.plan} plan · {inr(x.mrr)}/mo</p>
            <Button className="mt-4" variant="secondary" onClick={() => open(x)} disabled={x.status !== 'active'}>Open society <ArrowRight className="size-4" /></Button>
          </Card>
        ))}
      </div>
    </>
  )
}

export default function Societies() {
  const { data } = useApi('/api/platform/overview')
  const { switchSociety } = useApp()
  const { run } = useAction()
  const navigate = useNavigate()
  return (
    <>
      <PageHeader title="Societies" subtitle="Plans, status and health of every tenant." actions={<Button icon={PlusCircle} onClick={() => navigate('/societies/new')}>Onboard society</Button>} />
      <Card>
        <CardHeader title="All societies" icon={Building2} subtitle="Suspending a society blocks its users from logging in. Data is kept." />
        {!data ? <Skeleton /> : (
          <Table rows={data.societies} columns={[
            { key: 'name', label: 'Society', render: (x) => <div><p className="font-semibold">{x.name}</p><p className="text-xs text-slate-500">{x.code} · {x.city}</p></div> },
            { key: 'units', label: 'Units', align: 'right', render: (x) => `${x.occupied}/${x.units}` },
            { key: 'residents', label: 'Residents', align: 'right' },
            { key: 'users', label: 'App users', align: 'right' },
            { key: 'collectionRate', label: 'Collection', align: 'right', render: (x) => `${Math.round(x.collectionRate * 100)}%` },
            { key: 'outstanding', label: 'Outstanding', align: 'right', render: (x) => inr(x.outstanding) },
            { key: 'openTickets', label: 'Tickets', align: 'right', render: (x) => <span className="inline-flex items-center gap-1"><Wrench className="size-3 text-slate-400" />{x.openTickets}</span> },
            { key: 'plan', label: 'Plan', render: (x) => <Select className="w-32 py-1 text-xs" value={x.plan} onChange={(e) => run(() => api.patch(`/api/platform/societies/${x.id}`, { plan: e.target.value }), `Plan changed to ${e.target.value}`)} options={data.plans.map((p) => ({ value: p.id, label: `${p.id} · ₹${p.pricePerUnit}` }))} /> },
            { key: 'mrr', label: 'MRR', align: 'right', render: (x) => inr(x.mrr) },
            { key: 'status', label: 'Status', render: (x) => <Badge tone={x.status === 'active' ? 'green' : 'red'}>{x.status}</Badge> },
            { key: 'x', label: '', render: (x) => (
              <div className="flex justify-end gap-1">
                <Button size="sm" variant="ghost" icon={x.status === 'active' ? Pause : Play} onClick={() => run(() => api.patch(`/api/platform/societies/${x.id}`, { status: x.status === 'active' ? 'suspended' : 'active' }), x.status === 'active' ? 'Society suspended' : 'Society activated')}>{x.status === 'active' ? 'Suspend' : 'Activate'}</Button>
                <Button size="sm" variant="secondary" onClick={() => (switchSociety({ id: x.id, name: x.name, code: x.code }), navigate('/'))}>Open</Button>
              </div>
            ) },
          ]} />
        )}
      </Card>
    </>
  )
}
