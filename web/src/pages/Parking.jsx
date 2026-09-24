import { useState } from 'react'
import { Car, Zap } from 'lucide-react'
import { useApp, useApi, useAction } from '../context/AppContext'
import { api } from '../api/client'
import { Card, PageHeader, Skeleton, Stat, Tabs, Modal, Button, Select, Field, cx } from '../components/ui'

export default function Parking() {
  const { role } = useApp()
  const { data } = useApi('/api/parking')
  const { data: units } = useApi(role === 'admin' ? '/api/units?occupancy=' : null)
  const [sel, setSel] = useState(null)
  const [unitId, setUnitId] = useState('')
  const { run, busy } = useAction()
  const levels = [...new Set((data || []).map((p) => p.level))]
  const [level, setLevel] = useState(null)
  const cur = level || levels[0]
  const slots = (data || []).filter((p) => p.level === cur)
  const save = async (value) => {
    await run(() => api.patch(`/api/parking/${sel.id}`, { unitId: value || null }), value ? `${sel.id} allotted to ${value}. Billed from the next cycle.` : `${sel.id} freed`)
    setSel(null)
  }
  return (
    <>
      <PageHeader title="Parking" subtitle={role === 'admin' ? 'Click a slot to allot or free it. The Parking charge head bills per allotted slot.' : 'Slot allotment across levels.'} />
      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="Total slots" value={data?.length ?? '…'} icon={Car} />
        <Stat label="Allotted" value={(data || []).filter((p) => p.unitId).length} icon={Car} tone="green" />
        <Stat label="Free" value={(data || []).filter((p) => !p.unitId).length} icon={Car} tone="amber" />
        <Stat label="EV chargers" value={(data || []).filter((p) => p.type === 'EV').length} icon={Zap} tone="sky" />
      </div>
      <Card className="p-5">
        {levels.length > 1 && <div className="mb-4"><Tabs value={cur} onChange={setLevel} tabs={levels} /></div>}
        {!data ? <Skeleton /> : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6 lg:grid-cols-8 2xl:grid-cols-12">
            {slots.map((p) => (
              <button key={p.id} disabled={role !== 'admin'} onClick={() => (setSel(p), setUnitId(p.unitId || ''))} className={cx('flex aspect-[3/4] flex-col items-center justify-center rounded-xl border-2 text-xs transition enabled:hover:scale-[1.04]', p.unitId ? 'border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-100' : 'border-dashed border-slate-300 text-slate-400 dark:border-slate-700')}>
                {p.type === 'EV' ? <Zap className="size-5 text-emerald-500" /> : <Car className="size-5" />}
                <p className="mt-1 font-semibold">{p.id.split('-').pop()}</p>
                <p className="text-[10px]">{p.unitId || 'Free'}</p>
              </button>
            ))}
          </div>
        )}
      </Card>
      {sel && (
        <Modal open onClose={() => setSel(null)} title={`Slot ${sel.id}`} footer={<>{sel.unitId && <Button variant="secondary" loading={busy} onClick={() => save(null)}>Free slot</Button>}<Button loading={busy} disabled={!unitId || unitId === sel.unitId} onClick={() => save(unitId)}>Allot</Button></>}>
          <Field label="Allot to unit" hint="Only occupied units can hold a slot.">
            <Select value={unitId} onChange={(e) => setUnitId(e.target.value)} options={[{ value: '', label: 'Select unit' }, ...(units || []).filter((u) => u.occupancy !== 'vacant').map((u) => ({ value: u.id, label: `${u.id} · ${u.residents.map((r) => r.name).join(', ')} · ${u.parking.length} slot(s)` }))]} />
          </Field>
        </Modal>
      )}
    </>
  )
}
