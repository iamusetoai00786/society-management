import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Search, Users, Trash2, Car } from 'lucide-react'
import { useApi, useAction } from '../context/AppContext'
import { api } from '../api/client'
import { Card, Badge, Button, Table, PageHeader, Skeleton, Input, Select, Field, Modal, Tabs, Avatar, fmtDate, cx } from '../components/ui'

function AddResident({ open, onClose }) {
  const [f, setF] = useState({ name: '', unitId: 'A-101', type: 'owner', phone: '', email: '', members: 1 })
  const { run, busy } = useAction()
  const { data: units } = useApi(open ? '/api/units' : null)
  const save = async () => {
    await run(() => api.post('/api/residents', { ...f, members: Number(f.members) }), 'Resident added')
    onClose()
  }
  return (
    <Modal open={open} onClose={onClose} title="Add resident" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={busy} onClick={save} disabled={!f.name}>Save</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Priya Sharma" /></Field>
        <Field label="Unit"><Select value={f.unitId} onChange={(e) => setF({ ...f, unitId: e.target.value })} options={(units || []).map((u) => ({ value: u.id, label: `${u.id} (${u.type}, ${u.occupancy})` }))} /></Field>
        <Field label="Type"><Select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} options={[{ value: 'owner', label: 'Owner' }, { value: 'tenant', label: 'Tenant' }]} /></Field>
        <Field label="Family members"><Input type="number" min={1} value={f.members} onChange={(e) => setF({ ...f, members: e.target.value })} /></Field>
        <Field label="Phone"><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="+91" /></Field>
        <Field label="Email"><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
      </div>
    </Modal>
  )
}

function UnitMap() {
  const { data: units } = useApi('/api/units')
  const [sel, setSel] = useState(null)
  const { data: detail } = useApi(sel ? `/api/units/${sel}` : null)
  if (!units) return <Skeleton />
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        {['A', 'B', 'C'].map((b) => (
          <Card key={b} className="p-5">
            <p className="mb-3 font-semibold">Block {b}</p>
            <div className="space-y-2">
              {[4, 3, 2, 1].map((fl) => (
                <div key={fl} className="flex items-center gap-2">
                  <span className="w-8 text-xs text-slate-400">F{fl}</span>
                  <div className="grid flex-1 grid-cols-4 gap-2">
                    {units.filter((u) => u.block === b && u.floor === fl).map((u) => (
                      <button key={u.id} onClick={() => setSel(u.id)} className={cx('rounded-lg border px-2 py-2 text-xs font-medium transition hover:scale-[1.03]', sel === u.id && 'ring-2 ring-brand-500',
                        u.occupancy === 'owner' ? 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300' : u.occupancy === 'tenant' ? 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300' : 'border-dashed border-slate-300 text-slate-400 dark:border-slate-700')}>
                        {u.id}<span className="block text-[10px] font-normal opacity-70">{u.type}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
        <div className="flex gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-sky-200" /> Owner-occupied</span>
          <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-violet-200" /> Tenant</span>
          <span className="flex items-center gap-1.5"><span className="size-3 rounded border border-dashed border-slate-400" /> Vacant</span>
        </div>
      </div>
      <Card className="h-fit p-5 lg:sticky lg:top-24">
        {!sel ? <p className="py-10 text-center text-sm text-slate-500">Select a unit to see details</p> : !detail ? <Skeleton rows={3} /> : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-lg font-bold">{detail.id}</p>
              <Badge>{detail.occupancy}</Badge>
            </div>
            <p className="text-sm text-slate-500">{detail.type} · {detail.areaSqft} sq.ft · Floor {detail.floor}</p>
            {detail.residents.map((r) => (
              <div key={r.id} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                <Avatar name={r.name} />
                <div className="text-sm"><p className="font-medium">{r.name}</p><p className="text-xs text-slate-500">{r.phone} · {r.members} members</p></div>
              </div>
            ))}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase text-slate-400">Recent bills</p>
              {detail.invoices.slice(-4).reverse().map((i) => (
                <div key={i.id} className="flex justify-between py-1 text-sm"><span>{i.period}</span><Badge>{i.status}</Badge></div>
              ))}
            </div>
            {detail.parking.length > 0 && <p className="flex items-center gap-2 text-sm"><Car className="size-4 text-slate-400" /> Parking {detail.parking.map((p) => p.id).join(', ')}</p>}
          </div>
        )}
      </Card>
    </div>
  )
}

export default function Residents() {
  const [params] = useSearchParams()
  const [q, setQ] = useState(params.get('q') || '')
  const [type, setType] = useState('')
  const [block, setBlock] = useState('')
  const [tab, setTab] = useState('list')
  const [add, setAdd] = useState(false)
  const { data, loading } = useApi(`/api/residents?q=${encodeURIComponent(q)}&type=${type}&block=${block}`)
  const { run } = useAction()
  return (
    <>
      <PageHeader title="Residents & Units" subtitle="Owners, tenants, family members and the unit structure." actions={<Button icon={Plus} onClick={() => setAdd(true)}>Add resident</Button>} />
      <div className="mb-4"><Tabs value={tab} onChange={setTab} tabs={[{ value: 'list', label: 'Residents' }, { value: 'map', label: 'Unit map' }]} /></div>
      {tab === 'map' ? <UnitMap /> : (
        <Card>
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row dark:border-slate-800">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
              <Input className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, unit, phone…" />
            </div>
            <Select className="sm:w-36" value={block} onChange={(e) => setBlock(e.target.value)} options={[{ value: '', label: 'All blocks' }, 'A', 'B', 'C'].map((x) => (typeof x === 'string' ? { value: x, label: `Block ${x}` } : x))} />
            <Select className="sm:w-36" value={type} onChange={(e) => setType(e.target.value)} options={[{ value: '', label: 'All types' }, { value: 'owner', label: 'Owners' }, { value: 'tenant', label: 'Tenants' }]} />
          </div>
          {loading && !data ? <Skeleton rows={6} /> : (
            <Table rows={data || []} empty={<span className="flex flex-col items-center gap-2"><Users className="size-6" />No residents match</span>} columns={[
              { key: 'name', label: 'Resident', render: (r) => <div className="flex items-center gap-3"><Avatar name={r.name} size="sm" /><div><p className="font-medium">{r.name}</p><p className="text-xs text-slate-500">{r.email}</p></div></div> },
              { key: 'unitId', label: 'Unit', render: (r) => <span className="font-semibold">{r.unitId}</span> },
              { key: 'type', label: 'Type', render: (r) => <Badge>{r.type}</Badge> },
              { key: 'phone', label: 'Phone', className: 'text-slate-500' },
              { key: 'members', label: 'Members' },
              { key: 'vehicles', label: 'Vehicles', render: (r) => r.vehicles.join(', ') || '—', className: 'text-xs text-slate-500' },
              { key: 'moveIn', label: 'Since', render: (r) => fmtDate(r.moveIn, { month: 'short', year: 'numeric' }), className: 'text-slate-500' },
              { key: 'x', label: '', render: (r) => <button onClick={() => confirm(`Remove ${r.name}?`) && run(() => api.del(`/api/residents/${r.id}`), 'Resident removed')} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Remove"><Trash2 className="size-4" /></button> },
            ]} />
          )}
          <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500 dark:border-slate-800">{data?.length ?? 0} residents</p>
        </Card>
      )}
      <AddResident open={add} onClose={() => setAdd(false)} />
    </>
  )
}
