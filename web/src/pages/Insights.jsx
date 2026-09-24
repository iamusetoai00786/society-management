import { useState } from 'react'
import { Sparkles, TrendingDown, MessageSquareText, Wand2, Brain } from 'lucide-react'
import { useApi, useAction } from '../context/AppContext'
import { api } from '../api/client'
import { Card, CardHeader, Badge, Button, AIBadge, Table, inr, PageHeader, Skeleton, Textarea, cx } from '../components/ui'
import { InsightsList } from './Dashboard'

function TriagePlayground() {
  const [text, setText] = useState('Lift in Block C stuck again between 3rd and 4th floor, my father was trapped for 10 minutes!!')
  const [res, setRes] = useState(null)
  const [busy, setBusy] = useState(false)
  const go = async () => {
    setBusy(true)
    setRes(await api.post('/api/ai/classify-ticket', { title: text }))
    setBusy(false)
  }
  return (
    <Card>
      <CardHeader title="Complaint triage playground" subtitle="POST /api/ai/classify-ticket" icon={Wand2} />
      <div className="space-y-3 p-5">
        <Textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} />
        <Button variant="ai" icon={Sparkles} loading={busy} onClick={go}>Analyse</Button>
        {res && (
          <div className="animate-pop grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-800/60">
            <div><p className="text-xs text-slate-500">Category</p><p className="font-semibold">{res.category}</p></div>
            <div><p className="text-xs text-slate-500">Priority</p><Badge>{res.priority}</Badge></div>
            <div><p className="text-xs text-slate-500">Sentiment</p><p className="font-semibold capitalize">{res.sentiment}</p></div>
            <div><p className="text-xs text-slate-500">Confidence</p><p className="font-semibold">{Math.round(res.confidence * 100)}%</p></div>
            <div className="col-span-2"><p className="text-xs text-slate-500">Route to</p><p className="font-semibold">{res.suggestedAssignee} · {res.scope} area</p></div>
            <div className="col-span-2"><p className="text-xs text-slate-500">Suggested reply</p><p>{res.suggestedReply}</p></div>
          </div>
        )}
      </div>
    </Card>
  )
}

export default function Insights() {
  const { data: risk, loading } = useApi('/api/ai/defaulter-risk')
  const { data: summary } = useApi('/api/ai/ticket-summary')
  const { run } = useAction()
  return (
    <>
      <PageHeader title={<span className="flex items-center gap-3"><span className="ai-text">AI Insights</span> <AIBadge>Beta</AIBadge></span>} subtitle="Predictions, anomalies and summaries generated from your society’s live data." />
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="ai-border xl:col-span-2">
          <CardHeader title="Anomalies & recommendations" icon={Brain} subtitle="GET /api/ai/insights" />
          <InsightsList />
        </Card>
        <Card>
          <CardHeader title="Complaint summary" icon={MessageSquareText} subtitle="GET /api/ai/ticket-summary" />
          <div className="p-5 text-sm leading-relaxed">
            {summary ? <>
              <p>{summary.summary}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">{summary.themes.map((t) => <Badge key={t} tone="purple">{t}</Badge>)}</div>
            </> : <Skeleton rows={3} />}
          </div>
        </Card>
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Defaulter risk prediction" icon={TrendingDown} subtitle="GET /api/ai/defaulter-risk: scored from payment history" />
          {loading && !risk ? <Skeleton /> : (
            <Table rows={(risk || []).slice(0, 12)} columns={[
              { key: 'unitId', label: 'Unit', render: (r) => <span className="font-semibold">{r.unitId}</span> },
              { key: 'resident', label: 'Resident' },
              { key: 'score', label: 'Risk', render: (r) => (
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className={cx('h-full rounded-full', r.level === 'high' ? 'bg-rose-500' : r.level === 'medium' ? 'bg-amber-500' : 'bg-emerald-500')} style={{ width: `${r.score}%` }} /></div>
                  <span className="text-xs font-medium">{r.score}</span>
                </div>) },
              { key: 'outstanding', label: 'Outstanding', render: (r) => inr(r.outstanding) },
              { key: 'reason', label: 'Why', className: 'text-slate-500' },
              { key: 'action', label: 'Suggested action', render: (r) => r.unpaid ? <Button size="sm" variant="secondary" onClick={() => run(() => api.post('/api/invoices/remind-all'), `Smart reminder queued for ${r.unitId}`)}>{r.level === 'high' ? 'Call + remind' : 'Send reminder'}</Button> : <span className="text-xs text-slate-400">{r.action}</span> },
            ]} />
          )}
        </Card>
        <TriagePlayground />
      </div>
    </>
  )
}
