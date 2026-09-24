import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Pencil, Trash2, Database, ArrowRight, Building, Ruler, Home, Receipt, Tags, Wrench, CalendarDays, Truck, HardHat } from 'lucide-react'
import { useApi, useAction } from '../context/AppContext'
import { api } from '../api/client'
import { Card, Badge, Button, Table, PageHeader, Skeleton, Input, Select, Field, Modal, UnitLink, inr, cx } from '../components/ui'

// Master tables are set up once per society. Each one feeds other modules;
// the "flow" line tells the admin exactly where the data goes.
const STAFF_ROLES = ['Security Supervisor', 'Security Guard', 'Plumber', 'Electrician', 'Housekeeping', 'Gardener', 'Lift AMC Team', 'Facility Manager', 'Committee', 'Other']
const BASIS = [{ value: 'per_sqft', label: 'Per sq.ft of unit area' }, { value: 'fixed', label: 'Fixed per unit' }, { value: 'per_parking', label: 'Per allotted parking slot' }]
const basisText = (h) => (h.basis === 'per_sqft' ? `₹${h.rate} × sq.ft` : h.basis === 'per_parking' ? `₹${h.rate} × slots` : `${inr(h.rate)} flat`)

const TABS = (lk) => [
  {
    key: 'blocks', label: 'Blocks', icon: Building, flow: ['Blocks', 'generate Units', 'Residents live in units'],
    fields: [
      { k: 'code', label: 'Code', placeholder: 'A or T1', createOnly: true, hint: 'Used in unit numbers, e.g. A-101' },
      { k: 'name', label: 'Name', placeholder: 'Block A / Tower 1' },
      { k: 'floors', label: 'Floors', type: 'number', createOnly: true },
      { k: 'unitsPerFloor', label: 'Units per floor', type: 'number', createOnly: true },
      { k: 'unitTypeId', label: 'Default unit type', type: 'select', options: lk.unitTypes, createOnly: true, hint: 'All generated units get this type; change individual units in the Units tab.' },
    ],
    columns: [{ key: 'code', label: 'Code', render: (r) => <span className="font-mono font-semibold">{r.code}</span> }, { key: 'name', label: 'Name' }, { key: 'floors', label: 'Floors', align: 'right' }, { key: 'unitsPerFloor', label: 'Per floor', align: 'right' }],
  },
  {
    key: 'unit-types', label: 'Unit types', icon: Ruler, flow: ['Unit type area', 'Unit area', 'Maintenance = rate × sq.ft'],
    fields: [{ k: 'name', label: 'Name', placeholder: '2BHK' }, { k: 'areaSqft', label: 'Area (sq.ft)', type: 'number', hint: 'Changing this updates every unit of this type (from the next bill).' }],
    columns: [{ key: 'name', label: 'Type', render: (r) => <span className="font-semibold">{r.name}</span> }, { key: 'areaSqft', label: 'Area', align: 'right', render: (r) => `${r.areaSqft} sq.ft` }],
  },
  { key: 'units', label: 'Units', icon: Home, flow: ['Units', 'Residents & parking', 'One invoice per occupied unit'] },
  {
    key: 'charge-heads', label: 'Charge heads', icon: Receipt, flow: ['Active charge heads', 'Invoice lines', 'Unit ledger & reports'],
    fields: [
      { k: 'name', label: 'Name', placeholder: 'Maintenance' },
      { k: 'basis', label: 'How it is calculated', type: 'select', options: BASIS },
      { k: 'rate', label: 'Rate (₹)', type: 'number', step: '0.1' },
      { k: 'description', label: 'Description' },
      { k: 'active', label: 'Active (billed each cycle)', type: 'checkbox', default: true },
    ],
    columns: [{ key: 'name', label: 'Head', render: (r) => <span className="font-semibold">{r.name}</span> }, { key: 'basis', label: 'Formula', render: basisText }, { key: 'description', label: 'Description', className: 'text-slate-500', nowrap: false }, { key: 'active', label: 'Status', render: (r) => <Badge tone={r.active ? 'green' : 'gray'}>{r.active ? 'Active' : 'Inactive'}</Badge> }],
  },
  {
    key: 'expense-categories', label: 'Expense categories', icon: Tags, flow: ['Category + budget', 'Expenses', 'Budget vs actual, AI overspend alerts'],
    fields: [{ k: 'name', label: 'Name' }, { k: 'budgetMonthly', label: 'Monthly budget (₹)', type: 'number' }],
    columns: [{ key: 'name', label: 'Category', render: (r) => <span className="font-semibold">{r.name}</span> }, { key: 'budgetMonthly', label: 'Monthly budget', align: 'right', render: (r) => (r.budgetMonthly ? inr(r.budgetMonthly) : '—') }],
  },
  {
    key: 'ticket-categories', label: 'Complaint categories', icon: Wrench, flow: ['Category → SLA + staff', 'AI triage routes tickets', 'SLA breach alerts'],
    fields: [{ k: 'name', label: 'Name' }, { k: 'slaHours', label: 'SLA (hours)', type: 'number' }, { k: 'assignee', label: 'Default assignee', type: 'select', options: lk.staff }],
    columns: [{ key: 'name', label: 'Category', render: (r) => <span className="font-semibold">{r.name}</span> }, { key: 'slaHours', label: 'SLA', align: 'right', render: (r) => `${r.slaHours} h` }, { key: 'assignee', label: 'Default assignee' }],
  },
  {
    key: 'amenities', label: 'Amenities', icon: CalendarDays, flow: ['Amenity slots + rules', 'Resident bookings', 'Approvals & fees'],
    fields: [{ k: 'name', label: 'Name' }, { k: 'capacity', label: 'Capacity per slot', type: 'number' }, { k: 'fee', label: 'Fee per slot (₹)', type: 'number' }, { k: 'deposit', label: 'Deposit (₹)', type: 'number' }, { k: 'slots', label: 'Slots (comma separated)', placeholder: '06:00-07:00, 18:00-19:00' }, { k: 'requiresApproval', label: 'Needs committee approval', type: 'checkbox' }],
    columns: [{ key: 'name', label: 'Amenity', render: (r) => <span className="font-semibold">{r.name}</span> }, { key: 'capacity', label: 'Capacity', align: 'right' }, { key: 'fee', label: 'Fee', align: 'right', render: (r) => (r.fee ? inr(r.fee) : 'Free') }, { key: 'slots', label: 'Slots', render: (r) => `${r.slots.length} slots` }, { key: 'requiresApproval', label: 'Approval', render: (r) => (r.requiresApproval ? <Badge tone="amber">Required</Badge> : <Badge tone="green">Instant</Badge>) }],
  },
  {
    key: 'vendors', label: 'Vendors', icon: Truck, flow: ['Vendor', 'Expenses paid to vendor', 'AI contract-renewal alerts'],
    fields: [{ k: 'name', label: 'Name' }, { k: 'service', label: 'Service' }, { k: 'phone', label: 'Phone' }, { k: 'contractEnd', label: 'Contract ends', type: 'date' }],
    columns: [{ key: 'name', label: 'Vendor', render: (r) => <span className="font-semibold">{r.name}</span> }, { key: 'service', label: 'Service' }, { key: 'phone', label: 'Phone', className: 'text-slate-500' }, { key: 'contractEnd', label: 'Contract ends' }],
  },
  {
    key: 'staff', label: 'Staff', icon: HardHat, flow: ['Staff', 'Ticket assignee · attendance', 'Guards get the gate app'],
    fields: [{ k: 'name', label: 'Name' }, { k: 'role', label: 'Role', type: 'select', options: STAFF_ROLES }, { k: 'shift', label: 'Shift', type: 'select', options: ['Day', 'Night', 'On call'] }, { k: 'phone', label: 'Phone' }, { k: 'appAccess', label: 'Give gate-app login (security roles)', type: 'checkbox' }],
    columns: [{ key: 'name', label: 'Name', render: (r) => <span className="font-semibold">{r.name}</span> }, { key: 'role', label: 'Role' }, { key: 'shift', label: 'Shift' }, { key: 'phone', label: 'Phone', className: 'text-slate-500' }, { key: 'appAccess', label: 'Login', render: (r) => (r.appAccess ? <Badge tone="green">Gate app</Badge> : '—') }],
  },
]

function Flow({ steps }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="font-semibold text-slate-500">Data flow:</span>
      {steps.map((s, i) => (
        <span key={s} className="flex items-center gap-2">
          <span className={cx('rounded-full px-2.5 py-1 font-medium', i === 0 ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300')}>{s}</span>
          {i < steps.length - 1 && <ArrowRight className="size-3.5 text-slate-400" />}
        </span>
      ))}
    </div>
  )
}

function MasterForm({ tab, record, onClose }) {
  const editing = !!record?.id
  const init = Object.fromEntries(tab.fields.map((f) => [f.k, record?.[f.k] ?? (f.type === 'checkbox' ? f.default ?? false : f.type === 'select' ? (typeof f.options[0] === 'string' ? f.options[0] : f.options[0]?.value) ?? '' : '')]))
  if (Array.isArray(init.slots)) init.slots = init.slots.join(', ')
  const [f, setF] = useState(init)
  const { run, busy } = useAction()
  const save = async () => {
    await run(() => (editing ? api.put(`/api/masters/${tab.key}/${record.id}`, f) : api.post(`/api/masters/${tab.key}`, f)), editing ? 'Saved' : `${tab.label.replace(/s$/, '')} created`)
    onClose()
  }
  return (
    <Modal open onClose={onClose} title={`${editing ? 'Edit' : 'Add'} ${tab.label.replace(/s$/, '').toLowerCase()}`} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={busy} onClick={save}>{editing ? 'Save' : 'Create'}</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        {tab.fields.filter((x) => !(editing && x.createOnly)).map((x) => (
          x.type === 'checkbox' ? (
            <label key={x.k} className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={!!f[x.k]} onChange={(e) => setF({ ...f, [x.k]: e.target.checked })} className="size-4 accent-brand-600" /> {x.label}</label>
          ) : (
            <Field key={x.k} label={x.label} hint={x.hint}>
              {x.type === 'select'
                ? <Select value={f[x.k]} onChange={(e) => setF({ ...f, [x.k]: e.target.value })} options={x.options} />
                : <Input type={x.type || 'text'} step={x.step} value={f[x.k]} placeholder={x.placeholder} onChange={(e) => setF({ ...f, [x.k]: e.target.value })} />}
            </Field>
          )
        ))}
      </div>
      {editing && tab.fields.some((x) => x.createOnly) && <p className="mt-4 text-xs text-slate-500">Structure fields (code, floors, units per floor) can’t change after creation. Add or delete units individually in the Units tab.</p>}
    </Modal>
  )
}

function MasterTab({ tab }) {
  const { data, loading } = useApi(`/api/masters/${tab.key}`)
  const [edit, setEdit] = useState(null)
  const { run } = useAction()
  const del = (r) => confirm(`Delete ${r.code || r.name}?`) && run(() => api.del(`/api/masters/${tab.key}/${r.id}`), 'Deleted').catch(() => {})
  return (
    <>
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
        <Flow steps={tab.flow} />
        <Button icon={Plus} onClick={() => setEdit({})}>Add</Button>
      </div>
      {loading && !data ? <Skeleton /> : (
        <Table rows={data || []} empty={`No ${tab.label.toLowerCase()} yet. Add the first one.`} columns={[
          ...tab.columns,
          { key: 'usage', label: 'Used by', className: 'text-xs text-slate-500' },
          { key: 'x', label: '', render: (r) => (
            <div className="flex justify-end gap-1">
              <button onClick={() => setEdit(r)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800" aria-label="Edit"><Pencil className="size-4" /></button>
              <button onClick={() => del(r)} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10" aria-label="Delete"><Trash2 className="size-4" /></button>
            </div>
          ) },
        ]} />
      )}
      {edit && <MasterForm tab={tab} record={edit} onClose={() => setEdit(null)} />}
    </>
  )
}

function UnitsTab({ blocks, unitTypes }) {
  const [blockId, setBlockId] = useState('')
  const { data, loading } = useApi(`/api/units?blockId=${blockId}`)
  const [edit, setEdit] = useState(null)
  const [add, setAdd] = useState(false)
  const [f, setF] = useState({ blockId: '', floor: 1, number: 1, unitTypeId: '' })
  const { run, busy } = useAction()
  return (
    <>
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between dark:border-slate-800">
        <Flow steps={['Units', 'Residents & parking', 'One invoice per occupied unit']} />
        <div className="flex gap-2">
          <Select className="w-40" value={blockId} onChange={(e) => setBlockId(e.target.value)} options={[{ value: '', label: 'All blocks' }, ...blocks]} />
          <Button icon={Plus} onClick={() => (setF({ blockId: blocks[0]?.value, floor: 1, number: 1, unitTypeId: unitTypes[0]?.value }), setAdd(true))}>Add unit</Button>
        </div>
      </div>
      {loading && !data ? <Skeleton /> : (
        <Table rows={data || []} pageSize={20} columns={[
          { key: 'id', label: 'Unit', render: (u) => <UnitLink id={u.id} /> },
          { key: 'block', label: 'Block' },
          { key: 'floor', label: 'Floor', align: 'right' },
          { key: 'type', label: 'Type' },
          { key: 'areaSqft', label: 'Area', align: 'right', render: (u) => `${u.areaSqft} sq.ft` },
          { key: 'occupancy', label: 'Occupancy', render: (u) => <Badge>{u.occupancy}</Badge> },
          { key: 'residents', label: 'Residents', render: (u) => u.residents.map((r) => r.name).join(', ') || '—', className: 'max-w-56 truncate' },
          { key: 'parking', label: 'Parking', render: (u) => u.parking.join(', ') || '—', className: 'text-xs text-slate-500' },
          { key: 'balance', label: 'Balance', align: 'right', render: (u) => <span className={u.balance ? 'font-semibold text-rose-600' : 'text-slate-400'}>{inr(u.balance)}</span> },
          { key: 'x', label: '', render: (u) => (
            <div className="flex justify-end gap-1">
              <button onClick={() => setEdit({ ...u })} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800" aria-label="Edit"><Pencil className="size-4" /></button>
              <button onClick={() => confirm(`Delete unit ${u.id}?`) && run(() => api.del(`/api/units/${u.id}`), 'Unit deleted').catch(() => {})} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Delete"><Trash2 className="size-4" /></button>
            </div>
          ) },
        ]} />
      )}
      {edit && (
        <Modal open onClose={() => setEdit(null)} title={`Edit unit ${edit.id}`} footer={<><Button variant="secondary" onClick={() => setEdit(null)}>Cancel</Button><Button loading={busy} onClick={async () => (await run(() => api.put(`/api/units/${edit.id}`, { unitTypeId: edit.unitTypeId, areaSqft: edit.areaSqft }), 'Unit updated'), setEdit(null))}>Save</Button></>}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Unit type"><Select value={edit.unitTypeId} onChange={(e) => setEdit({ ...edit, unitTypeId: e.target.value, areaSqft: '' })} options={unitTypes} /></Field>
            <Field label="Custom area (sq.ft)" hint="Leave blank to use the type's area"><Input type="number" value={edit.areaSqft} onChange={(e) => setEdit({ ...edit, areaSqft: e.target.value })} /></Field>
          </div>
          <p className="mt-4 text-xs text-slate-500">Changes apply from the next bill cycle. Past invoices keep their original amounts.</p>
        </Modal>
      )}
      {add && (
        <Modal open onClose={() => setAdd(false)} title="Add unit" footer={<><Button variant="secondary" onClick={() => setAdd(false)}>Cancel</Button><Button loading={busy} onClick={async () => (await run(() => api.post('/api/units', f), (u) => `Unit ${u.id} created`), setAdd(false))}>Create</Button></>}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Block"><Select value={f.blockId} onChange={(e) => setF({ ...f, blockId: e.target.value })} options={blocks} /></Field>
            <Field label="Unit type"><Select value={f.unitTypeId} onChange={(e) => setF({ ...f, unitTypeId: e.target.value })} options={unitTypes} /></Field>
            <Field label="Floor"><Input type="number" min={1} value={f.floor} onChange={(e) => setF({ ...f, floor: e.target.value })} /></Field>
            <Field label="Number on floor"><Input type="number" min={1} value={f.number} onChange={(e) => setF({ ...f, number: e.target.value })} /></Field>
          </div>
        </Modal>
      )}
    </>
  )
}

export default function Masters() {
  const [params, setParams] = useSearchParams()
  const active = params.get('tab') || 'blocks'
  const { data: ut } = useApi('/api/masters/unit-types')
  const { data: st } = useApi('/api/masters/staff')
  const { data: bl } = useApi('/api/masters/blocks')
  const lk = { unitTypes: (ut || []).map((x) => ({ value: x.id, label: `${x.name} (${x.areaSqft} sq.ft)` })), staff: (st || []).map((x) => ({ value: x.name, label: `${x.name} · ${x.role}` })), blocks: (bl || []).map((x) => ({ value: x.id, label: x.name })) }
  const tabs = TABS(lk)
  const tab = tabs.find((t) => t.key === active) || tabs[0]
  const ready = ut && st && bl
  return (
    <>
      <PageHeader title="Master tables" subtitle="Set these up once. Every bill, ticket, booking and report reads from them." actions={<span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700 dark:bg-violet-500/10 dark:text-violet-300"><Database className="size-3.5" /> {tabs.length} tables</span>} />
      <div className="grid gap-6 lg:grid-cols-[250px_1fr]">
        <Card className="h-fit p-2">
          {tabs.map((t, i) => (
            <button key={t.key} onClick={() => setParams({ tab: t.key })} className={cx('flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition', t.key === tab.key ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-white' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800')}>
              <span className="grid size-6 place-items-center rounded-md bg-slate-100 text-[10px] font-bold text-slate-500 dark:bg-slate-800">{i + 1}</span>
              <t.icon className="size-4" /> {t.label}
            </button>
          ))}
        </Card>
        <Card>
          <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <h2 className="flex items-center gap-2 font-semibold"><tab.icon className="size-4 text-brand-600" /> {tab.label}</h2>
          </div>
          {!ready ? <Skeleton /> : tab.key === 'units' ? <UnitsTab blocks={lk.blocks} unitTypes={lk.unitTypes} /> : <MasterTab key={tab.key} tab={tab} />}
        </Card>
      </div>
    </>
  )
}
