import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, Receipt, Wallet, DoorOpen, Wrench, Megaphone, Vote, CalendarDays, FileText, HardHat, Car, Siren,
  Code2, Settings, Sparkles, Search, Bell, Moon, Sun, LogOut, Menu, X, ChevronDown, Rocket, Building2,
} from 'lucide-react'
import { useApp, useApi, useAction } from '../context/AppContext'
import { api } from '../api/client'
import { cx, Avatar, ago, Modal, Button, Select, Field, Textarea } from './ui'
import Assistant from './Assistant'

export const NAV = [
  { section: 'Overview', items: [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'resident', 'guard'] },
    { to: '/insights', label: 'AI Insights', icon: Sparkles, roles: ['admin'], ai: true },
  ] },
  { section: 'Management', items: [
    { to: '/residents', label: 'Residents & Units', icon: Users, roles: ['admin'] },
    { to: '/billing', label: 'Billing & Payments', icon: Receipt, roles: ['admin', 'resident'] },
    { to: '/accounting', label: 'Accounting', icon: Wallet, roles: ['admin'] },
    { to: '/visitors', label: 'Visitors & Gate', icon: DoorOpen, roles: ['admin', 'resident', 'guard'] },
    { to: '/helpdesk', label: 'Helpdesk', icon: Wrench, roles: ['admin', 'resident'] },
  ] },
  { section: 'Community', items: [
    { to: '/notices', label: 'Notices', icon: Megaphone, roles: ['admin', 'resident', 'guard'] },
    { to: '/polls', label: 'Polls & Voting', icon: Vote, roles: ['admin', 'resident'] },
    { to: '/amenities', label: 'Amenity Booking', icon: CalendarDays, roles: ['admin', 'resident'] },
    { to: '/documents', label: 'Documents', icon: FileText, roles: ['admin', 'resident'] },
  ] },
  { section: 'Operations', items: [
    { to: '/staff', label: 'Staff', icon: HardHat, roles: ['admin', 'guard'] },
    { to: '/parking', label: 'Parking', icon: Car, roles: ['admin', 'guard'] },
    { to: '/sos', label: 'SOS Alerts', icon: Siren, roles: ['admin', 'guard'] },
  ] },
  { section: 'Developer', items: [
    { to: '/api-explorer', label: 'API Explorer', icon: Code2, roles: ['admin', 'resident', 'guard'] },
    { to: '/settings', label: 'Settings', icon: Settings, roles: ['admin'] },
  ] },
]

const WHATS_NEW = [
  ['AI Assistant with voice', 'Ask about dues, bookings or complaints by typing or speaking. Press ⌘/Ctrl + J.'],
  ['AI ticket triage', 'Complaints are auto-categorised, prioritised, sentiment-tagged and routed to the right staff.'],
  ['AI notice writer', 'Describe a notice in one line and get a polished draft in your chosen tone.'],
  ['Defaulter risk prediction', 'Payment-risk score for every unit, with a recommended follow-up.'],
  ['Anomaly insights', 'Spending spikes, complaint hotspots and pending approvals flagged automatically.'],
  ['Command palette', 'Press ⌘/Ctrl + K to jump anywhere or run actions.'],
  ['Gate passes with OTP', 'Residents pre-approve guests; guards check them in with a 6-digit code.'],
  ['Dark mode & mobile-first', 'Redesigned UI that works on phones, tablets at the gate and desktops.'],
]

function Sidebar({ open, onClose }) {
  const { user } = useApp()
  return (
    <>
      <div className={cx('fixed inset-0 z-30 bg-slate-950/40 lg:hidden', open ? 'block' : 'hidden')} onClick={onClose} />
      <aside className={cx('scrollbar-thin fixed inset-y-0 left-0 z-40 flex w-64 flex-col overflow-y-auto border-r border-slate-200 bg-white transition-transform lg:translate-x-0 dark:border-slate-800 dark:bg-slate-900', open ? 'translate-x-0' : '-translate-x-full')}>
        <div className="flex items-center justify-between px-5 py-5">
          <div className="flex items-center gap-2.5">
            <div className="ai-gradient grid size-9 place-items-center rounded-xl text-white shadow-md shadow-purple-500/30"><Building2 className="size-5" /></div>
            <div>
              <p className="font-bold leading-tight text-slate-900 dark:text-white">SocietyOS</p>
              <p className="text-[11px] text-slate-500">Green Valley Residency</p>
            </div>
          </div>
          <button className="lg:hidden" onClick={onClose} aria-label="Close menu"><X className="size-5" /></button>
        </div>
        <nav className="flex-1 space-y-5 px-3 pb-6">
          {NAV.map((s) => {
            const items = s.items.filter((i) => i.roles.includes(user.role))
            if (!items.length) return null
            return (
              <div key={s.section}>
                <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{s.section}</p>
                {items.map((i) => (
                  <NavLink key={i.to} to={i.to} end={i.to === '/'} onClick={onClose}
                    className={({ isActive }) => cx('group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition', isActive ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white')}>
                    <i.icon className={cx('size-4.5', i.ai && 'text-violet-500')} />
                    <span className={i.ai ? 'ai-text font-semibold' : ''}>{i.label}</span>
                  </NavLink>
                ))}
              </div>
            )
          })}
        </nav>
        <div className="m-3 rounded-2xl ai-gradient p-4 text-white">
          <p className="flex items-center gap-1.5 text-sm font-semibold"><Sparkles className="size-4" /> AI Assistant</p>
          <p className="mt-1 text-xs text-white/80">Ask anything about your society.</p>
          <p className="mt-2 text-[11px] text-white/70">Press <kbd className="rounded bg-white/20 px-1">Ctrl</kbd> + <kbd className="rounded bg-white/20 px-1">J</kbd></p>
        </div>
      </aside>
    </>
  )
}

function CommandPalette({ open, onClose }) {
  const { user, askAssistant, setTheme, theme } = useApp()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [idx, setIdx] = useState(0)
  const { data: residents } = useApi(open && user.role === 'admin' ? '/api/residents' : null)
  const inputRef = useRef(null)
  useEffect(() => {
    if (open) {
      setQ('')
      setIdx(0)
      setTimeout(() => inputRef.current?.focus(), 10)
    }
  }, [open])

  const items = useMemo(() => {
    const pages = NAV.flatMap((s) => s.items).filter((i) => i.roles.includes(user.role)).map((i) => ({ label: i.label, hint: 'Page', icon: i.icon, run: () => navigate(i.to) }))
    const actions = [
      { label: 'Toggle dark mode', hint: 'Action', icon: theme === 'dark' ? Sun : Moon, run: () => setTheme(theme === 'dark' ? 'light' : 'dark') },
      user.role === 'resident' && { label: 'Create gate pass for a guest', hint: 'Action', icon: DoorOpen, run: () => navigate('/visitors?pass=1') },
      user.role !== 'guard' && { label: 'Raise a complaint', hint: 'Action', icon: Wrench, run: () => navigate('/helpdesk?new=') },
    ].filter(Boolean)
    const people = (residents || []).slice(0, 200).map((r) => ({ label: `${r.name}`, hint: r.unitId, icon: Users, run: () => navigate(`/residents?q=${encodeURIComponent(r.name)}`) }))
    const all = [...pages, ...actions, ...people]
    const f = q ? all.filter((i) => `${i.label} ${i.hint}`.toLowerCase().includes(q.toLowerCase())) : [...pages, ...actions]
    const ask = q && { label: `Ask AI: “${q}”`, hint: 'AI', icon: Sparkles, run: () => askAssistant(q), ai: true }
    return (ask ? [ask, ...f] : f).slice(0, 9)
  }, [q, residents, user.role, theme, navigate, setTheme, askAssistant])

  if (!open) return null
  const choose = (i) => {
    i?.run()
    onClose()
  }
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-slate-950/50 p-4 pt-[12vh] backdrop-blur-sm" onClick={onClose}>
      <div className="animate-pop w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 dark:border-slate-800">
          <Search className="size-5 text-slate-400" />
          <input ref={inputRef} value={q} onChange={(e) => (setQ(e.target.value), setIdx(0))}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') (e.preventDefault(), setIdx((i) => Math.min(i + 1, items.length - 1)))
              if (e.key === 'ArrowUp') (e.preventDefault(), setIdx((i) => Math.max(i - 1, 0)))
              if (e.key === 'Enter') choose(items[idx])
              if (e.key === 'Escape') onClose()
            }}
            placeholder="Search pages, residents, or ask AI…" className="w-full bg-transparent py-4 text-sm outline-none" />
          <kbd className="rounded-md border border-slate-200 px-1.5 text-xs text-slate-400 dark:border-slate-700">ESC</kbd>
        </div>
        <ul className="max-h-80 overflow-y-auto p-2">
          {items.map((i, n) => (
            <li key={i.label + n}>
              <button onMouseEnter={() => setIdx(n)} onClick={() => choose(i)} className={cx('flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm', n === idx && 'bg-slate-100 dark:bg-slate-800')}>
                <i.icon className={cx('size-4', i.ai ? 'text-violet-500' : 'text-slate-400')} />
                <span className={cx('flex-1', i.ai && 'ai-text font-medium')}>{i.label}</span>
                <span className="text-xs text-slate-400">{i.hint}</span>
              </button>
            </li>
          ))}
          {!items.length && <li className="px-3 py-6 text-center text-sm text-slate-500">No results</li>}
        </ul>
      </div>
    </div>
  )
}

function Notifications() {
  const [open, setOpen] = useState(false)
  const { data, reload } = useApi('/api/notifications')
  const unread = (data || []).filter((n) => !n.read).length
  useEffect(() => {
    const t = setInterval(reload, 15000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const readAll = async () => {
    await api.post('/api/notifications/read-all')
    reload()
  }
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="relative rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Notifications">
        <Bell className="size-5" />
        {unread > 0 && <span className="absolute right-1 top-1 grid size-4 place-items-center rounded-full bg-rose-500 text-[10px] font-bold text-white">{unread}</span>}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="animate-pop absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
              <p className="font-semibold">Notifications</p>
              <button onClick={readAll} className="text-xs font-medium text-brand-600">Mark all read</button>
            </div>
            <ul className="max-h-96 overflow-y-auto">
              {(data || []).slice(0, 12).map((n) => (
                <li key={n.id} className={cx('border-b border-slate-50 px-4 py-3 text-sm last:border-0 dark:border-slate-800', !n.read && 'bg-brand-50/50 dark:bg-brand-500/5')}>
                  <div className="flex justify-between gap-2">
                    <p className="font-medium">{n.title}</p>
                    <span className="shrink-0 text-xs text-slate-400">{ago(n.at)}</span>
                  </div>
                  <p className="text-xs text-slate-500">{n.body}</p>
                </li>
              ))}
              {!data?.length && <li className="px-4 py-8 text-center text-sm text-slate-500">You’re all caught up</li>}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}

function SOSButton() {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState('Medical')
  const [message, setMessage] = useState('')
  const { run, busy } = useAction()
  const send = async () => {
    await run(() => api.post('/api/sos', { type, message }), 'SOS sent. Security and committee have been alerted.')
    setOpen(false)
    setMessage('')
  }
  return (
    <>
      <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-2 text-xs font-bold text-white shadow-md shadow-rose-600/30 hover:bg-rose-700">
        <Siren className="size-4 animate-pulse" /> <span className="hidden sm:inline">SOS</span>
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="🚨 Send emergency alert"
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button variant="danger" loading={busy} onClick={send}>Send SOS now</Button></>}>
        <div className="space-y-4">
          <p className="text-sm text-slate-500">This instantly alerts all on-duty guards and committee members with your unit number.</p>
          <Field label="Emergency type"><Select value={type} onChange={(e) => setType(e.target.value)} options={['Medical', 'Fire', 'Security / Intruder', 'Lift stuck', 'Other']} /></Field>
          <Field label="Message (optional)"><Textarea rows={2} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="e.g. Elderly parent unwell, need wheelchair" /></Field>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            {[['Ambulance', '108'], ['Fire', '101'], ['Police', '112']].map(([l, n]) => (
              <a key={n} href={`tel:${n}`} className="rounded-xl border border-slate-200 p-2 dark:border-slate-700"><p className="font-bold text-rose-600">{n}</p><p className="text-slate-500">{l}</p></a>
            ))}
          </div>
        </div>
      </Modal>
    </>
  )
}

function UserMenu() {
  const { user, logout, login } = useApp()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const switchRole = async (r) => {
    setOpen(false)
    await login(r)
    navigate('/')
  }
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 rounded-xl p-1 pr-2 hover:bg-slate-100 dark:hover:bg-slate-800">
        <Avatar name={user.name} size="sm" />
        <div className="hidden text-left md:block">
          <p className="text-sm font-medium leading-tight">{user.name}</p>
          <p className="text-[11px] capitalize text-slate-500">{user.title}{user.unitId ? ` · ${user.unitId}` : ''}</p>
        </div>
        <ChevronDown className="size-4 text-slate-400" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="animate-pop absolute right-0 z-50 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Switch demo role</p>
            {[['admin', 'Admin / Secretary'], ['resident', 'Resident (B-203)'], ['guard', 'Security Guard']].map(([r, l]) => (
              <button key={r} onClick={() => switchRole(r)} className={cx('w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800', user.role === r && 'font-semibold text-brand-600')}>{l}</button>
            ))}
            <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
            <button onClick={logout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"><LogOut className="size-4" /> Log out</button>
          </div>
        </>
      )}
    </div>
  )
}

export default function Layout() {
  const { theme, setTheme, setAssistantOpen, user } = useApp()
  const [menu, setMenu] = useState(false)
  const [palette, setPalette] = useState(false)
  const [news, setNews] = useState(false)
  const loc = useLocation()

  useEffect(() => {
    const h = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') (e.preventDefault(), setPalette((p) => !p))
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') (e.preventDefault(), setAssistantOpen((p) => !p))
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [setAssistantOpen])
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [loc.pathname])

  return (
    <div className="min-h-full">
      <Sidebar open={menu} onClose={() => setMenu(false)} />
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-slate-200/80 bg-white/80 px-4 py-3 backdrop-blur-xl sm:px-6 dark:border-slate-800 dark:bg-slate-950/70">
          <button className="rounded-xl p-2 hover:bg-slate-100 lg:hidden dark:hover:bg-slate-800" onClick={() => setMenu(true)} aria-label="Open menu"><Menu className="size-5" /></button>
          <button onClick={() => setPalette(true)} className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-400 hover:border-slate-300 sm:max-w-md dark:border-slate-800 dark:bg-slate-900">
            <Search className="size-4" /> <span className="flex-1 truncate text-left">Search or ask AI…</span>
            <kbd className="hidden rounded-md border border-slate-200 bg-white px-1.5 text-xs sm:inline dark:border-slate-700 dark:bg-slate-800">Ctrl K</kbd>
          </button>
          <div className="ml-auto flex shrink-0 items-center gap-1">
            <button onClick={() => setAssistantOpen(true)} className="ai-gradient hidden items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-white shadow-md shadow-purple-500/25 sm:flex"><Sparkles className="size-4" /> Ask AI</button>
            <button onClick={() => setNews(true)} className="hidden rounded-xl p-2 sm:block text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" title="What's new" aria-label="What's new"><Rocket className="size-5" /></button>
            <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="hidden rounded-xl p-2 sm:block text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Toggle theme">{theme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}</button>
            <Notifications />
            {user.role !== 'guard' && <SOSButton />}
            <UserMenu />
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
          <Outlet />
        </main>
      </div>
      <button onClick={() => setAssistantOpen(true)} className="ai-gradient fixed bottom-5 right-5 z-30 grid size-14 place-items-center rounded-full text-white shadow-xl shadow-purple-500/40 transition hover:scale-105 sm:hidden" aria-label="Open AI assistant"><Sparkles className="size-6" /></button>
      <Assistant />
      <CommandPalette open={palette} onClose={() => setPalette(false)} />
      <Modal open={news} onClose={() => setNews(false)} title="🚀 What’s new in SocietyOS 2.0">
        <ul className="space-y-3">
          {WHATS_NEW.map(([t, d]) => (
            <li key={t} className="flex gap-3">
              <div className="ai-gradient mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg text-white"><Sparkles className="size-3.5" /></div>
              <div><p className="text-sm font-semibold">{t}</p><p className="text-sm text-slate-500">{d}</p></div>
            </li>
          ))}
        </ul>
      </Modal>
    </div>
  )
}
