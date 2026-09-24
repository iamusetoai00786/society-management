import { useMemo, useState } from 'react'
import { Receipt, Send, FilePlus2, CreditCard, Smartphone, Landmark, CheckCircle2, Printer, Banknote } from 'lucide-react'
import { useApp, useApi, useAction } from '../context/AppContext'
import { api } from '../api/client'
import { Card, Badge, Button, Table, PageHeader, Skeleton, Select, Modal, Tabs, Stat, inr, fmtDate, cx } from '../components/ui'

function PayModal({ invoice, onClose }) {
  const { user } = useApp()
  const [method, setMethod] = useState('UPI')
  const [stage, setStage] = useState('choose')
  const [receipt, setReceipt] = useState(null)
  const { run } = useAction()
  if (!invoice) return null
  const total = invoice.amount + invoice.lateFee
  const methods = user.role === 'admin'
    ? [['Cash', Banknote], ['Cheque', Landmark], ['UPI', Smartphone]]
    : [['UPI', Smartphone], ['Card', CreditCard], ['Net Banking', Landmark]]
  const pay = async () => {
    setStage('processing')
    try {
      const r = await run(() => api.post(`/api/invoices/${invoice.id}/pay`, { method }))
      await new Promise((res) => setTimeout(res, 600))
      setReceipt(r.payment)
      setStage('done')
    } catch {
      setStage('choose')
    }
  }
  return (
    <Modal open onClose={onClose} title={stage === 'done' ? 'Payment receipt' : user.role === 'admin' ? 'Record payment' : 'Pay maintenance bill'}>
      {stage === 'done' ? (
        <div className="text-center">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15"><CheckCircle2 className="size-9" /></div>
          <p className="mt-3 text-2xl font-bold">{inr(receipt.amount)}</p>
          <p className="text-sm text-slate-500">Paid via {receipt.method}</p>
          <div className="mt-5 space-y-2 rounded-xl bg-slate-50 p-4 text-left text-sm dark:bg-slate-800/60">
            {[['Receipt no.', receipt.id.toUpperCase()], ['Invoice', invoice.id], ['Unit', invoice.unitId], ['Reference', receipt.reference], ['Date', fmtDate(receipt.paidAt)]].map(([k, v]) => (
              <div key={k} className="flex justify-between"><span className="text-slate-500">{k}</span><span className="font-medium">{v}</span></div>
            ))}
          </div>
          <div className="mt-5 flex justify-center gap-2">
            <Button variant="secondary" icon={Printer} onClick={() => window.print()}>Print</Button>
            <Button onClick={onClose}>Done</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
            <div className="flex justify-between text-sm"><span className="text-slate-500">{invoice.id}</span><span>{invoice.period}</span></div>
            {invoice.items.map((i) => <div key={i.head} className="mt-2 flex justify-between text-sm"><span>{i.head}</span><span>{inr(i.amount)}</span></div>)}
            {invoice.lateFee > 0 && <div className="mt-2 flex justify-between text-sm text-rose-600"><span>Late fee</span><span>{inr(invoice.lateFee)}</span></div>}
            <div className="mt-3 flex justify-between border-t border-slate-200 pt-3 font-bold dark:border-slate-700"><span>Total</span><span>{inr(total)}</span></div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {methods.map(([m, I]) => (
              <button key={m} onClick={() => setMethod(m)} className={cx('flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-medium transition', method === m ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-white' : 'border-slate-200 dark:border-slate-700')}>
                <I className="size-5" />{m}
              </button>
            ))}
          </div>
          <Button size="lg" className="w-full" loading={stage === 'processing'} onClick={pay}>{user.role === 'admin' ? `Record ${inr(total)} received` : `Pay ${inr(total)}`}</Button>
          <p className="text-center text-[11px] text-slate-400">Demo payment: no money moves. Production uses a PCI-DSS payment gateway.</p>
        </div>
      )}
    </Modal>
  )
}

export default function Billing() {
  const { user } = useApp()
  const admin = user.role === 'admin'
  const [tab, setTab] = useState(admin ? 'unpaid' : 'all')
  const [period, setPeriod] = useState('')
  const [paying, setPaying] = useState(null)
  const { data: invoices, loading } = useApi('/api/invoices')
  const { data: payments } = useApi('/api/payments')
  const { run, busy } = useAction()
  const periods = useMemo(() => [...new Set((invoices || []).map((i) => i.period))], [invoices])
  const rows = (invoices || []).filter((i) => (tab === 'all' || tab === 'payments' || i.status === tab) && (!period || i.period === period))
  const unpaid = (invoices || []).filter((i) => i.status === 'unpaid')

  return (
    <>
      <PageHeader title="Billing & Payments" subtitle={admin ? 'Generate bills, track collections and send reminders.' : `Maintenance bills for ${user.unitId}`}
        actions={admin && <>
          <Button variant="secondary" icon={Send} loading={busy} onClick={() => run(() => api.post('/api/invoices/remind-all'), (r) => `Reminders sent to ${r.count} units via push, SMS & WhatsApp`)}>Remind all</Button>
          <Button icon={FilePlus2} onClick={() => run(() => api.post('/api/invoices/generate', {}), (r) => `${r.count} invoices generated for ${r.period} (${inr(r.total)})`)}>Generate next cycle</Button>
        </>} />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label={admin ? 'Outstanding' : 'You owe'} value={inr(unpaid.reduce((s, i) => s + i.amount + i.lateFee, 0))} sub={`${unpaid.length} unpaid invoices`} icon={Receipt} tone="amber" />
        <Stat label="Paid (all time)" value={inr((payments || []).reduce((s, p) => s + p.amount, 0))} sub={`${payments?.length ?? 0} payments`} icon={CheckCircle2} tone="green" />
        <Stat label="Digital share" value={payments?.length ? `${Math.round((payments.filter((p) => !['Cash', 'Cheque'].includes(p.method)).length / payments.length) * 100)}%` : '—'} sub="UPI, card & net banking" icon={Smartphone} tone="brand" />
      </div>

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <Tabs value={tab} onChange={setTab} tabs={[{ value: 'unpaid', label: 'Unpaid', count: unpaid.length }, { value: 'paid', label: 'Paid' }, { value: 'all', label: 'All' }, { value: 'payments', label: 'Payment history' }]} />
          {tab !== 'payments' && <Select className="sm:w-44" value={period} onChange={(e) => setPeriod(e.target.value)} options={[{ value: '', label: 'All periods' }, ...periods.map((p) => ({ value: p, label: p }))]} />}
        </div>
        {loading && !invoices ? <Skeleton rows={6} /> : tab === 'payments' ? (
          <Table rows={payments || []} columns={[
            { key: 'id', label: 'Receipt', render: (p) => <span className="font-mono text-xs">{p.id.toUpperCase()}</span> },
            { key: 'unitId', label: 'Unit' },
            { key: 'invoiceId', label: 'Invoice', className: 'text-xs text-slate-500' },
            { key: 'method', label: 'Method', render: (p) => <Badge tone="blue">{p.method}</Badge> },
            { key: 'amount', label: 'Amount', render: (p) => <span className="font-semibold">{inr(p.amount)}</span> },
            { key: 'paidAt', label: 'Date', render: (p) => fmtDate(p.paidAt) },
          ]} />
        ) : (
          <Table rows={rows.slice(0, 150)} empty="No invoices" columns={[
            { key: 'id', label: 'Invoice', render: (i) => <span className="font-mono text-xs">{i.id}</span> },
            ...(admin ? [{ key: 'unitId', label: 'Unit', render: (i) => <span className="font-semibold">{i.unitId}</span> }] : []),
            { key: 'period', label: 'Period' },
            { key: 'amount', label: 'Amount', render: (i) => <span className="font-semibold">{inr(i.amount + i.lateFee)}{i.lateFee > 0 && <span className="ml-1 text-xs font-normal text-rose-500">(+{inr(i.lateFee)} late)</span>}</span> },
            { key: 'dueDate', label: 'Due', render: (i) => fmtDate(i.dueDate, { day: 'numeric', month: 'short' }) },
            { key: 'status', label: 'Status', render: (i) => <Badge>{i.status}</Badge> },
            { key: 'x', label: '', render: (i) => i.status === 'unpaid' ? (
              <div className="flex gap-1">
                <Button size="sm" onClick={() => setPaying(i)}>{admin ? 'Record' : 'Pay'}</Button>
                {admin && <Button size="sm" variant="ghost" icon={Send} onClick={() => run(() => api.post(`/api/invoices/${i.id}/remind`), `Reminder sent to ${i.unitId}`)} />}
              </div>
            ) : <span className="text-xs text-slate-400">Paid {fmtDate(i.paidAt, { day: 'numeric', month: 'short' })}</span> },
          ]} />
        )}
      </Card>
      {paying && <PayModal invoice={paying} onClose={() => setPaying(null)} />}
    </>
  )
}
