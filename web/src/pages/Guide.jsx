import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowDown, Check, ChevronDown, Circle, Compass, PlayCircle, Search } from 'lucide-react'
import { useApp, useApi } from '../context/AppContext'
import { Card, CardHeader, Badge, Button, PageHeader, Input, Table, Tabs, cx } from '../components/ui'
import { FLOW, MASTER_TABLES, MATRIX, ROLES, SCENARIOS } from '../guide'

const TONE = { platform: 'purple', admin: 'blue', guard: 'amber', resident: 'green', all: 'gray' }

export function SetupChecklist({ compact }) {
  const { data } = useApi('/api/setup/checklist')
  const navigate = useNavigate()
  if (!data) return null
  const next = data.steps.find((s) => !s.done)
  return (
    <Card>
      <CardHeader title="Society setup" subtitle={`${data.done} of ${data.total} steps done${next ? ` · next: ${next.title}` : ' · all set'}`} icon={Compass}
        action={<div className="flex items-center gap-2"><div className="h-2 w-28 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${(data.done / data.total) * 100}%` }} /></div><span className="text-xs font-semibold">{Math.round((data.done / data.total) * 100)}%</span></div>} />
      <ol className={cx('grid gap-px bg-slate-100 dark:bg-slate-800', compact ? 'sm:grid-cols-2 xl:grid-cols-3' : 'sm:grid-cols-2')}>
        {data.steps.map((s, i) => (
          <li key={s.key} className="flex items-start gap-3 bg-white p-4 dark:bg-slate-900">
            <span className={cx('mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold', s.done ? 'bg-emerald-500 text-white' : s === next ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800')}>{s.done ? <Check className="size-3.5" /> : i + 1}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{s.title}</p>
              {!compact && <p className="text-xs text-slate-500">{s.desc}</p>}
              <p className={cx('text-xs', s.done ? 'text-emerald-600' : 'text-slate-500')}>{s.status}</p>
            </div>
            <Button size="sm" variant={s === next ? 'primary' : 'ghost'} onClick={() => navigate(s.link)}>{s.done ? 'View' : 'Go'}</Button>
          </li>
        ))}
      </ol>
    </Card>
  )
}

function FlowDiagram() {
  return (
    <div className="space-y-2">
      {FLOW.map((layer, i) => (
        <div key={layer.key}>
          <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-[220px_1fr] dark:border-slate-800 dark:bg-slate-900">
            <div>
              <p className="flex items-center gap-2 font-semibold"><span className="grid size-6 place-items-center rounded-full bg-brand-600 text-[11px] font-bold text-white">{i + 1}</span>{layer.title}</p>
              <p className="mt-1 text-xs text-slate-500">{layer.note}</p>
              <Badge className="mt-2" tone={TONE[layer.who]}>{layer.who === 'all' ? 'Admins, residents & guards' : ROLES[layer.who].label}</Badge>
            </div>
            <div className="flex flex-wrap content-start gap-2">
              {layer.items.map((x) => <span key={x} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800/60">{x}</span>)}
            </div>
          </div>
          {i < FLOW.length - 1 && <div className="flex justify-center py-1 text-slate-300 dark:text-slate-600"><ArrowDown className="size-5" /></div>}
        </div>
      ))}
    </div>
  )
}

function Scenarios() {
  const { role } = useApp()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [mine, setMine] = useState(role !== 'platform' && role !== 'admin')
  const [openIdx, setOpenIdx] = useState(null)
  const list = SCENARIOS.map((s, i) => ({ ...s, i })).filter((s) => (!mine || s.actors.includes(role)) && `${s.area} ${s.title} ${s.steps.join(' ')}`.toLowerCase().includes(q.toLowerCase()))
  const areas = [...new Set(list.map((s) => s.area))]
  return (
    <Card>
      <CardHeader title={`Scenarios (${SCENARIOS.length})`} subtitle="Step-by-step: who does it, where to click, what changes" icon={PlayCircle}
        action={<div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} className="accent-brand-600" /> Only mine</label>
        </div>} />
      <div className="border-b border-slate-100 p-4 dark:border-slate-800">
        <div className="relative max-w-md"><Search className="absolute left-3 top-2.5 size-4 text-slate-400" /><Input className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search: tenant, late fee, OTP, SLA…" /></div>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {areas.map((area) => (
          <div key={area} className="p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">{area}</p>
            <div className="space-y-2">
              {list.filter((s) => s.area === area).map((s) => {
                const open = openIdx === s.i
                return (
                  <div key={s.i} className={cx('rounded-xl border transition', open ? 'border-brand-300 bg-brand-50/40 dark:border-brand-500/40 dark:bg-brand-500/5' : 'border-slate-200 dark:border-slate-800')}>
                    <button onClick={() => setOpenIdx(open ? null : s.i)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                      <Circle className="size-2 fill-current text-brand-500" />
                      <span className="flex-1 text-sm font-medium">{s.title}</span>
                      <span className="hidden gap-1 sm:flex">{s.actors.map((a) => <Badge key={a} tone={TONE[a]}>{ROLES[a].label}</Badge>)}</span>
                      <ChevronDown className={cx('size-4 text-slate-400 transition', open && 'rotate-180')} />
                    </button>
                    {open && (
                      <div className="animate-pop border-t border-slate-100 px-4 py-4 dark:border-slate-800">
                        <ol className="space-y-2">
                          {s.steps.map((st, j) => <li key={j} className="flex gap-3 text-sm"><span className="grid size-5 shrink-0 place-items-center rounded-full bg-slate-200 text-[10px] font-bold dark:bg-slate-700">{j + 1}</span>{st}</li>)}
                        </ol>
                        <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300"><strong>Result: </strong>{s.result}</div>
                        {role !== 'platform' || s.area === 'Platform' ? <Button size="sm" className="mt-3" onClick={() => navigate(s.link)}>Try it</Button> : <p className="mt-3 text-xs text-slate-500">Open a society from the switcher to try this.</p>}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
        {!list.length && <p className="p-8 text-center text-sm text-slate-500">No scenarios match.</p>}
      </div>
    </Card>
  )
}

export default function Guide() {
  const { role } = useApp()
  const [tab, setTab] = useState('flow')
  return (
    <>
      <PageHeader title="How SocietyOS works" subtitle="The data flow, who does what, and every scenario step by step." />
      <div className="mb-5"><Tabs value={tab} onChange={setTab} tabs={[{ value: 'flow', label: 'Data flow' }, { value: 'scenarios', label: 'Scenarios' }, { value: 'roles', label: 'Who does what' }, { value: 'masters', label: 'Master tables' }]} /></div>
      {tab === 'flow' && (
        <div className="grid gap-6 2xl:grid-cols-[1fr_1fr]">
          <FlowDiagram />
          {role === 'admin' ? <SetupChecklist /> : (
            <Card className="h-fit p-5 text-sm leading-relaxed">
              <p className="font-semibold">Example: one bill, end to end</p>
              <ol className="mt-3 space-y-2 text-slate-600 dark:text-slate-300">
                {['Masters: unit B-203 is a 3BHK of 1,580 sq.ft; charge heads are Maintenance ₹3.5/sq.ft, Sinking Fund ₹500, Parking ₹300/slot.', 'People: Rohan Mehta (owner) lives in B-203 and has 1 parking slot.', 'Billing: the admin generates the cycle → invoice = 1,580×3.5 + 500 + 300 = ₹6,330.', 'Resident pays ₹3,000 by UPI → invoice becomes Partial, ₹3,330 still due.', 'Outputs: B-203 ledger, dashboard collection %, defaulter risk and the activity log all update.'].map((x, i) => (
                  <li key={i} className="flex gap-3"><span className="grid size-5 shrink-0 place-items-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-700">{i + 1}</span>{x}</li>
                ))}
              </ol>
            </Card>
          )}
        </div>
      )}
      {tab === 'scenarios' && <Scenarios />}
      {tab === 'roles' && (
        <Card>
          <Table pageSize={50} rows={MATRIX.map(([what, who], i) => ({ id: i, what, who }))} columns={[
            { key: 'what', label: 'Action', render: (r) => <span className="font-medium">{r.what}</span>, nowrap: false },
            ...Object.entries(ROLES).map(([k, v]) => ({ key: k, label: v.label, align: 'center', render: (r) => (r.who.includes(k) ? <Check className="mx-auto size-4 text-emerald-500" /> : <span className="text-slate-300">–</span>) })),
          ]} />
        </Card>
      )}
      {tab === 'masters' && (
        <Card>
          <Table pageSize={50} rows={MASTER_TABLES.map(([name, fields, feeds, where], i) => ({ id: i, name, fields, feeds, where }))} columns={[
            { key: 'name', label: 'Master table', render: (r) => <span className="font-semibold">{r.name}</span> },
            { key: 'fields', label: 'Holds', nowrap: false, className: 'text-slate-500' },
            { key: 'feeds', label: 'Feeds into', nowrap: false },
            { key: 'where', label: 'Where', className: 'text-xs text-slate-500' },
          ]} />
        </Card>
      )}
    </>
  )
}
