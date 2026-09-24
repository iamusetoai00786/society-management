import { Siren, CheckCircle2 } from 'lucide-react'
import { useApi, useAction } from '../context/AppContext'
import { api } from '../api/client'
import { Card, Badge, Button, PageHeader, Skeleton, Empty, ago, cx } from '../components/ui'

export default function Sos() {
  const { data } = useApi('/api/sos')
  const { run } = useAction()
  return (
    <>
      <PageHeader title="SOS Alerts" subtitle="Emergency alerts raised by residents. Respond immediately." />
      {!data ? <Skeleton /> : !data.length ? <Card><Empty icon={CheckCircle2} title="No alerts" text="All clear." /></Card> : (
        <div className="space-y-3">
          {data.map((s) => (
            <Card key={s.id} className={cx('flex flex-wrap items-center gap-4 p-5', s.status === 'active' && 'border-rose-300 bg-rose-50 dark:border-rose-500/40 dark:bg-rose-500/10')}>
              <div className={cx('grid size-12 place-items-center rounded-full text-white', s.status === 'active' ? 'animate-pulse bg-rose-600' : 'bg-slate-400')}><Siren className="size-6" /></div>
              <div className="flex-1">
                <p className="font-semibold">{s.type} · {s.unitId}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">{s.message || 'Needs immediate help'}</p>
                <p className="text-xs text-slate-500">{s.raisedBy ? `${s.raisedBy} · ` : ''}{ago(s.createdAt)}</p>
              </div>
              {s.status === 'active' ? <Button variant="success" onClick={() => run(() => api.post(`/api/sos/${s.id}/resolve`), 'Marked resolved')}>Mark resolved</Button> : <Badge>{s.status}</Badge>}
            </Card>
          ))}
        </div>
      )}
    </>
  )
}
