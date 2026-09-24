import { useMemo, useState } from 'react'
import { Receipt, Send, FilePlus2, CreditCard, Smartphone, Landmark, CheckCircle2, Printer, Banknote, Percent, Ban, Timer, Search, BookOpen } from 'lucide-react'
import { useApp, useApi, useAction } from '../context/AppContext'
import { api } from '../api/client'
import { Card, Badge, Button, Table, PageHeader, Skeleton, Select, Modal, Tabs, Stat, Input, Field, UnitLink, inr, fmtDate, cx } from '../components/ui'

function PayModal({ invoice, onClose }) {
  const { user } = useApp()
  const admin = user.role !== 'resident'
  const [method, setMethod] = useState(admin ? 'Cash' : 'UPI')
  const [amount, setAmount] = useState(invoice.balance)
  const [reference, setReference] = useState('')
  const [stage, setStage] = useState('choose')
  const [receipt, setReceipt] = useState(null)
  const { run } = useAction()
  const methods = admin ? [['Cash', Banknote], ['Cheque', Landmark], ['UPI', Smartphone]] : [['UPI', Smartphone], ['Card', CreditCard], ['Net Banking', Landmark]]
  const pay = async () => {
    setStage('processing')
    try {
      const r = await run(() => api.post(`/api/invoices/${invoice.id}/pay`, { method, amount: Number(amount), reference: reference || undefined }))
      setReceipt(r)
      setStage('done')
    } catch {
      setStage('choose')
    }
  }
  return (
    <Modal open onClose={onClose} title={stage === 'done' ? 'Payment receipt' : admin ? 'Record a payment' : 'Pay maintenance bill'}>
      {stage === 'done' ? (
        <div className="text-center">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15"><CheckCircle2 className="size-9" /></div>
          <p className="mt-3 text-2xl font-bold">{inr(receipt.payment.amount)}</p>
          <p className="text-sm text-slate-500">{receipt.payment.method} · {receipt.invoice.status === 'paid' ? 'Invoice fully paid' : `${inr(receipt.invoice.balance)} still due`}</p>
          <div className="mt-5 space-y-2 rounded-xl bg-slate-50 p-4 text-left text-sm dark:bg-slate-800/60">
            {[['Receipt no.', receipt.payment.id.toUpperCase()], ['Invoice', invoice.id], ['Unit', invoice.unitId], ['Reference', receipt.payment.reference], ['Recorded by', receipt.payment.recordedBy], ['Date', fmtDate(receipt.payment.paidAt)]].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4"><span className="text-slate-500">{k}</span><span className="text-right font-medium">{v}</span></div>
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
            <div className="flex justify-between text-sm"><span className="font-mono text-xs text-slate-500">{invoice.id}</span><span>{invoice.period}</span></div>
            {invoice.items.map((i) => <div key={i.head} className="mt-2 flex justify-between text-sm"><span>{i.head}</span><span>{inr(i.amount)}</span></div>)}
            {invoice.lateFee > 0 && <div className="mt-2 flex justify-between text-sm text-rose-600"><span>Late fee</span><span>{inr(invoice.lateFee)}</span></div>}
            {invoice.waived > 0 && <div className="mt-2 flex justify-between text-sm text-emerald-600"><span>Waived</span><span>−{inr(invoice.waived)}</span></div>}
            {invoice.paid > 0 && <div className="mt-2 flex justify-between text-sm text-emerald-600"><span>Already paid</span><span>−{inr(invoice.paid)}</span></div>}
            <div className="mt-3 flex justify-between border-t border-slate-200 pt-3 font-bold dark:border-slate-700"><span>Balance</span><span>{inr(invoice.balance)}</span></div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {methods.map(([m, I]) => (
              <button key={m} onClick={() => setMethod(m)} className={cx('flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-medium transition', method === m ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-white' : 'border-slate-200 dark:border-slate-700')}>
                <I className="size-5" />{m}
              </button>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Amount (₹)" hint="Enter less to pay part now"><Input type="number" min={1} max={invoice.balance} value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
            {admin && <Field label={method === 'Cheque' ? 'Cheque no.' : 'Reference'}><Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Optional" /></Field>}
          </div>
          <Button size="lg" className="w-full" loading={stage === 'processing'} onClick={pay} disabled={!amount || amount <= 0 || amount > invoice.balance}>{admin ? `Record ${inr(amount || 0)} received` : `Pay ${inr(amount || 0)}`}</Button>
          <p className="text-center text-[11px] text-slate-400">Demo payment: no money moves. Production uses a PCI-DSS payment gateway.</p>
        </div>
      )}
    </Modal>
  )
}

function GenerateModal({ onClose }) {
  const now = new Date()
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const [period, setPeriod] = useState(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`)
  const { data: pv, loading } = useApi(`/api/invoices/preview?period=${period}`)
  const { run, busy } = useAction()
  const go = async () => {
    await run(() => api.post('/api/invoices/generate', { period }), (r) => `${r.count} invoices generated for ${r.period} (${inr(r.total)})`)
    onClose()
  }
  const basis = (h) => (h.basis === 'per_sqft' ? `₹${h.rate} × sq.ft` : h.basis === 'per_parking' ? `₹${h.rate} × slots` : `₹${h.rate} flat`)
  return (
    <Modal open onClose={onClose} wide title="Generate bill cycle" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={busy} disabled={!pv || pv.exists || !pv.units} onClick={go}>Generate {pv?.units || ''} invoices</Button></>}>
      <div className="space-y-5">
        <Field label="Billing month"><Input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} /></Field>
        {loading || !pv ? <Skeleton rows={3} /> : (
          <>
            {pv.exists && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">Invoices for {pv.period} already exist. Cancel them first if you need to re-run.</p>}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-slate-50 py-3 dark:bg-slate-800/60"><p className="text-xl font-bold">{pv.units}</p><p className="text-[11px] text-slate-500">Occupied units billed</p></div>
              <div className="rounded-xl bg-slate-50 py-3 dark:bg-slate-800/60"><p className="text-xl font-bold">{pv.skippedVacant}</p><p className="text-[11px] text-slate-500">Vacant, skipped</p></div>
              <div className="rounded-xl bg-brand-50 py-3 dark:bg-brand-500/10"><p className="text-xl font-bold text-brand-700 dark:text-white">{inr(pv.total)}</p><p className="text-[11px] text-slate-500">Total to bill</p></div>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold">From your charge heads</p>
              <div className="overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800">
                {pv.heads.map((h) => <div key={h.name} className="flex justify-between border-b border-slate-100 px-4 py-2 text-sm last:border-0 dark:border-slate-800"><span>{h.name} <span className="text-xs text-slate-500">({basis(h)})</span></span><span className="font-medium">{inr(h.total)}</span></div>)}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold">Sample bills</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {pv.sample.map((x) => (
                  <div key={x.unitId} className="rounded-xl border border-slate-100 p-3 text-xs dark:border-slate-800">
                    <p className="font-semibold">{x.unitId} <span className="font-normal text-slate-500">· {x.type}, {x.areaSqft} sq.ft</span></p>
                    {x.lines.map((l) => <p key={l.head} className="flex justify-between"><span>{l.head}</span><span>{inr(l.amount)}</span></p>)}
                    <p className="mt-1 flex justify-between border-t border-slate-100 pt-1 font-semibold dark:border-slate-800"><span>Total</span><span>{inr(x.lines.reduce((a, l) => a + l.amount, 0))}</span></p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}

export default function Billing() {
  const { user, openUnit, role } = useApp()
  const admin = role === 'admin'
  const [tab, setTab] = useState('open')
  const [period, setPeriod] = useState('')
  const [q, setQ] = useState('')
  const [paying, setPaying] = useState(null)
  const [gen, setGen] = useState(false)
  const { data: invoices, loading } = useApi('/api/invoices')
  const { data: payments } = useApi('/api/payments')
  const { run, busy } = useAction()
  const list = invoices || []
  const periods = useMemo(() => [...new Set(list.map((i) => i.period))], [list])
  const open = list.filter((i) => i.status === 'unpaid' || i.status === 'partial')
  const match = (i) => (tab === 'all' || (tab === 'open' ? open.includes(i) : i.status === tab)) && (!period || i.period === period) && (!q || i.unitId.toLowerCase().includes(q.toLowerCase()))
  const rows = list.filter(match)
  const curPeriod = periods[0]
  const cur = list.filter((i) => i.period === curPeriod && i.status !== 'cancelled')

  return (
    <>
      <PageHeader title="Billing & Payments" subtitle={admin ? 'Charge heads → invoices → payments → unit ledger.' : `Maintenance bills for ${user.unitId}`}
        actions={admin ? <>
          <Button variant="secondary" icon={Timer} loading={busy} onClick={() => run(() => api.post('/api/invoices/apply-late-fees'), (r) => (r.count ? `Late fees of ${inr(r.total)} applied to ${r.count} invoices` : 'No invoices past grace period'))}>Apply late fees</Button>
          <Button variant="secondary" icon={Send} onClick={() => run(() => api.post('/api/invoices/remind-all'), (r) => `Reminders sent to ${r.count} units via push, SMS & WhatsApp`)}>Remind all</Button>
          <Button icon={FilePlus2} onClick={() => setGen(true)}>Generate bills</Button>
        </> : <Button variant="secondary" icon={BookOpen} onClick={() => openUnit(user.unitId)}>My statement</Button>} />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label={admin ? 'Outstanding' : 'You owe'} value={inr(open.reduce((a, i) => a + i.balance, 0))} sub={`${open.length} open invoice${open.length === 1 ? '' : 's'} (${open.filter((i) => i.status === 'partial').length} part-paid)`} icon={Receipt} tone="amber" />
        <Stat label={`Collected · ${curPeriod || '—'}`} value={inr(cur.reduce((a, i) => a + i.paid, 0))} sub={`of ${inr(cur.reduce((a, i) => a + i.amount, 0))} billed`} icon={CheckCircle2} tone="green" />
        <Stat label="Payments (all time)" value={inr((payments || []).reduce((a, p) => a + p.amount, 0))} sub={`${payments?.length ?? 0} payments`} icon={Banknote} tone="sky" />
        <Stat label="Digital share" value={payments?.length ? `${Math.round((payments.filter((p) => !['Cash', 'Cheque'].includes(p.method)).length / payments.length) * 100)}%` : '—'} sub="UPI, card & net banking" icon={Smartphone} tone="brand" />
      </div>

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 xl:flex-row xl:items-center xl:justify-between dark:border-slate-800">
          <Tabs value={tab} onChange={setTab} tabs={[{ value: 'open', label: 'Open', count: open.length }, { value: 'paid', label: 'Paid' }, { value: 'cancelled', label: 'Cancelled' }, { value: 'all', label: 'All' }, { value: 'payments', label: 'Payment history' }]} />
          {tab !== 'payments' && (
            <div className="flex gap-2">
              {admin && <div className="relative"><Search className="absolute left-3 top-2.5 size-4 text-slate-400" /><Input className="w-40 pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Unit" /></div>}
              <Select className="w-40" value={period} onChange={(e) => setPeriod(e.target.value)} options={[{ value: '', label: 'All periods' }, ...periods.map((p) => ({ value: p, label: p }))]} />
            </div>
          )}
        </div>
        {loading && !invoices ? <Skeleton rows={6} /> : tab === 'payments' ? (
          <Table rows={payments || []} columns={[
            { key: 'id', label: 'Receipt', render: (p) => <span className="font-mono text-xs">{p.id.toUpperCase()}</span> },
            { key: 'unitId', label: 'Unit', render: (p) => <UnitLink id={p.unitId} /> },
            { key: 'invoiceId', label: 'Invoice', className: 'font-mono text-xs text-slate-500' },
            { key: 'method', label: 'Method', render: (p) => <Badge tone="blue">{p.method}</Badge> },
            { key: 'recordedBy', label: 'Recorded by', className: 'text-slate-500' },
            { key: 'paidAt', label: 'Date', render: (p) => fmtDate(p.paidAt) },
            { key: 'amount', label: 'Amount', align: 'right', render: (p) => <span className="font-semibold">{inr(p.amount)}</span> },
          ]} />
        ) : (
          <Table rows={rows} empty="No invoices here" columns={[
            { key: 'id', label: 'Invoice', render: (i) => <span className="font-mono text-xs">{i.id}</span> },
            ...(admin ? [{ key: 'unitId', label: 'Unit', render: (i) => <UnitLink id={i.unitId} /> }] : []),
            { key: 'period', label: 'Period' },
            { key: 'dueDate', label: 'Due', render: (i) => fmtDate(i.dueDate, { day: 'numeric', month: 'short' }) },
            { key: 'amount', label: 'Billed', align: 'right', render: (i) => inr(i.amount) },
            { key: 'lateFee', label: 'Late fee', align: 'right', render: (i) => (i.lateFee ? <span className={i.waived ? 'text-slate-400 line-through' : 'text-rose-600'}>{inr(i.lateFee)}</span> : <span className="text-slate-300">—</span>) },
            { key: 'paid', label: 'Paid', align: 'right', render: (i) => (i.paid ? <span className="text-emerald-600">{inr(i.paid)}</span> : <span className="text-slate-300">—</span>) },
            { key: 'balance', label: 'Balance', align: 'right', render: (i) => <span className={cx('font-semibold', i.balance ? 'text-slate-900 dark:text-white' : 'text-slate-400')}>{inr(i.balance)}</span> },
            { key: 'status', label: 'Status', render: (i) => <Badge>{i.status}</Badge> },
            { key: 'x', label: '', render: (i) => {
              const isOpen = i.status === 'unpaid' || i.status === 'partial'
              const slot = 'grid size-7 place-items-center rounded-lg'
              const icon = (show, title, Icon, cls, onClick) => (show ? <button title={title} onClick={onClick} className={cx(slot, 'text-slate-400', cls)}><Icon className="size-4" /></button> : admin && <span className={slot} />)
              return (
                <div className="flex items-center justify-end gap-1">
                  {isOpen ? <Button size="sm" className="w-16" onClick={() => setPaying(i)}>{admin ? 'Record' : 'Pay'}</Button> : <span className="w-16 text-right text-xs text-slate-400" title={i.cancelReason}>{i.status === 'paid' ? fmtDate(i.paidAt, { day: 'numeric', month: 'short' }) : 'Cancelled'}</span>}
                  {icon(admin && isOpen, 'Send reminder', Send, 'hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800', () => run(() => api.post(`/api/invoices/${i.id}/remind`), `Reminder sent to ${i.unitId}`))}
                  {icon(admin && i.lateFee > i.waived, 'Waive late fee', Percent, 'hover:bg-emerald-50 hover:text-emerald-600', () => run(() => api.post(`/api/invoices/${i.id}/waive-late-fee`), 'Late fee waived'))}
                  {icon(admin && i.status === 'unpaid' && !i.paid, 'Cancel invoice', Ban, 'hover:bg-rose-50 hover:text-rose-600', () => { const reason = prompt('Reason for cancelling this invoice?', 'Raised in error'); if (reason) run(() => api.post(`/api/invoices/${i.id}/cancel`, { reason }), 'Invoice cancelled') })}
                </div>
              )
            } },
          ]} />
        )}
      </Card>
      {paying && <PayModal invoice={paying} onClose={() => setPaying(null)} />}
      {gen && <GenerateModal onClose={() => setGen(false)} />}
    </>
  )
}
