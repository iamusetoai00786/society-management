import { useState } from 'react'
import { History, Search } from 'lucide-react'
import { useApi } from '../context/AppContext'
import { Card, Badge, PageHeader, Skeleton, Input, Select, Table, Avatar, fmtDate, fmtTime } from '../components/ui'

const ROLE = { super_admin: ['Platform', 'purple'], admin: ['Admin', 'blue'], guard: ['Guard', 'amber'], resident: ['Resident', 'green'] }

export default function Activity() {
  const [q, setQ] = useState('')
  const [role, setRole] = useState('')
  const [entity, setEntity] = useState('')
  const { data: all } = useApi('/api/activity')
  const { data, loading } = useApi(`/api/activity?q=${encodeURIComponent(q)}&actorRole=${role}&entity=${entity}`)
  const entities = [...new Set((all || []).map((a) => a.entity))].sort()
  return (
    <>
      <PageHeader title="Activity log" subtitle="Every change: who did it, when and what changed. Nothing is deleted from here." />
      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row dark:border-slate-800">
          <div className="relative flex-1"><Search className="absolute left-3 top-2.5 size-4 text-slate-400" /><Input className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search person, unit, invoice, ticket…" /></div>
          <Select className="sm:w-40" value={role} onChange={(e) => setRole(e.target.value)} options={[{ value: '', label: 'All roles' }, ...Object.entries(ROLE).map(([k, [l]]) => ({ value: k, label: l }))]} />
          <Select className="sm:w-44" value={entity} onChange={(e) => setEntity(e.target.value)} options={[{ value: '', label: 'All records' }, ...entities.map((e) => ({ value: e, label: e }))]} />
        </div>
        {loading && !data ? <Skeleton rows={8} /> : (
          <Table rows={data || []} pageSize={20} empty={<span className="flex flex-col items-center gap-2"><History className="size-6" />No activity matches</span>} columns={[
            { key: 'at', label: 'When', render: (a) => <div><p className="font-medium">{fmtDate(a.at, { day: 'numeric', month: 'short' })}</p><p className="text-xs text-slate-500">{fmtTime(a.at)}</p></div> },
            { key: 'actor', label: 'Who', render: (a) => <div className="flex items-center gap-2"><Avatar name={a.actor} size="sm" /><div><p className="font-medium">{a.actor}</p><Badge tone={ROLE[a.actorRole]?.[1]}>{ROLE[a.actorRole]?.[0] || a.actorRole}</Badge></div></div> },
            { key: 'action', label: 'Did', render: (a) => <span className="font-semibold capitalize">{a.action}</span> },
            { key: 'entity', label: 'Record', render: (a) => <div><Badge tone="gray">{a.entity}</Badge><p className="mt-0.5 font-mono text-xs">{a.entityId}</p></div> },
            { key: 'detail', label: 'Details', nowrap: false, className: 'min-w-64 text-slate-600 dark:text-slate-400' },
          ]} />
        )}
      </Card>
    </>
  )
}
