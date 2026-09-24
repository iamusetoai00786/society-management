import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Home, Receipt, DoorOpen, Wrench, Sparkles, Car, Users, ArrowRight } from 'lucide-react'
import { useApp, useApi } from '../context/AppContext'
import { api } from '../api/client'
import { Badge, Tabs, Avatar, Button, Skeleton, inr, fmtDate, fmtTime, ago, cx } from './ui'
import { Markdown } from './Assistant'

// Unit 360°: everything linked to one unit in one place. Opened by clicking a
// unit code anywhere (UnitLink) or from the command palette.
export default function UnitDrawer() {
  const { unitOpen: id, openUnit, role } = useApp()
  const navigate = useNavigate()
  const [tab, setTab] = useState('overview')
  const [explain, setExplain] = useState(null)
  const [thinking, setThinking] = useState(false)
  const { data: u } = useApi(id ? `/api/units/${id}` : null)
  const { data: led } = useApi(id ? `/api/units/${id}/ledger` : null)
  const { data: visitors } = useApi(id && tab === 'visitors' ? `/api/visitors?unitId=${id}` : null)
  const { data: tickets } = useApi(id && tab === 'tickets' ? `/api/tickets?unitId=${id}` : null)
  const close = () => (openUnit(null), setExplain(null), setTab('overview'))
  const ask = async () => {
    setThinking(true)
    setExplain((await api.post('/api/ai/explain-ledger', { unitId: id })).text)
    setThinking(false)
  }
  const go = (to) => (close(), navigate(to))
  const ready = u && u.id === id

  return (
    <>
      <div className={cx('fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-[2px] transition', id ? 'opacity-100' : 'pointer-events-none opacity-0')} onClick={close} />
      <aside className={cx('fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-white shadow-2xl transition-transform duration-300 sm:w-[520px] dark:bg-slate-900', id ? 'translate-x-0' : 'translate-x-full')} aria-hidden={!id}>
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-100"><Home className="size-5" /></div>
            <div>
              <p className="text-lg font-bold">Unit {id}</p>
              {ready && <p className="text-xs text-slate-500">{u.blockName} · Floor {u.floor} · {u.type} · {u.areaSqft} sq.ft</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {ready && <Badge>{u.occupancy}</Badge>}
            <button onClick={close} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close"><X className="size-5" /></button>
          </div>
        </div>
        {!ready ? <Skeleton rows={6} /> : (
          <>
            <div className="grid grid-cols-3 border-b border-slate-100 text-center dark:border-slate-800">
              <div className="py-3"><p className={cx('text-lg font-bold', u.balance > 0 ? 'text-rose-600' : 'text-emerald-600')}>{inr(u.balance)}</p><p className="text-[11px] text-slate-500">Balance due</p></div>
              <div className="border-x border-slate-100 py-3 dark:border-slate-800"><p className="text-lg font-bold">{u.residents.length}</p><p className="text-[11px] text-slate-500">Residents</p></div>
              <div className="py-3"><p className="text-lg font-bold">{u.parking.length}</p><p className="text-[11px] text-slate-500">Parking slots</p></div>
            </div>
            <div className="px-5 pt-4"><Tabs value={tab} onChange={setTab} tabs={[{ value: 'overview', label: 'Overview' }, { value: 'ledger', label: 'Ledger' }, { value: 'visitors', label: 'Visitors' }, { value: 'tickets', label: 'Tickets' }]} /></div>
            <div className="scrollbar-thin flex-1 overflow-y-auto p-5">
              {tab === 'overview' && (
                <div className="space-y-5">
                  <section>
                    <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400"><Users className="size-3.5" /> People</p>
                    {u.residents.map((r) => (
                      <div key={r.id} className="mb-2 flex items-center gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                        <Avatar name={r.name} />
                        <div className="min-w-0 flex-1 text-sm">
                          <p className="font-medium">{r.name} <Badge className="ml-1">{r.type}</Badge></p>
                          <p className="text-xs text-slate-500">{r.phone} · {r.members} members{r.leaseEnd ? ` · lease till ${fmtDate(r.leaseEnd)}` : ''}</p>
                          {r.vehicles?.length > 0 && <p className="text-xs text-slate-500">🚗 {r.vehicles.join(', ')}</p>}
                        </div>
                        {u.users.some((x) => x.name === r.name) && <Badge tone="green">App</Badge>}
                      </div>
                    ))}
                    {!u.residents.length && <p className="text-sm text-slate-500">Vacant. {role === 'admin' && <button onClick={() => go('/residents?add=' + id)} className="font-medium text-brand-600">Add a resident →</button>}</p>}
                  </section>
                  <section>
                    <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400"><Receipt className="size-3.5" /> Next bill preview (from charge heads)</p>
                    <div className="rounded-xl border border-slate-100 dark:border-slate-800">
                      {u.nextBill.map((l) => <div key={l.head} className="flex justify-between border-b border-slate-100 px-3 py-2 text-sm last:border-0 dark:border-slate-800"><span>{l.head}</span><span className="font-medium">{inr(l.amount)}</span></div>)}
                      <div className="flex justify-between bg-slate-50 px-3 py-2 text-sm font-semibold dark:bg-slate-800/60"><span>Total</span><span>{inr(u.nextBill.reduce((a, l) => a + l.amount, 0))}</span></div>
                    </div>
                  </section>
                  {u.parking.length > 0 && (
                    <section>
                      <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400"><Car className="size-3.5" /> Parking</p>
                      <div className="flex flex-wrap gap-2">{u.parking.map((p) => <Badge key={p.id} tone="blue">{p.id} · {p.level}{p.type === 'EV' ? ' · EV' : ''}</Badge>)}</div>
                    </section>
                  )}
                  {u.dailyHelp.length > 0 && (
                    <section>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Daily help</p>
                      <div className="flex flex-wrap gap-2">{u.dailyHelp.map((h) => <Badge key={h.id} tone={h.inside ? 'green' : 'gray'}>{h.name} · {h.role} · {h.inside ? 'inside' : 'out'}</Badge>)}</div>
                    </section>
                  )}
                </div>
              )}
              {tab === 'ledger' && (
                <div className="space-y-4">
                  <div className="ai-border rounded-2xl bg-gradient-to-br from-indigo-50 to-fuchsia-50 p-4 text-sm dark:from-indigo-500/10 dark:to-fuchsia-500/10">
                    {explain ? <Markdown text={explain} /> : <p className="text-slate-600 dark:text-slate-300">Get a plain-language summary of this unit’s dues and what to do next.</p>}
                    {!explain && <Button size="sm" variant="ai" icon={Sparkles} loading={thinking} onClick={ask} className="mt-3">Explain with AI</Button>}
                  </div>
                  {!led ? <Skeleton /> : (
                    <div className="overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800">
                      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 bg-slate-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800/50"><span>Entry</span><span className="w-16 text-right">Debit</span><span className="w-16 text-right">Credit</span><span className="w-20 text-right">Balance</span></div>
                      {led.entries.map((e, i) => (
                        <div key={i} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-4 border-t border-slate-100 px-3 py-2 text-sm dark:border-slate-800">
                          <div className="min-w-0"><p className="truncate">{e.text}</p><p className="text-[11px] text-slate-400">{fmtDate(e.at)}{e.kind === 'invoice' && e.status !== 'paid' ? ` · ${e.status}` : ''}</p></div>
                          <span className="w-16 text-right text-rose-600">{e.debit ? inr(e.debit) : ''}</span>
                          <span className="w-16 text-right text-emerald-600">{e.credit ? inr(e.credit) : ''}</span>
                          <span className="w-20 text-right font-medium">{inr(e.balance)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <Button variant="secondary" className="w-full" onClick={() => go('/billing')}>Open billing <ArrowRight className="size-4" /></Button>
                </div>
              )}
              {tab === 'visitors' && (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(visitors || []).slice(0, 25).map((v) => (
                    <li key={v.id} className="flex items-center gap-3 py-2.5 text-sm">
                      <DoorOpen className="size-4 text-slate-400" />
                      <div className="min-w-0 flex-1"><p className="truncate font-medium">{v.name}</p><p className="text-xs capitalize text-slate-500">{v.type}{v.company ? ` · ${v.company}` : ''} · {fmtDate(v.checkIn, { day: 'numeric', month: 'short' })} {fmtTime(v.checkIn)}</p></div>
                      <Badge>{v.status}</Badge>
                    </li>
                  ))}
                  {visitors && !visitors.length && <li className="py-8 text-center text-sm text-slate-500">No visitors yet</li>}
                </ul>
              )}
              {tab === 'tickets' && (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(tickets || []).filter((t) => t.unitId === id).map((t) => (
                    <li key={t.id} className="flex items-center gap-3 py-2.5 text-sm">
                      <Wrench className="size-4 text-slate-400" />
                      <div className="min-w-0 flex-1"><p className="truncate font-medium">{t.title}</p><p className="text-xs text-slate-500">{t.id} · {t.category} · {ago(t.createdAt)}</p></div>
                      <Badge>{t.status}</Badge>
                    </li>
                  ))}
                  {tickets && !tickets.filter((t) => t.unitId === id).length && <li className="py-8 text-center text-sm text-slate-500">No tickets</li>}
                </ul>
              )}
            </div>
          </>
        )}
      </aside>
    </>
  )
}
