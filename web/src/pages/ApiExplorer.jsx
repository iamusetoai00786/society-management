import { useMemo, useState } from 'react'
import { Code2, Play, Search, Copy } from 'lucide-react'
import { routes } from '../api/mockServer'
import { api, getToken } from '../api/client'
import { useApp } from '../context/AppContext'
import { Card, CardHeader, Button, PageHeader, Input, Textarea, cx } from '../components/ui'

const M = { GET: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400', POST: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400', PUT: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400', PATCH: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400', DELETE: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400' }
const SAMPLE = {
  'POST /api/auth/login': { userId: 'usr_gv_resident_1' },
  'POST /api/platform/societies': { name: 'Test Society', code: 'TS', city: 'Chennai', blocks: [{ code: 'A', name: 'Block A', floors: 3, unitsPerFloor: 4 }], unitTypes: [{ name: '2BHK', areaSqft: 1000 }], admin: { name: 'Test Admin' } },
  'POST /api/ai/structure': { text: '3 towers A, B, C with 10 floors and 4 flats per floor, 2BHK and 3BHK' },
  'POST /api/ai/explain-ledger': { unitId: 'B-203' },
  'POST /api/masters/:type': { name: 'Water', basis: 'fixed', rate: 300, active: true },
  'POST /api/units': { blockId: '', floor: 5, number: 1, unitTypeId: '' },
  'POST /api/invoices/:id/cancel': { reason: 'Raised in error' },
  'PATCH /api/parking/:id': { unitId: 'B-203' },
  'PATCH /api/platform/societies/:id': { plan: 'Premium' },
  'POST /api/ai/chat': { message: 'Who are the top defaulters?' },
  'POST /api/ai/classify-ticket': { title: 'Water leaking from ceiling since 2 days' },
  'POST /api/ai/draft-notice': { prompt: 'Diwali celebration on 20th October', tone: 'friendly' },
  'POST /api/tickets': { title: 'Streetlight not working near Block B', description: '' },
  'POST /api/visitors': { name: 'Amazon Partner', unitId: 'B-203', type: 'delivery', company: 'Amazon' },
  'POST /api/visitors/preapprove': { name: 'Anita Rao', phone: '+91 98111 00000' },
  'POST /api/visitors/verify-code': { code: '482913' },
  'POST /api/visitors/:id/approve': {},
  'POST /api/invoices/:id/pay': { method: 'UPI', amount: 1000 },
  'POST /api/bookings': { amenityId: '', date: new Date().toISOString().slice(0, 10), slot: '06:00-07:00' },
  'POST /api/expenses': { category: 'Repairs', vendor: 'AquaFix', description: 'Pump repair', amount: 12000 },
  'POST /api/notices': { title: 'Test notice', body: 'Hello residents' },
  'POST /api/polls': { question: 'Paint colour?', options: ['Cream', 'Grey'], days: 5 },
  'POST /api/residents': { name: 'Test Resident', unitId: 'A-102', type: 'tenant', leaseEnd: '2027-03-31', appAccess: true },
  'POST /api/sos': { type: 'Medical', message: 'Test alert' },
}

export default function ApiExplorer() {
  const { refresh, society } = useApp()
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(routes.find((r) => r.path === '/api/dashboard/summary'))
  const [path, setPath] = useState(sel.path)
  const [body, setBody] = useState('')
  const [res, setRes] = useState(null)
  const [busy, setBusy] = useState(false)
  const groups = useMemo(() => {
    const g = {}
    routes.filter((r) => `${r.method} ${r.path} ${r.description}`.toLowerCase().includes(q.toLowerCase())).forEach((r) => (g[r.group] ||= []).push(r))
    return g
  }, [q])
  const pick = (r) => {
    setSel(r)
    const code = society?.code || 'GV'
    const month = new Date().toISOString().slice(0, 7).replace('-', '')
    const sample = r.path.includes('invoices') ? `INV-${code}-${month}-${code === 'GV' ? 'B-203' : code === 'LV' ? 'T1-203' : 'V-07'}` : r.path.includes('units') ? (code === 'LV' ? 'T1-203' : code === 'SE' ? 'V-07' : 'B-203') : r.path.includes('tickets') ? `TCK-${code}-1040` : ':id'
    setPath(r.path.replace(':type', 'charge-heads').replace(':id', sample))
    setBody(SAMPLE[`${r.method} ${r.path}`] ? JSON.stringify(SAMPLE[`${r.method} ${r.path}`], null, 2) : r.method === 'GET' || r.method === 'DELETE' ? '' : '{}')
    setRes(null)
  }
  const send = async () => {
    setBusy(true)
    const t = performance.now()
    try {
      const parsed = body.trim() ? JSON.parse(body) : undefined
      const data = await api.raw(sel.method, path, parsed)
      setRes({ status: 200, ms: Math.round(performance.now() - t), data })
      if (sel.method !== 'GET') refresh()
    } catch (e) {
      setRes({ status: e.status || 400, ms: Math.round(performance.now() - t), data: { error: e.message } })
    }
    setBusy(false)
  }
  const curl = `curl -X ${sel.method} "$API_URL${path}" \\\n  -H "Authorization: Bearer ${getToken()}"${body.trim() ? ` \\\n  -H "Content-Type: application/json" \\\n  -d '${body.replace(/\s+/g, ' ')}'` : ''}`
  return (
    <>
      <PageHeader title="API Explorer" subtitle={`${routes.length} mock REST endpoints. Try them live; changes show up across the app.`} />
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <div className="border-b border-slate-100 p-4 dark:border-slate-800">
            <div className="relative"><Search className="absolute left-3 top-2.5 size-4 text-slate-400" /><Input className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter endpoints" /></div>
          </div>
          <div className="scrollbar-thin max-h-[70vh] overflow-y-auto p-2">
            {Object.entries(groups).map(([g, list]) => (
              <div key={g} className="mb-3">
                <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{g}</p>
                {list.map((r) => (
                  <button key={r.method + r.path} onClick={() => pick(r)} className={cx('flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left', sel === r ? 'bg-slate-100 dark:bg-slate-800' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50')}>
                    <span className={cx('w-14 shrink-0 rounded px-1.5 py-0.5 text-center text-[10px] font-bold', M[r.method])}>{r.method}</span>
                    <span className="truncate font-mono text-xs">{r.path}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </Card>
        <div className="space-y-6 lg:col-span-3">
          <Card>
            <CardHeader title={<span className="flex items-center gap-2"><span className={cx('rounded px-1.5 py-0.5 text-xs font-bold', M[sel.method])}>{sel.method}</span><span className="font-mono text-sm">{sel.path}</span></span>} subtitle={sel.description} icon={Code2} />
            <div className="space-y-4 p-5">
              <div className="flex gap-2">
                <Input className="font-mono text-xs" value={path} onChange={(e) => setPath(e.target.value)} />
                <Button icon={Play} loading={busy} onClick={send}>Send</Button>
              </div>
              {sel.method !== 'GET' && sel.method !== 'DELETE' && <Textarea rows={5} className="font-mono text-xs" value={body} onChange={(e) => setBody(e.target.value)} placeholder="JSON body" />}
              <div className="relative rounded-xl bg-slate-900 p-4 font-mono text-xs text-slate-300">
                <button onClick={() => navigator.clipboard?.writeText(curl)} className="absolute right-3 top-3 text-slate-500 hover:text-white" aria-label="Copy curl"><Copy className="size-4" /></button>
                <pre className="whitespace-pre-wrap">{curl}</pre>
              </div>
            </div>
          </Card>
          {res && (
            <Card className="animate-pop overflow-hidden">
              <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3 text-sm dark:border-slate-800">
                <span className={cx('rounded-full px-2 py-0.5 text-xs font-bold', res.status < 300 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700')}>{res.status}</span>
                <span className="text-slate-500">{res.ms} ms</span>
              </div>
              <pre className="scrollbar-thin max-h-[50vh] overflow-auto bg-slate-950 p-5 font-mono text-xs text-emerald-300">{JSON.stringify(res.data, null, 2)}</pre>
            </Card>
          )}
        </div>
      </div>
    </>
  )
}
