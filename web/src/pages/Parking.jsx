import { useState } from 'react'
import { Car, Zap } from 'lucide-react'
import { useApi } from '../context/AppContext'
import { Card, PageHeader, Skeleton, Stat, Tabs, cx } from '../components/ui'

export default function Parking() {
  const { data } = useApi('/api/parking')
  const [level, setLevel] = useState('B1')
  const slots = (data || []).filter((p) => p.level === level)
  return (
    <>
      <PageHeader title="Parking" subtitle="Slot allocation across basement levels." />
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Total slots" value={data?.length ?? '…'} icon={Car} />
        <Stat label="Allocated" value={(data || []).filter((p) => p.unitId).length} icon={Car} tone="green" />
        <Stat label="Free" value={(data || []).filter((p) => !p.unitId).length} icon={Car} tone="amber" />
        <Stat label="EV chargers" value={(data || []).filter((p) => p.type === 'EV').length} icon={Zap} tone="sky" />
      </div>
      <Card className="p-5">
        <div className="mb-4"><Tabs value={level} onChange={setLevel} tabs={['B1', 'B2']} /></div>
        {!data ? <Skeleton /> : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-10">
            {slots.map((p) => (
              <div key={p.id} className={cx('flex aspect-[3/4] flex-col items-center justify-center rounded-xl border-2 text-xs', p.unitId ? 'border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-100' : 'border-dashed border-slate-300 text-slate-400 dark:border-slate-700')}>
                {p.type === 'EV' ? <Zap className="size-5 text-emerald-500" /> : <Car className="size-5" />}
                <p className="mt-1 font-semibold">{p.id}</p>
                <p className="text-[10px]">{p.unitId || 'Free'}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  )
}
