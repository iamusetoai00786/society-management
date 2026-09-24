import { useState } from 'react'
import { Plus, Sparkles, Pin, Trash2, Eye, Megaphone, Languages } from 'lucide-react'
import { useApp, useApi, useAction } from '../context/AppContext'
import { api } from '../api/client'
import { Card, Badge, Button, PageHeader, Skeleton, Input, Textarea, Select, Field, Modal, AIBadge, Empty, ago, cx } from '../components/ui'

function Composer({ open, onClose }) {
  const [prompt, setPrompt] = useState('')
  const [tone, setTone] = useState('friendly')
  const [f, setF] = useState({ title: '', body: '', audience: 'All residents', category: 'General', pinned: false })
  const [hindi, setHindi] = useState('')
  const [drafting, setDrafting] = useState(false)
  const { run, busy } = useAction()
  const draft = async () => {
    setDrafting(true)
    const d = await api.post('/api/ai/draft-notice', { prompt, tone })
    setF((x) => ({ ...x, title: d.title, body: '', category: d.category, audience: d.suggestedAudience }))
    setHindi(d.translations.hi)
    const words = d.body.split(/(\s+)/)
    for (let i = 0; i <= words.length; i += 4) {
      await new Promise((r) => setTimeout(r, 15))
      setF((x) => ({ ...x, body: words.slice(0, i).join('') }))
    }
    setF((x) => ({ ...x, body: d.body }))
    setDrafting(false)
  }
  const publish = async () => {
    await run(() => api.post('/api/notices', f), 'Notice published & residents notified')
    setF({ title: '', body: '', audience: 'All residents', category: 'General', pinned: false })
    setPrompt('')
    onClose()
  }
  return (
    <Modal open={open} onClose={onClose} title="New notice" wide footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={busy} disabled={!f.title || !f.body} onClick={publish}>Publish</Button></>}>
      <div className="space-y-4">
        <div className="ai-border rounded-2xl bg-gradient-to-br from-indigo-50 to-fuchsia-50 p-4 dark:from-indigo-500/10 dark:to-fuchsia-500/10">
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold"><Sparkles className="size-4 text-violet-500" /> Write with AI</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g. water tank cleaning this Saturday 10am to 2pm" onKeyDown={(e) => e.key === 'Enter' && prompt && draft()} />
            <Select className="sm:w-32" value={tone} onChange={(e) => setTone(e.target.value)} options={[{ value: 'friendly', label: 'Friendly' }, { value: 'formal', label: 'Formal' }, { value: 'urgent', label: 'Urgent' }]} />
            <Button variant="ai" loading={drafting} disabled={!prompt} onClick={draft}>Draft</Button>
          </div>
        </div>
        <Field label="Title"><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
        <Field label="Message"><Textarea rows={8} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></Field>
        {hindi && <p className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-800"><Languages className="size-4" /> Auto-translated preview (Hindi): {hindi}</p>}
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Audience"><Select value={f.audience} onChange={(e) => setF({ ...f, audience: e.target.value })} options={['All residents', 'Owners', 'Tenants', 'Block A', 'Block B', 'Block C', 'Committee']} /></Field>
          <Field label="Category"><Select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} options={['General', 'Maintenance', 'Event', 'Meeting', 'Finance', 'Security']} /></Field>
          <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" checked={f.pinned} onChange={(e) => setF({ ...f, pinned: e.target.checked })} className="size-4 accent-brand-600" /> Pin to top</label>
        </div>
      </div>
    </Modal>
  )
}

export default function Notices() {
  const { user } = useApp()
  const { data, loading } = useApi('/api/notices')
  const [open, setOpen] = useState(false)
  const { run } = useAction()
  const tone = { Maintenance: 'amber', Event: 'purple', Meeting: 'blue', Finance: 'green', Security: 'red' }
  return (
    <>
      <PageHeader title="Notices" subtitle="Announcements for residents, delivered by push, email and SMS." actions={user.role === 'admin' && <Button icon={Plus} onClick={() => setOpen(true)}>New notice <AIBadge /></Button>} />
      {loading && !data ? <Card><Skeleton /></Card> : !data?.length ? <Card><Empty icon={Megaphone} title="No notices yet" /></Card> : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.map((n) => (
            <Card key={n.id} className={cx('flex flex-col p-5', n.pinned && 'ring-2 ring-brand-500/30')}>
              <div className="mb-2 flex items-center gap-2">
                {n.pinned && <Pin className="size-4 text-brand-500" />}
                <Badge tone={tone[n.category] || 'gray'}>{n.category}</Badge>
                <span className="text-xs text-slate-500">{n.audience}</span>
                <span className="ml-auto text-xs text-slate-400">{ago(n.createdAt)}</span>
              </div>
              <h3 className="font-semibold">{n.title}</h3>
              <p className="mt-2 flex-1 whitespace-pre-line text-sm text-slate-600 dark:text-slate-400">{n.body}</p>
              <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                <span>By {n.author}</span>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1"><Eye className="size-3.5" /> {n.reads} read</span>
                  {user.role === 'admin' && <button onClick={() => run(() => api.del(`/api/notices/${n.id}`), 'Notice deleted')} className="text-slate-400 hover:text-rose-600" aria-label="Delete"><Trash2 className="size-4" /></button>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      <Composer open={open} onClose={() => setOpen(false)} />
    </>
  )
}
