import { Link, useNavigate } from 'react-router-dom'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Wallet, Users, Wrench, DoorOpen, AlertTriangle, CheckCircle2, Info, Sparkles, ArrowRight, Receipt, CalendarDays, Megaphone, ShieldAlert, Clock } from 'lucide-react'
import { useApp, useApi, useAction } from '../context/AppContext'
import { api } from '../api/client'
import { Card, CardHeader, Stat, Badge, Button, AIBadge, inr, ago, fmtDate, Skeleton, PageHeader, cx } from '../components/ui'
import Visitors from './Visitors'

const PIE = ['#6366f1', '#a855f7', '#ec4899', '#f59e0b', '#10b981', '#0ea5e9', '#64748b']
const tip = { contentStyle: { borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }, formatter: (v) => inr(v) }

export function InsightsList({ limit }) {
  const { data, loading } = useApi('/api/ai/insights')
  const navigate = useNavigate()
  if (loading && !data) return <Skeleton rows={3} />
  const icon = { warning: AlertTriangle, danger: ShieldAlert, success: CheckCircle2, info: Info }
  const color = { warning: 'text-amber-500 bg-amber-50 dark:bg-amber-500/10', danger: 'text-rose-500 bg-rose-50 dark:bg-rose-500/10', success: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10', info: 'text-sky-500 bg-sky-50 dark:bg-sky-500/10' }
  return (
    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
      {(data || []).slice(0, limit).map((i) => {
        const I = icon[i.severity]
        return (
          <li key={i.id} className="flex gap-3 px-5 py-4">
            <div className={cx('grid size-9 shrink-0 place-items-center rounded-xl', color[i.severity])}><I className="size-4.5" /></div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{i.title}</p>
              <p className="mt-0.5 text-sm text-slate-500">{i.detail}</p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => navigate(i.link)} className="self-center">{i.action}</Button>
          </li>
        )
      })}
    </ul>
  )
}

function AdminDashboard() {
  const { user, askAssistant } = useApp()
  const { data: s } = useApi('/api/dashboard/summary')
  const { data: tickets } = useApi('/api/tickets')
  const { data: expenses } = useApi('/api/expenses?status=pending')
  const { run } = useAction()
  const hour = new Date().getHours()
  return (
    <>
      <PageHeader title={`Good ${hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'}, ${user.name.split(' ')[0]} 👋`} subtitle="Here’s what’s happening at Green Valley Residency today."
        actions={<><Button variant="secondary" icon={Receipt} onClick={() => run(() => api.post('/api/invoices/remind-all'), (r) => `Reminders sent to ${r.count} units`)}>Remind defaulters</Button><Button variant="ai" icon={Sparkles} onClick={() => askAssistant('Give me a summary of the society status')}>AI daily brief</Button></>} />

      {!s ? <Card><Skeleton rows={3} /></Card> : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Collected this month" value={inr(s.collectedThisMonth)} sub={`${Math.round(s.collectionRate * 100)}% of units paid`} icon={Wallet} tone="green" trend={s.collectionRate > 0.75 ? 'up' : 'down'} />
            <Stat label="Outstanding dues" value={inr(s.outstanding)} sub="All periods, incl. late fees" icon={Receipt} tone="amber" />
            <Stat label="Open tickets" value={s.openTickets} sub="Across all categories" icon={Wrench} tone="rose" />
            <Stat label="Visitors today" value={s.visitorsToday} sub={`${s.visitorsInside} currently inside`} icon={DoorOpen} tone="sky" />
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader title="Collections vs expenses" subtitle="Last 6 billing cycles" icon={Wallet} />
              <div className="h-72 p-4">
                <ResponsiveContainer>
                  <AreaChart data={s.collections} margin={{ left: 10, right: 10, top: 10 }}>
                    <defs>
                      <linearGradient id="gc" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#6366f1" stopOpacity={0.35} /><stop offset="1" stopColor="#6366f1" stopOpacity={0} /></linearGradient>
                      <linearGradient id="ge" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ec4899" stopOpacity={0.25} /><stop offset="1" stopColor="#ec4899" stopOpacity={0} /></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={(v) => `₹${v / 100000}L`} tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip {...tip} />
                    <Area type="monotone" dataKey="billed" name="Billed" stroke="#cbd5e1" fill="none" strokeDasharray="4 4" />
                    <Area type="monotone" dataKey="collected" name="Collected" stroke="#6366f1" strokeWidth={2.5} fill="url(#gc)" />
                    <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#ec4899" strokeWidth={2} fill="url(#ge)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card>
              <CardHeader title="Open tickets by type" icon={Wrench} />
              <div className="h-72 p-2">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={s.ticketsByCategory} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                      {s.ticketsByCategory.map((_, i) => <Cell key={i} fill={PIE[i % PIE.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={tip.contentStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="-mt-4 flex flex-wrap justify-center gap-x-3 gap-y-1 px-2 text-xs">
                  {s.ticketsByCategory.map((c, i) => <span key={c.name} className="flex items-center gap-1"><span className="size-2 rounded-full" style={{ background: PIE[i % PIE.length] }} />{c.name} ({c.value})</span>)}
                </div>
              </div>
            </Card>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-3">
            <Card className="ai-border xl:col-span-2">
              <CardHeader title={<span className="flex items-center gap-2">AI Insights <AIBadge>Live</AIBadge></span>} subtitle="Anomalies and recommendations from your data" icon={Sparkles} action={<Link to="/insights" className="text-sm font-medium text-brand-600">See all</Link>} />
              <InsightsList limit={4} />
            </Card>
            <Card>
              <CardHeader title="Visitors this week" icon={DoorOpen} />
              <div className="h-56 p-4">
                <ResponsiveContainer>
                  <BarChart data={s.visitorsByDay}>
                    <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tip.contentStyle} cursor={{ fill: '#6366f111' }} />
                    <Bar dataKey="count" name="Visitors" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-3 border-t border-slate-100 text-center dark:border-slate-800">
                {[['Units', s.units], ['Residents', s.residents], ['Bookings today', s.bookingsToday]].map(([l, v]) => (
                  <div key={l} className="py-3"><p className="text-lg font-bold">{v}</p><p className="text-[11px] text-slate-500">{l}</p></div>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Recent tickets" icon={Wrench} action={<Link to="/helpdesk" className="text-sm font-medium text-brand-600">View all</Link>} />
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {(tickets || []).slice(0, 5).map((t) => (
              <li key={t.id} className="flex items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{t.title}</p>
                  <p className="text-xs text-slate-500">{t.id} · {t.unitId} · {ago(t.createdAt)}</p>
                </div>
                <Badge>{t.priority}</Badge>
                <Badge>{t.status}</Badge>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader title="Awaiting your approval" icon={Clock} subtitle="Expenses above ₹25,000" />
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {(expenses || []).map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{e.description}</p>
                  <p className="text-xs text-slate-500">{e.vendor} · {fmtDate(e.date)}</p>
                </div>
                <p className="font-semibold">{inr(e.amount)}</p>
                <div className="flex gap-1">
                  <Button size="sm" variant="success" onClick={() => run(() => api.post(`/api/expenses/${e.id}/approve`), 'Expense approved')}>Approve</Button>
                  <Button size="sm" variant="secondary" onClick={() => run(() => api.post(`/api/expenses/${e.id}/reject`), 'Expense rejected')}>Reject</Button>
                </div>
              </li>
            ))}
            {expenses && !expenses.length && <li className="px-5 py-10 text-center text-sm text-slate-500">Nothing pending 🎉</li>}
          </ul>
        </Card>
      </div>
    </>
  )
}

function ResidentDashboard() {
  const { user, askAssistant } = useApp()
  const navigate = useNavigate()
  const { data: s } = useApi('/api/dashboard/summary')
  const { data: pending } = useApi('/api/visitors?status=pending')
  const { data: notices } = useApi('/api/notices')
  const { data: bookings } = useApi('/api/bookings')
  const { data: tickets } = useApi('/api/tickets')
  const { run } = useAction()
  const mine = (tickets || []).filter((t) => t.unitId === user.unitId)
  return (
    <>
      <PageHeader title={`Hi ${user.name.split(' ')[0]} 👋`} subtitle={`${user.unitId} · Green Valley Residency`} />

      {pending?.map((v) => (
        <Card key={v.id} className="animate-pop mb-4 flex flex-wrap items-center gap-4 border-amber-300 bg-amber-50 p-4 dark:border-amber-500/40 dark:bg-amber-500/10">
          <div className="grid size-11 place-items-center rounded-full bg-amber-500 text-white"><DoorOpen className="size-5" /></div>
          <div className="flex-1">
            <p className="font-semibold">{v.name} is at the gate</p>
            <p className="text-sm text-slate-600 dark:text-slate-300 capitalize">{v.type}{v.company ? ` · ${v.company}` : ''} · {ago(v.checkIn)}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="success" onClick={() => run(() => api.post(`/api/visitors/${v.id}/approve`), 'Entry approved')}>Approve</Button>
            <Button variant="secondary" onClick={() => run(() => api.post(`/api/visitors/${v.id}/deny`), 'Entry denied')}>Deny</Button>
          </div>
        </Card>
      ))}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="ai-gradient p-6 text-white md:col-span-2">
          <p className="text-sm text-white/80">Your outstanding dues</p>
          <p className="mt-1 text-4xl font-bold">{s ? inr(s.myDues.total) : '…'}</p>
          <p className="mt-1 text-sm text-white/80">{s?.myDues.count ? `${s.myDues.count} bill(s) pending · due on the 10th` : 'All caught up!'}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button onClick={() => navigate('/billing')} className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-brand-700 shadow">Pay now with UPI</button>
            <button onClick={() => askAssistant('What are my dues?')} className="flex items-center gap-1.5 rounded-xl bg-white/20 px-4 py-2 text-sm font-semibold backdrop-blur"><Sparkles className="size-4" /> Explain my bill</button>
          </div>
        </Card>
        <div className="grid gap-4">
          <Stat label="My open tickets" value={mine.filter((t) => !['resolved', 'closed'].includes(t.status)).length} icon={Wrench} tone="rose" />
          <Stat label="Visitors today" value={s?.visitorsToday ?? '…'} icon={DoorOpen} tone="sky" />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[['Gate pass', DoorOpen, '/visitors?pass=1'], ['Raise ticket', Wrench, '/helpdesk?new='], ['Book amenity', CalendarDays, '/amenities'], ['Pay bills', Receipt, '/billing']].map(([l, I, to]) => (
          <button key={l} onClick={() => navigate(to)} className="flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-medium transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
            <div className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-100"><I className="size-5" /></div>{l}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Latest notices" icon={Megaphone} action={<Link to="/notices" className="text-sm font-medium text-brand-600">All</Link>} />
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {(notices || []).slice(0, 3).map((n) => (
              <li key={n.id} className="px-5 py-3">
                <p className="text-sm font-medium">{n.pinned && '📌 '}{n.title}</p>
                <p className="line-clamp-2 text-xs text-slate-500">{n.body}</p>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader title="My tickets & bookings" icon={Users} />
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {mine.slice(0, 3).map((t) => (
              <li key={t.id} className="flex items-center gap-3 px-5 py-3">
                <Wrench className="size-4 text-slate-400" />
                <p className="flex-1 truncate text-sm">{t.title}</p>
                <Badge>{t.status}</Badge>
              </li>
            ))}
            {(bookings || []).slice(0, 3).map((b) => (
              <li key={b.id} className="flex items-center gap-3 px-5 py-3">
                <CalendarDays className="size-4 text-slate-400" />
                <p className="flex-1 truncate text-sm">{b.amenityId.replace('am_', '').replace(/^\w/, (c) => c.toUpperCase())} · {fmtDate(b.date, { day: 'numeric', month: 'short' })} · {b.slot}</p>
                <Badge>{b.status}</Badge>
              </li>
            ))}
          </ul>
          <div className="border-t border-slate-100 p-4 dark:border-slate-800">
            <button onClick={() => askAssistant('')} className="flex w-full items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-left text-sm text-slate-500 hover:bg-slate-100 dark:bg-slate-800">
              <Sparkles className="size-4 text-violet-500" /> Ask AI: “Book the pool on Saturday morning”… <ArrowRight className="ml-auto size-4" />
            </button>
          </div>
        </Card>
      </div>
    </>
  )
}

export default function Dashboard() {
  const { user } = useApp()
  if (user.role === 'guard') return <Visitors />
  return user.role === 'admin' ? <AdminDashboard /> : <ResidentDashboard />
}
