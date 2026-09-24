import { HardHat, Phone } from 'lucide-react'
import { useApi, useAction } from '../context/AppContext'
import { api } from '../api/client'
import { Card, Badge, Button, PageHeader, Skeleton, Stat, Avatar } from '../components/ui'

export default function Staff() {
  const { data } = useApi('/api/staff')
  const { run } = useAction()
  const present = (data || []).filter((s) => s.present).length
  return (
    <>
      <PageHeader title="Staff" subtitle="Security, maintenance and housekeeping team with today’s attendance." />
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Stat label="Total staff" value={data?.length ?? '…'} icon={HardHat} />
        <Stat label="Present today" value={present} tone="green" icon={HardHat} />
        <Stat label="Absent" value={(data?.length || 0) - present} tone="rose" icon={HardHat} />
      </div>
      {!data ? <Skeleton /> : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((s) => (
            <Card key={s.id} className="flex items-center gap-4 p-4">
              <Avatar name={s.name} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{s.name}</p>
                <p className="text-xs text-slate-500">{s.role} · {s.shift} shift</p>
                <a href={`tel:${s.phone}`} className="mt-1 flex items-center gap-1 text-xs text-brand-600"><Phone className="size-3" />{s.phone}</a>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge tone={s.present ? 'green' : 'red'}>{s.present ? 'Present' : 'Absent'}</Badge>
                <Button size="sm" variant="ghost" onClick={() => run(() => api.post(`/api/staff/${s.id}/attendance`), 'Attendance updated')}>Toggle</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  )
}
