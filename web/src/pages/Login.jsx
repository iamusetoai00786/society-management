import { useState } from 'react'
import { Building2, ShieldCheck, Home, UserCog, Sparkles, ArrowRight } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { cx } from '../components/ui'

const ROLES = [
  { role: 'admin', title: 'Society Admin', desc: 'Secretary / Treasurer: billing, accounts, residents, AI insights', icon: UserCog, who: 'Neha Kapoor' },
  { role: 'resident', title: 'Resident', desc: 'Pay dues, approve visitors, book amenities, raise complaints', icon: Home, who: 'Rohan Mehta · B-203' },
  { role: 'guard', title: 'Security Guard', desc: 'Gate console: log visitors, verify OTP passes, daily help', icon: ShieldCheck, who: 'Ram Singh · Gate 1' },
]

export default function Login() {
  const { login, toast } = useApp()
  const [busy, setBusy] = useState(null)
  const go = async (r) => {
    setBusy(r)
    try {
      await login(r)
    } catch (e) {
      toast(e.message, 'error')
      setBusy(null)
    }
  }
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="ai-gradient relative hidden overflow-hidden p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-2xl bg-white/20 backdrop-blur"><Building2 className="size-6" /></div>
          <span className="text-xl font-bold">SocietyOS</span>
        </div>
        <div>
          <h1 className="text-4xl font-bold leading-tight">Run your society<br />on autopilot.</h1>
          <p className="mt-4 max-w-md text-white/85">Billing, gate security, complaints, bookings and accounts in one place, with a built-in AI that spots problems before residents do.</p>
          <div className="mt-8 grid max-w-md grid-cols-2 gap-3 text-sm">
            {['AI ticket triage', 'Defaulter prediction', 'Voice assistant', 'OTP gate passes'].map((f) => (
              <div key={f} className="flex items-center gap-2 rounded-xl bg-white/15 px-3 py-2 backdrop-blur"><Sparkles className="size-4" />{f}</div>
            ))}
          </div>
        </div>
        <p className="text-sm text-white/70">Demo build · mock API · no real data</p>
        <div className="absolute -right-24 -top-24 size-96 rounded-full bg-white/10 blur-3xl" />
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="ai-gradient grid size-10 place-items-center rounded-xl text-white"><Building2 className="size-5" /></div>
            <span className="text-xl font-bold">SocietyOS</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Welcome back 👋</h2>
          <p className="mt-1 text-sm text-slate-500">Choose a demo role to explore Green Valley Residency.</p>
          <div className="mt-6 space-y-3">
            {ROLES.map((r) => (
              <button key={r.role} onClick={() => go(r.role)} disabled={!!busy}
                className={cx('group flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-brand-500 hover:shadow-lg hover:shadow-brand-500/10 dark:border-slate-800 dark:bg-slate-900', busy === r.role && 'border-brand-500')}>
                <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-100"><r.icon className="size-6" /></div>
                <div className="flex-1">
                  <p className="font-semibold">{r.title}</p>
                  <p className="text-xs text-slate-500">{r.desc}</p>
                  <p className="mt-1 text-[11px] font-medium text-brand-600">{r.who}</p>
                </div>
                <ArrowRight className={cx('size-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-brand-500', busy === r.role && 'animate-pulse text-brand-500')} />
              </button>
            ))}
          </div>
          <p className="mt-8 text-center text-xs text-slate-400">In production this screen uses mobile OTP login (POST /api/auth/login).</p>
        </div>
      </div>
    </div>
  )
}
