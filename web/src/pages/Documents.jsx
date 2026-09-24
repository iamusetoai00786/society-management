import { useState } from 'react'
import { FileText, Upload, Download, Lock, Search } from 'lucide-react'
import { useApp, useApi, useAction } from '../context/AppContext'
import { api } from '../api/client'
import { Card, Badge, Button, PageHeader, Skeleton, Input, Select, Field, Modal, Table, fmtDate } from '../components/ui'

export default function Documents() {
  const { user, toast } = useApp()
  const { data, loading } = useApi('/api/documents')
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ name: '', category: 'General', access: 'all' })
  const { run, busy } = useAction()
  const upload = async () => {
    await run(() => api.post('/api/documents', { ...f, size: '1.0 MB' }), 'Document uploaded')
    setOpen(false)
    setF({ name: '', category: 'General', access: 'all' })
  }
  const rows = (data || []).filter((d) => d.name.toLowerCase().includes(q.toLowerCase()))
  return (
    <>
      <PageHeader title="Documents" subtitle="Bye-laws, minutes, audit reports and certificates." actions={user.role === 'admin' && <Button icon={Upload} onClick={() => setOpen(true)}>Upload</Button>} />
      <Card>
        <div className="border-b border-slate-100 p-4 dark:border-slate-800">
          <div className="relative max-w-sm"><Search className="absolute left-3 top-2.5 size-4 text-slate-400" /><Input className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search documents" /></div>
        </div>
        {loading && !data ? <Skeleton /> : (
          <Table rows={rows} columns={[
            { key: 'name', label: 'Name', render: (d) => <div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-500/10"><FileText className="size-4" /></div><span className="font-medium">{d.name}</span></div> },
            { key: 'category', label: 'Category', render: (d) => <Badge tone="purple">{d.category}</Badge> },
            { key: 'access', label: 'Access', render: (d) => <span className="flex items-center gap-1 text-xs capitalize text-slate-500">{d.access !== 'all' && <Lock className="size-3" />}{d.access === 'all' ? 'Everyone' : d.access}</span> },
            { key: 'size', label: 'Size', className: 'text-slate-500' },
            { key: 'uploadedAt', label: 'Uploaded', render: (d) => fmtDate(d.uploadedAt) },
            { key: 'x', label: '', render: () => <Button size="sm" variant="ghost" icon={Download} onClick={() => toast('Download starts (demo)', 'info')}>Download</Button> },
          ]} />
        )}
      </Card>
      <Modal open={open} onClose={() => setOpen(false)} title="Upload document" footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button loading={busy} disabled={!f.name} onClick={upload}>Upload</Button></>}>
        <div className="space-y-4">
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 p-8 text-sm text-slate-500 dark:border-slate-700">
            <Upload className="size-6" /> Click to choose a file
            <input type="file" className="hidden" onChange={(e) => e.target.files[0] && setF({ ...f, name: e.target.files[0].name })} />
          </label>
          <Field label="File name"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category"><Select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} options={['General', 'Bye-laws', 'Minutes', 'Finance', 'Compliance', 'Contracts']} /></Field>
            <Field label="Who can see it"><Select value={f.access} onChange={(e) => setF({ ...f, access: e.target.value })} options={[{ value: 'all', label: 'Everyone' }, { value: 'owners', label: 'Owners only' }, { value: 'committee', label: 'Committee only' }]} /></Field>
          </div>
        </div>
      </Modal>
    </>
  )
}
