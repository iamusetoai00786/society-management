import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Sparkles, Wrench, MessageCircle, Star, Camera, LayoutGrid, List } from 'lucide-react'
import { useApp, useApi, useAction } from '../context/AppContext'
import { api } from '../api/client'
import { Card, Badge, Button, Table, PageHeader, Skeleton, Input, Textarea, Select, Field, Modal, Tabs, AIBadge, Avatar, ago, cx } from '../components/ui'

const STATUSES = ['open', 'assigned', 'in_progress', 'resolved', 'closed']
const MOOD = { angry: '😠', frustrated: '😤', concerned: '😟', neutral: '🙂' }

function NewTicket({ open, onClose, seed }) {
  const [f, setF] = useState({ title: '', description: '' })
  const [ai, setAi] = useState(null)
  const [thinking, setThinking] = useState(false)
  const { run, busy } = useAction()
  useEffect(() => {
    if (open) setF({ title: seed || '', description: '' })
  }, [open, seed])
  useEffect(() => {
    const text = `${f.title} ${f.description}`.trim()
    if (text.length < 8) return setAi(null)
    setThinking(true)
    const t = setTimeout(async () => {
      setAi(await api.post('/api/ai/classify-ticket', f))
      setThinking(false)
    }, 500)
    return () => clearTimeout(t)
  }, [f])
  const submit = async () => {
    await run(() => api.post('/api/tickets', { ...f, ...(ai ? { category: ai.category, priority: ai.priority, assignee: ai.suggestedAssignee, scope: ai.scope, sentiment: ai.sentiment } : {}) }), (t) => `${t.id} raised and routed to ${t.assignee}`)
    onClose()
  }
  return (
    <Modal open={open} onClose={onClose} title="Raise a complaint" wide footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={busy} onClick={submit} disabled={!f.title}>Submit ticket</Button></>}>
      <div className="grid gap-5 md:grid-cols-5">
        <div className="space-y-4 md:col-span-3">
          <Field label="What’s the problem?"><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. Water leaking from kitchen sink pipe" autoFocus /></Field>
          <Field label="Details"><Textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="When did it start? Where exactly?" /></Field>
          <button className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-4 text-sm text-slate-500 dark:border-slate-700"><Camera className="size-4" /> Add photos</button>
        </div>
        <div className="ai-border rounded-2xl bg-gradient-to-br from-indigo-50 to-fuchsia-50 p-4 md:col-span-2 dark:from-indigo-500/10 dark:to-fuchsia-500/10">
          <p className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="size-4 text-violet-500" /> AI triage {thinking && <span className="text-xs font-normal text-slate-500">analysing…</span>}</p>
          {!ai ? <p className="mt-3 text-sm text-slate-500">Start typing. AI will pick the category, priority and right staff member for you.</p> : (
            <dl className="animate-pop mt-3 space-y-2.5 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Category</dt><dd className="font-semibold">{ai.category}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Priority</dt><dd><Badge>{ai.priority}</Badge></dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Area</dt><dd className="capitalize">{ai.scope}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Assign to</dt><dd className="font-medium">{ai.suggestedAssignee}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Confidence</dt><dd>{Math.round(ai.confidence * 100)}%</dd></div>
            </dl>
          )}
        </div>
      </div>
    </Modal>
  )
}

function TicketDetail({ ticket, onClose }) {
  const { user } = useApp()
  const [text, setText] = useState('')
  const { run } = useAction()
  const [t, setT] = useState(ticket)
  useEffect(() => {
    setT(ticket)
  }, [ticket])
  const [draft, setDraft] = useState(null)
  if (!t) return null
  const patch = async (b, msg) => setT(await run(() => api.patch(`/api/tickets/${t.id}`, b), msg))
  const comment = async (msg = text) => {
    setT(await run(() => api.post(`/api/tickets/${t.id}/comments`, { text: msg })))
    setText('')
  }
  const suggest = async () => setDraft((await api.post('/api/ai/classify-ticket', t)).suggestedReply)
  return (
    <Modal open onClose={onClose} title={`${t.id} · ${t.title}`} wide>
      <div className="space-y-5">
        <div className="flex flex-wrap gap-2">
          <Badge>{t.status}</Badge><Badge>{t.priority}</Badge><Badge tone="purple">{t.category}</Badge><Badge tone="gray">{t.scope}</Badge>
          {t.sentiment && <span className="text-xs text-slate-500">{MOOD[t.sentiment]} {t.sentiment}</span>}
        </div>
        <p className="text-sm">{t.description || 'No additional details.'}</p>
        <p className="text-xs text-slate-500">Raised by {t.raisedBy} ({t.unitId}) · {ago(t.createdAt)} · Assigned to <strong>{t.assignee || 'nobody yet'}</strong></p>
        {user.role === 'admin' && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Status"><Select value={t.status} onChange={(e) => patch({ status: e.target.value }, 'Status updated')} options={STATUSES.map((s) => ({ value: s, label: s.replace('_', ' ') }))} /></Field>
            <Field label="Assignee"><Select value={t.assignee || ''} onChange={(e) => patch({ assignee: e.target.value, status: t.status === 'open' ? 'assigned' : t.status }, 'Assigned')} options={['', 'Suresh (Plumber)', 'Mahesh (Electrician)', 'Otis AMC Team', 'Ram Singh (Security)', 'CleanPro Team', 'Facility Manager', 'Committee'].map((x) => ({ value: x, label: x || 'Unassigned' }))} /></Field>
          </div>
        )}
        <div>
          <p className="mb-2 text-sm font-semibold">Activity</p>
          <ul className="space-y-3">
            {t.comments.map((c, i) => (
              <li key={i} className="flex gap-3"><Avatar name={c.by} size="sm" /><div className="rounded-xl bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800"><p className="text-xs font-semibold">{c.by} <span className="font-normal text-slate-400">· {ago(c.at)}</span></p>{c.text}</div></li>
            ))}
            {!t.comments.length && <li className="text-sm text-slate-500">No updates yet.</li>}
          </ul>
        </div>
        {draft && (
          <div className="ai-border animate-pop rounded-xl bg-violet-50 p-3 text-sm dark:bg-violet-500/10">
            <p className="mb-1 flex items-center gap-2 text-xs font-semibold"><AIBadge>Suggested reply</AIBadge></p>{draft}
            <div className="mt-2 flex gap-2"><Button size="sm" onClick={() => (comment(draft), setDraft(null))}>Send</Button><Button size="sm" variant="ghost" onClick={() => (setText(draft), setDraft(null))}>Edit</Button></div>
          </div>
        )}
        <div className="flex gap-2">
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Write an update…" onKeyDown={(e) => e.key === 'Enter' && text && comment()} />
          {user.role === 'admin' && <Button variant="ai" icon={Sparkles} onClick={suggest} title="AI reply" />}
          <Button icon={MessageCircle} disabled={!text} onClick={() => comment()}>Send</Button>
        </div>
        {user.role === 'resident' && t.status === 'resolved' && (
          <div className="flex items-center justify-between rounded-xl bg-emerald-50 p-4 dark:bg-emerald-500/10">
            <p className="text-sm font-medium">Rate the resolution</p>
            <div className="flex gap-1">{[1, 2, 3, 4, 5].map((n) => <button key={n} onClick={() => patch({ rating: n, status: 'closed' }, 'Thanks for the feedback!')}><Star className={cx('size-6', n <= (t.rating || 0) ? 'fill-amber-400 text-amber-400' : 'text-slate-300')} /></button>)}</div>
          </div>
        )}
      </div>
    </Modal>
  )
}

export default function Helpdesk() {
  const [params, setParams] = useSearchParams()
  const [status, setStatus] = useState('')
  const [view, setView] = useState('board')
  const [sel, setSel] = useState(null)
  const { data, loading } = useApi(`/api/tickets?status=${view === 'board' ? '' : status}`)
  const newOpen = params.has('new')
  const list = data || []
  return (
    <>
      <PageHeader title="Helpdesk" subtitle="Complaints and service requests, triaged by AI." actions={<Button icon={Plus} onClick={() => setParams({ new: '' })}>New ticket</Button>} />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        {view === 'list' ? <Tabs value={status} onChange={setStatus} tabs={[{ value: '', label: 'All' }, ...STATUSES.map((s) => ({ value: s, label: s.replace('_', ' ') }))]} /> : <span />}
        <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          {[['board', LayoutGrid], ['list', List]].map(([v, I]) => <button key={v} onClick={() => setView(v)} className={cx('rounded-lg p-1.5', view === v && 'bg-white shadow-sm dark:bg-slate-700')} aria-label={v}><I className="size-4" /></button>)}
        </div>
      </div>
      {loading && !data ? <Card><Skeleton /></Card> : view === 'board' ? (
        <div className="scrollbar-thin grid auto-cols-[minmax(260px,1fr)] grid-flow-col gap-4 overflow-x-auto pb-4">
          {STATUSES.map((s) => {
            const col = list.filter((t) => t.status === s)
            return (
              <div key={s} className="rounded-2xl bg-slate-100/70 p-3 dark:bg-slate-900/60">
                <p className="mb-3 flex items-center justify-between px-1 text-sm font-semibold capitalize">{s.replace('_', ' ')}<span className="rounded-full bg-white px-2 text-xs dark:bg-slate-800">{col.length}</span></p>
                <div className="space-y-2">
                  {col.map((t) => (
                    <button key={t.id} onClick={() => setSel(t)} className="block w-full rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
                      <div className="flex items-center justify-between text-xs text-slate-500"><span>{t.id}</span><span>{MOOD[t.sentiment]}</span></div>
                      <p className="mt-1 text-sm font-medium">{t.title}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5"><Badge>{t.priority}</Badge><Badge tone="purple">{t.category}</Badge></div>
                      <p className="mt-2 text-xs text-slate-500">{t.unitId} · {ago(t.createdAt)}{t.assignee && ` · ${t.assignee}`}</p>
                    </button>
                  ))}
                  {!col.length && <p className="py-6 text-center text-xs text-slate-400">Empty</p>}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <Card>
          <Table rows={list} onRow={setSel} empty={<span className="flex flex-col items-center gap-2"><Wrench className="size-6" />No tickets</span>} columns={[
            { key: 'id', label: 'ID', className: 'font-mono text-xs' },
            { key: 'title', label: 'Title', render: (t) => <span className="font-medium">{t.title}</span> },
            { key: 'category', label: 'Category', render: (t) => <Badge tone="purple">{t.category}</Badge> },
            { key: 'priority', label: 'Priority', render: (t) => <Badge>{t.priority}</Badge> },
            { key: 'unitId', label: 'Unit' },
            { key: 'assignee', label: 'Assignee', render: (t) => t.assignee || <span className="text-slate-400">Unassigned</span> },
            { key: 'status', label: 'Status', render: (t) => <Badge>{t.status}</Badge> },
            { key: 'createdAt', label: 'Age', render: (t) => ago(t.createdAt), className: 'text-slate-500' },
          ]} />
        </Card>
      )}
      <NewTicket open={newOpen} seed={params.get('new')} onClose={() => setParams({})} />
      {sel && <TicketDetail ticket={sel} onClose={() => setSel(null)} />}
    </>
  )
}
