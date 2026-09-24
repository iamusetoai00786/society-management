import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Search, Users, LogOut, Pencil, Smartphone } from 'lucide-react'
import { useApp, useApi, useAction } from '../context/AppContext'
import { api } from '../api/client'
import { Card, Badge, Button, Table, PageHeader, Skeleton, Input, Select, Field, Modal, Tabs, Avatar, Stat, UnitLink, fmtDate, inr, cx } from '../components/ui'

function ResidentForm({ record, presetUnit, onClose }) {
  const editing = !!record?.id
  const [f, setF] = useState(record ? { ...record, vehicles: (record.vehicles || []).join(', ') } : { name: '', unitId: presetUnit || '', type: 'owner', phone: '', email: '', members: 1, vehicles: '', leaseEnd: '', appAccess: true })
  const { run, busy } = useAction()
  const { data: units } = useApi(editing ? null : '/api/units')
  const options = (units || []).map((u) => ({ value: u.id, label: `${u.id} · ${u.type} · ${u.occupancy}${u.residents.length ? ` (${u.residents.map((r) => r.name.split(' ')[0]).join(', ')})` : ''}` }))
  const save = async () => {
    const body = { ...f, leaseEnd: f.type === 'tenant' ? f.leaseEnd : null }
    await run(() => (editing ? api.put(`/api/residents/${record.id}`, body) : api.post('/api/residents', body)), editing ? 'Resident updated' : `${f.name} moved into ${f.unitId}`)
    onClose()
  }
  return (
    <Modal open onClose={onClose} title={editing ? `Edit ${record.name}` : 'Move-in: add resident'} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={busy} onClick={save} disabled={!f.name || !f.unitId || (f.type === 'tenant' && !f.leaseEnd)}>{editing ? 'Save' : 'Add resident'}</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Priya Sharma" /></Field>
        {editing ? <Field label="Unit"><Input value={f.unitId} disabled /></Field> : <Field label="Unit"><Select value={f.unitId} onChange={(e) => setF({ ...f, unitId: e.target.value })} options={[{ value: '', label: units ? 'Select unit' : 'Loading…' }, ...options]} /></Field>}
        <Field label="Type"><Select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} options={[{ value: 'owner', label: 'Owner' }, { value: 'tenant', label: 'Tenant' }]} /></Field>
        {f.type === 'tenant' ? <Field label="Lease ends" hint="Required for tenants"><Input type="date" value={f.leaseEnd || ''} onChange={(e) => setF({ ...f, leaseEnd: e.target.value })} /></Field> : <Field label="Family members"><Input type="number" min={1} value={f.members} onChange={(e) => setF({ ...f, members: e.target.value })} /></Field>}
        <Field label="Mobile"><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="+91" /></Field>
        <Field label="Email"><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <div className="sm:col-span-2"><Field label="Vehicles" hint="Comma separated, used by the gate"><Input value={f.vehicles} onChange={(e) => setF({ ...f, vehicles: e.target.value })} placeholder="HR26 AB 1234" /></Field></div>
        <label className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-sm sm:col-span-2 dark:bg-slate-800/60"><input type="checkbox" checked={!!f.appAccess} onChange={(e) => setF({ ...f, appAccess: e.target.checked })} className="mt-0.5 size-4 accent-brand-600" /><span><strong>App access</strong><br /><span className="text-xs text-slate-500">Creates a resident login: pay dues, approve visitors, book amenities, raise complaints.</span></span></label>
      </div>
    </Modal>
  )
}

function UnitMap() {
  const { openUnit } = useApp()
  const { data: blocks } = useApi('/api/masters/blocks')
  const { data: units } = useApi('/api/units')
  if (!units || !blocks) return <Skeleton />
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-sky-200" /> Owner-occupied</span>
        <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-violet-200" /> Tenant</span>
        <span className="flex items-center gap-1.5"><span className="size-3 rounded border border-dashed border-slate-400" /> Vacant</span>
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-rose-500" /> Has dues</span>
        <span>Click a unit for its 360° profile.</span>
      </div>
      <div className="grid gap-6 2xl:grid-cols-2">
        {blocks.map((b) => {
          const bu = units.filter((u) => u.blockId === b.id)
          return (
            <Card key={b.id} className="p-5">
              <div className="mb-3 flex items-center justify-between"><p className="font-semibold">{b.name}</p><span className="text-xs text-slate-500">{bu.filter((u) => u.occupancy !== 'vacant').length}/{bu.length} occupied</span></div>
              <div className="space-y-2">
                {[...Array(b.floors)].map((_, i) => b.floors - i).map((fl) => (
                  <div key={fl} className="flex items-center gap-2">
                    <span className="w-8 shrink-0 text-xs text-slate-400">{b.floors > 1 ? `F${fl}` : ''}</span>
                    <div className="grid flex-1 gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(b.unitsPerFloor, 6)}, minmax(0, 1fr))` }}>
                      {bu.filter((u) => u.floor === fl).map((u) => (
                        <button key={u.id} onClick={() => openUnit(u.id)} className={cx('relative rounded-lg border px-1 py-2 text-xs font-medium transition hover:scale-[1.03]',
                          u.occupancy === 'owner' ? 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300' : u.occupancy === 'tenant' ? 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300' : 'border-dashed border-slate-300 text-slate-400 dark:border-slate-700')}>
                          {u.balance > 0 && <span className="absolute right-1 top-1 size-1.5 rounded-full bg-rose-500" />}
                          {u.id}<span className="block text-[10px] font-normal opacity-70">{u.type}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

export default function Residents() {
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState(params.get('q') || '')
  const [type, setType] = useState(params.get('type') || '')
  const [blockId, setBlockId] = useState('')
  const [tab, setTab] = useState('list')
  const [form, setForm] = useState(params.get('add') ? { preset: params.get('add') } : null)
  const { data, loading } = useApi(`/api/residents?q=${encodeURIComponent(q)}&type=${type}&blockId=${blockId}`)
  const { data: blocks } = useApi('/api/masters/blocks')
  const { data: units } = useApi('/api/units')
  const { run } = useAction()
  const moveOut = async (r) => {
    if (!confirm(`Move out ${r.name} from ${r.unitId}? Their app login will be removed.`)) return
    try {
      await run(() => api.del(`/api/residents/${r.id}`), `${r.name} moved out`)
    } catch (e) {
      if (e.status === 409 && confirm(`${e.message}\n\nMove out anyway?`)) await run(() => api.del(`/api/residents/${r.id}?force=true`), `${r.name} moved out; dues stay on ${r.unitId}`)
    }
  }
  const occ = (units || []).reduce((a, u) => ((a[u.occupancy] = (a[u.occupancy] || 0) + 1), a), {})
  const close = () => (setForm(null), params.has('add') && setParams({}))
  return (
    <>
      <PageHeader title="Residents & Units" subtitle="Move-ins, move-outs, app access and the unit map." actions={<Button icon={Plus} onClick={() => setForm({})}>Add resident</Button>} />
      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="Units" value={units?.length ?? '…'} icon={Users} />
        <Stat label="Owner-occupied" value={occ.owner || 0} icon={Users} tone="sky" />
        <Stat label="Tenant-occupied" value={occ.tenant || 0} icon={Users} tone="brand" />
        <Stat label="Vacant" value={occ.vacant || 0} icon={Users} tone="amber" />
      </div>
      <div className="mb-4"><Tabs value={tab} onChange={setTab} tabs={[{ value: 'list', label: 'Residents', count: data?.length }, { value: 'map', label: 'Unit map' }]} /></div>
      {tab === 'map' ? <UnitMap /> : (
        <Card>
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row dark:border-slate-800">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
              <Input className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, unit, phone…" />
            </div>
            <Select className="sm:w-40" value={blockId} onChange={(e) => setBlockId(e.target.value)} options={[{ value: '', label: 'All blocks' }, ...(blocks || []).map((b) => ({ value: b.id, label: b.name }))]} />
            <Select className="sm:w-36" value={type} onChange={(e) => setType(e.target.value)} options={[{ value: '', label: 'All types' }, { value: 'owner', label: 'Owners' }, { value: 'tenant', label: 'Tenants' }]} />
          </div>
          {loading && !data ? <Skeleton rows={6} /> : (
            <Table rows={data || []} pageSize={20} empty={<span className="flex flex-col items-center gap-2"><Users className="size-6" />No residents match</span>} columns={[
              { key: 'name', label: 'Resident', render: (r) => <div className="flex items-center gap-3"><Avatar name={r.name} size="sm" /><div><p className="font-medium">{r.name}</p><p className="text-xs text-slate-500">{r.email}</p></div></div> },
              { key: 'unitId', label: 'Unit', render: (r) => <UnitLink id={r.unitId} /> },
              { key: 'type', label: 'Type', render: (r) => <Badge>{r.type}</Badge> },
              { key: 'phone', label: 'Mobile', className: 'text-slate-500' },
              { key: 'members', label: 'Members', align: 'right' },
              { key: 'vehicles', label: 'Vehicles', render: (r) => r.vehicles.join(', ') || '—', className: 'text-xs text-slate-500' },
              { key: 'moveIn', label: 'Since', render: (r) => fmtDate(r.moveIn, { month: 'short', year: 'numeric' }) },
              { key: 'leaseEnd', label: 'Lease ends', render: (r) => (r.leaseEnd ? <span className={new Date(r.leaseEnd) - new Date() < 30 * 86400000 ? 'font-medium text-amber-600' : ''}>{fmtDate(r.leaseEnd)}</span> : '—') },
              { key: 'hasLogin', label: 'App', align: 'center', render: (r) => (r.hasLogin ? <Smartphone className="mx-auto size-4 text-emerald-500" /> : <span className="text-slate-300">—</span>) },
              { key: 'x', label: '', render: (r) => (
                <div className="flex justify-end gap-1">
                  <button onClick={() => setForm({ record: r })} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800" title="Edit"><Pencil className="size-4" /></button>
                  <button onClick={() => moveOut(r)} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600" title="Move out"><LogOut className="size-4" /></button>
                </div>
              ) },
            ]} />
          )}
        </Card>
      )}
      {form && <ResidentForm record={form.record} presetUnit={form.preset} onClose={close} />}
      {units && <p className="mt-3 text-xs text-slate-500">Outstanding across all units: {inr(units.reduce((a, u) => a + u.balance, 0))}</p>}
    </>
  )
}
