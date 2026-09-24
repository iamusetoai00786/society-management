import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Plus, Wallet, TrendingUp, TrendingDown, Scale, Download, Sparkles } from 'lucide-react'
import { useApi, useAction } from '../context/AppContext'
import { api } from '../api/client'
import { Card, CardHeader, Badge, Button, Table, PageHeader, Skeleton, Input, Select, Field, Modal, Tabs, Stat, AIBadge, inr, fmtDate } from '../components/ui'

const CATS = ['Security', 'Housekeeping', 'Electricity', 'Water', 'Lift AMC', 'Gardening', 'Repairs', 'Events', 'Other']
const PIE = ['#6366f1', '#a855f7', '#ec4899', '#f59e0b', '#10b981', '#0ea5e9', '#64748b', '#ef4444']
const guessCategory = (t) => {
  const s = t.toLowerCase()
  const map = [['Electricity', ['electric', 'power', 'dhbvn', 'bill']], ['Water', ['water', 'tanker']], ['Lift AMC', ['lift', 'elevator', 'otis']], ['Security', ['guard', 'security', 'cctv']], ['Housekeeping', ['clean', 'housekeep', 'sweep']], ['Gardening', ['garden', 'plant', 'lawn']], ['Events', ['diwali', 'event', 'party', 'festival']], ['Repairs', ['repair', 'fix', 'valve', 'paint', 'plumb', 'replace']]]
  return map.find(([, k]) => k.some((w) => s.includes(w)))?.[0]
}

function AddExpense({ open, onClose }) {
  const [f, setF] = useState({ description: '', vendor: '', amount: '', category: 'Other' })
  const [auto, setAuto] = useState(false)
  const { run, busy } = useAction()
  const setDesc = (description) => {
    const g = guessCategory(description)
    setF((x) => ({ ...x, description, category: g || x.category }))
    setAuto(!!g)
  }
  const save = async () => {
    await run(() => api.post('/api/expenses', f), (r) => (r.status === 'pending' ? 'Sent to committee for approval' : 'Expense recorded'))
    setF({ description: '', vendor: '', amount: '', category: 'Other' })
    onClose()
  }
  return (
    <Modal open={open} onClose={onClose} title="Record expense" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={busy} onClick={save} disabled={!f.amount || !f.description}>Save</Button></>}>
      <div className="space-y-4">
        <Field label="Description"><Input value={f.description} onChange={(e) => setDesc(e.target.value)} placeholder="e.g. Repair of lift door sensor – Block B" /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={<span className="flex items-center gap-2">Category {auto && <AIBadge>Auto</AIBadge>}</span>}><Select value={f.category} onChange={(e) => (setF({ ...f, category: e.target.value }), setAuto(false))} options={CATS} /></Field>
          <Field label="Amount (₹)" hint="Above ₹25,000 needs committee approval"><Input type="number" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></Field>
        </div>
        <Field label="Vendor"><Input value={f.vendor} onChange={(e) => setF({ ...f, vendor: e.target.value })} /></Field>
        <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500 dark:border-slate-700">📎 Drop bill/invoice here. AI extracts the vendor, amount and GST (coming soon)</div>
      </div>
    </Modal>
  )
}

export default function Accounting() {
  const { data: report } = useApi('/api/reports/financial')
  const [tab, setTab] = useState('')
  const { data: expenses, loading } = useApi(`/api/expenses?status=${tab}`)
  const [add, setAdd] = useState(false)
  const { run } = useAction()
  const exportCsv = () => {
    const rows = [['Date', 'Category', 'Vendor', 'Description', 'Amount', 'Status'], ...(expenses || []).map((e) => [fmtDate(e.date), e.category, e.vendor, e.description, e.amount, e.status])]
    const blob = new Blob([rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')], { type: 'text/csv' })
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'expenses.csv' })
    a.click()
  }
  return (
    <>
      <PageHeader title="Accounting" subtitle="Income, expenses, approvals and financial reports." actions={<><Button variant="secondary" icon={Download} onClick={exportCsv}>Export CSV</Button><Button icon={Plus} onClick={() => setAdd(true)}>Record expense</Button></>} />
      {!report ? <Card><Skeleton /></Card> : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Total income" value={inr(report.income)} icon={TrendingUp} tone="green" />
            <Stat label="Total expenses" value={inr(report.expense)} icon={TrendingDown} tone="rose" />
            <Stat label="Net balance" value={inr(report.balance)} icon={Scale} tone="brand" sub={report.balance > 0 ? 'Surplus' : 'Deficit'} trend={report.balance > 0 ? 'up' : 'down'} />
          </div>
          <div className="mt-6 grid gap-6 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader title="Income vs expense" icon={Wallet} />
              <div className="h-72 p-4">
                <ResponsiveContainer>
                  <BarChart data={report.monthly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={(v) => `₹${v / 100000}L`} tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v) => inr(v)} contentStyle={{ borderRadius: 12, fontSize: 12 }} cursor={{ fill: '#6366f111' }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="income" name="Income" fill="#6366f1" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="expense" name="Expense" fill="#ec4899" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card>
              <CardHeader title="Where the money goes" icon={Sparkles} />
              <div className="h-56">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={report.byCategory} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                      {report.byCategory.map((_, i) => <Cell key={i} fill={PIE[i % PIE.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => inr(v)} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="space-y-1.5 px-5 pb-5 text-sm">
                {report.byCategory.slice(0, 6).map((c, i) => (
                  <li key={c.name} className="flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ background: PIE[i % PIE.length] }} /><span className="flex-1">{c.name}</span><span className="font-medium">{inr(c.value)}</span></li>
                ))}
              </ul>
            </Card>
          </div>
        </>
      )}
      <Card className="mt-6">
        <div className="border-b border-slate-100 p-4 dark:border-slate-800">
          <Tabs value={tab} onChange={setTab} tabs={[{ value: '', label: 'All' }, { value: 'pending', label: 'Pending approval' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }]} />
        </div>
        {loading && !expenses ? <Skeleton /> : (
          <Table rows={(expenses || []).slice(0, 60)} columns={[
            { key: 'date', label: 'Date', render: (e) => fmtDate(e.date) },
            { key: 'description', label: 'Description', render: (e) => <div><p className="font-medium">{e.description}</p><p className="text-xs text-slate-500">{e.vendor}</p></div> },
            { key: 'category', label: 'Category', render: (e) => <Badge tone="purple">{e.category}</Badge> },
            { key: 'amount', label: 'Amount', render: (e) => <span className="font-semibold">{inr(e.amount)}</span> },
            { key: 'status', label: 'Status', render: (e) => <Badge>{e.status}</Badge> },
            { key: 'x', label: '', render: (e) => e.status === 'pending' && (
              <div className="flex gap-1">
                <Button size="sm" variant="success" onClick={() => run(() => api.post(`/api/expenses/${e.id}/approve`), 'Approved')}>Approve</Button>
                <Button size="sm" variant="secondary" onClick={() => run(() => api.post(`/api/expenses/${e.id}/reject`), 'Rejected')}>Reject</Button>
              </div>
            ) },
          ]} />
        )}
      </Card>
      <AddExpense open={add} onClose={() => setAdd(false)} />
    </>
  )
}
