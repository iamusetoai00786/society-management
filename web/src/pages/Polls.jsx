import { useState } from 'react'
import { Plus, Vote, CheckCircle2, X } from 'lucide-react'
import { useApp, useApi, useAction } from '../context/AppContext'
import { api } from '../api/client'
import { Card, Badge, Button, PageHeader, Skeleton, Input, Field, Modal, fmtDate, cx } from '../components/ui'

function NewPoll({ open, onClose }) {
  const [q, setQ] = useState('')
  const [opts, setOpts] = useState(['', ''])
  const [days, setDays] = useState(7)
  const { run, busy } = useAction()
  const save = async () => {
    await run(() => api.post('/api/polls', { question: q, options: opts, days: Number(days) }), 'Poll created')
    setQ('')
    setOpts(['', ''])
    onClose()
  }
  return (
    <Modal open={open} onClose={onClose} title="Create poll" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={busy} onClick={save} disabled={!q || opts.filter(Boolean).length < 2}>Create</Button></>}>
      <div className="space-y-4">
        <Field label="Question"><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. Should we repaint the building this year?" /></Field>
        {opts.map((o, i) => (
          <div key={i} className="flex gap-2">
            <Input value={o} onChange={(e) => setOpts(opts.map((x, j) => (j === i ? e.target.value : x)))} placeholder={`Option ${i + 1}`} />
            {opts.length > 2 && <button onClick={() => setOpts(opts.filter((_, j) => j !== i))} className="text-slate-400" aria-label="Remove option"><X className="size-4" /></button>}
          </div>
        ))}
        <Button size="sm" variant="ghost" icon={Plus} onClick={() => setOpts([...opts, ''])}>Add option</Button>
        <Field label="Open for (days)"><Input type="number" min={1} value={days} onChange={(e) => setDays(e.target.value)} /></Field>
      </div>
    </Modal>
  )
}

export default function Polls() {
  const { user } = useApp()
  const { data, loading } = useApi('/api/polls')
  const [open, setOpen] = useState(false)
  const { run } = useAction()
  return (
    <>
      <PageHeader title="Polls & Voting" subtitle="One vote per member. Results update live." actions={user.role === 'admin' && <Button icon={Plus} onClick={() => setOpen(true)}>New poll</Button>} />
      {loading && !data ? <Card><Skeleton /></Card> : (
        <div className="grid gap-4 md:grid-cols-2">
          {(data || []).map((p) => {
            const total = p.options.reduce((s, o) => s + o.votes, 0)
            const top = Math.max(...p.options.map((o) => o.votes))
            const canVote = !p.voted && !p.closed && user.role !== 'guard'
            return (
              <Card key={p.id} className="p-5">
                <div className="mb-3 flex items-center gap-2">
                  <Vote className="size-4 text-brand-500" />
                  <Badge tone={p.closed ? 'gray' : 'green'}>{p.closed ? 'Closed' : 'Open'}</Badge>
                  <span className="ml-auto text-xs text-slate-500">{p.closed ? 'Closed' : 'Closes'} {fmtDate(p.closesAt, { day: 'numeric', month: 'short' })}</span>
                </div>
                <h3 className="font-semibold">{p.question}</h3>
                <div className="mt-4 space-y-2">
                  {p.options.map((o) => {
                    const pct = total ? Math.round((o.votes / total) * 100) : 0
                    return (
                      <button key={o.id} disabled={!canVote} onClick={() => run(() => api.post(`/api/polls/${p.id}/vote`, { optionId: o.id }), 'Vote recorded')}
                        className={cx('relative w-full overflow-hidden rounded-xl border px-4 py-2.5 text-left text-sm transition', canVote ? 'border-slate-200 hover:border-brand-500 dark:border-slate-700' : 'border-transparent bg-slate-50 dark:bg-slate-800/60')}>
                        {!canVote && <div className={cx('absolute inset-y-0 left-0 transition-all', o.votes === top ? 'bg-brand-100 dark:bg-brand-500/20' : 'bg-slate-100 dark:bg-slate-800')} style={{ width: `${pct}%` }} />}
                        <span className="relative flex justify-between"><span className="flex items-center gap-2">{o.votes === top && !canVote && <CheckCircle2 className="size-4 text-brand-600" />}{o.text}</span>{!canVote && <span className="font-semibold">{pct}%</span>}</span>
                      </button>
                    )
                  })}
                </div>
                <p className="mt-3 text-xs text-slate-500">{total} votes{p.voted && ' · You voted'}</p>
              </Card>
            )
          })}
        </div>
      )}
      <NewPoll open={open} onClose={() => setOpen(false)} />
    </>
  )
}
