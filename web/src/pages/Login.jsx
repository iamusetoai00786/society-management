import { useMemo, useState } from 'react'
import { Building2, ShieldCheck, Home, UserCog, Sparkles, ArrowRight, ArrowLeft, Globe2, Search, MapPin } from 'lucide-react'
import { useApp, useApi } from '../context/AppContext'
import { Avatar, Input, cx } from '../components/ui'

const GROUPS = [
  ['admin', 'Committee (admins)', UserCog, 'Set up masters, billing, accounts, approvals'],
  ['guard', 'Security', ShieldCheck, 'Gate console: visitors, OTP passes, daily help'],
  ['resident', 'Residents', Home, 'Pay dues, approve visitors, bookings, complaints'],
]

export default function Login() {
  const { login, toast } = useApp()
  const [soc, setSoc] = useState(null)
  const [busy, setBusy] = useState(null)
  const [q, setQ] = useState('')
  const { data: societies } = useApi('/api/public/societies')
  const { data: people } = useApi(soc ? `/api/public/directory?societyId=${soc.id}` : null, [soc?.id])
  const go = async (id) => {
    setBusy(id)
    try {
      await login(id)
    } catch (e) {
      toast(e.message, 'error')
      setBusy(null)
    }
  }
  const filtered = useMemo(() => (people || []).filter((p) => `${p.name} ${p.unitId || ''} ${p.title}`.toLowerCase().includes(q.toLowerCase())), [people, q])

  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.1fr]">
      <div className="ai-gradient relative hidden overflow-hidden p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-2xl bg-white/20 backdrop-blur"><Building2 className="size-6" /></div>
          <span className="text-xl font-bold">SocietyOS</span>
        </div>
        <div>
          <h1 className="text-4xl font-bold leading-tight">One platform.<br />Every society.</h1>
          <p className="mt-4 max-w-md text-white/85">The platform owner onboards societies. Each society's committee sets up its master tables, then residents, guards and staff work on the same connected data.</p>
          <ol className="mt-8 max-w-md space-y-2 text-sm">
            {['Platform owner onboards a society', 'Committee sets up masters: blocks, units, charge heads, staff', 'Residents added, and they get the app', 'Bills, gate, helpdesk, notices run on that data'].map((f, i) => (
              <li key={f} className="flex items-center gap-3 rounded-xl bg-white/15 px-3 py-2 backdrop-blur"><span className="grid size-6 place-items-center rounded-full bg-white/25 text-xs font-bold">{i + 1}</span>{f}</li>
            ))}
          </ol>
        </div>
        <p className="flex items-center gap-2 text-sm text-white/70"><Sparkles className="size-4" /> Demo build · mock API · data stays in your browser</p>
        <div className="absolute -right-24 -top-24 size-96 rounded-full bg-white/10 blur-3xl" />
      </div>

      <div className="flex items-start justify-center overflow-y-auto p-6 lg:items-center">
        <div className="w-full max-w-lg py-6">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="ai-gradient grid size-10 place-items-center rounded-xl text-white"><Building2 className="size-5" /></div>
            <span className="text-xl font-bold">SocietyOS</span>
          </div>

          {!soc ? (
            <>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Sign in 👋</h2>
              <p className="mt-1 text-sm text-slate-500">Step 1 of 2: choose where you belong.</p>
              <button onClick={() => setSoc({ id: 'platform', name: 'SocietyOS Platform' })} className="group mt-6 flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-brand-500 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900">
                <div className="ai-gradient grid size-12 shrink-0 place-items-center rounded-xl text-white"><Globe2 className="size-6" /></div>
                <div className="flex-1"><p className="font-semibold">Platform owner</p><p className="text-xs text-slate-500">Onboard societies, plans, suspend/activate, view any society</p></div>
                <ArrowRight className="size-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-brand-500" />
              </button>
              <p className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-slate-400">Societies</p>
              <div className="space-y-2">
                {(societies || []).map((x) => (
                  <button key={x.id} onClick={() => setSoc(x)} disabled={x.status === 'suspended'} className="group flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-brand-500 hover:shadow-lg disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900">
                    <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-brand-50 font-bold text-brand-700 dark:bg-brand-500/10 dark:text-brand-100">{x.code}</div>
                    <div className="flex-1">
                      <p className="font-semibold">{x.name}</p>
                      <p className="flex items-center gap-1 text-xs text-slate-500"><MapPin className="size-3" /> {x.city} · {x.units} units · {x.plan}{x.status === 'suspended' ? ' · suspended' : ''}</p>
                    </div>
                    <ArrowRight className="size-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-brand-500" />
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <button onClick={() => (setSoc(null), setQ(''))} className="mb-4 flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"><ArrowLeft className="size-4" /> Back</button>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{soc.name}</h2>
              <p className="mt-1 text-sm text-slate-500">Step 2 of 2: who are you? (In production: mobile number + OTP.)</p>
              {soc.id !== 'platform' && <div className="relative mt-5"><Search className="absolute left-3 top-2.5 size-4 text-slate-400" /><Input className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or flat" /></div>}
              <div className="mt-5 space-y-5">
                {(soc.id === 'platform' ? [['super_admin', 'Platform owner', Globe2, 'Full access to every society']] : GROUPS).map(([role, label, Icon, desc]) => {
                  const list = filtered.filter((p) => p.role === role)
                  if (!list.length) return null
                  return (
                    <div key={role}>
                      <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400"><Icon className="size-3.5" /> {label} <span className="font-normal normal-case">· {desc}</span></p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {list.map((p) => (
                          <button key={p.id} onClick={() => go(p.id)} disabled={!!busy} className={cx('flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-brand-500 hover:shadow-md dark:border-slate-800 dark:bg-slate-900', busy === p.id && 'animate-pulse border-brand-500')}>
                            <Avatar name={p.name} />
                            <div className="min-w-0"><p className="truncate text-sm font-semibold">{p.name}</p><p className="truncate text-xs text-slate-500">{p.title}{p.unitId ? ` · ${p.unitId}` : ''}</p></div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
