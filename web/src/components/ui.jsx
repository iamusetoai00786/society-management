import { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext'
import { X, Loader2, Sparkles } from 'lucide-react'

export const cx = (...c) => c.filter(Boolean).join(' ')
export const inr = (n) => '₹' + Math.round(n || 0).toLocaleString('en-IN')
export const fmtDate = (d, opts = { day: 'numeric', month: 'short', year: 'numeric' }) => (d ? new Date(d).toLocaleDateString('en-IN', opts) : '—')
export const fmtTime = (d) => (d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—')
export const ago = (d) => {
  const s = (Date.now() - new Date(d).getTime()) / 1000
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export function Card({ className, children, ...p }) {
  return (
    <div className={cx('min-w-0 rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900', className)} {...p}>
      {children}
    </div>
  )
}

export function CardHeader({ title, subtitle, icon: Icon, action }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="grid size-9 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-100">
            <Icon className="size-4.5" />
          </div>
        )}
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-white">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  )
}

const variants = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm shadow-brand-600/20',
  secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700',
  ghost: 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
  danger: 'bg-rose-600 text-white hover:bg-rose-700',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700',
  ai: 'ai-gradient text-white shadow-md shadow-purple-500/25 hover:opacity-95',
}
export function Button({ variant = 'primary', size = 'md', loading, icon: Icon, className, children, ...p }) {
  return (
    <button
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'px-2.5 py-1.5 text-xs' : size === 'lg' ? 'px-5 py-3 text-sm' : 'px-3.5 py-2 text-sm',
        variants[variant],
        className,
      )}
      disabled={loading || p.disabled}
      {...p}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : Icon && <Icon className="size-4" />}
      {children}
    </button>
  )
}

const tones = {
  gray: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400',
  red: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400',
  amber: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  blue: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400',
  purple: 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300',
}
const statusTone = {
  paid: 'green', approved: 'green', confirmed: 'green', resolved: 'green', closed: 'gray', exited: 'gray', active: 'red', inside: 'blue',
  unpaid: 'amber', pending: 'amber', open: 'amber', assigned: 'blue', in_progress: 'purple', denied: 'red', rejected: 'red', cancelled: 'gray',
  urgent: 'red', high: 'red', medium: 'amber', low: 'gray', owner: 'blue', tenant: 'purple', vacant: 'gray',
}
export function Badge({ tone, children, className }) {
  const t = tone || statusTone[String(children).toLowerCase()] || 'gray'
  return <span className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium capitalize', tones[t], className)}>{String(children).replace('_', ' ')}</span>
}

export function AIBadge({ children = 'AI' }) {
  return (
    <span className="ai-gradient inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
      <Sparkles className="size-3" />
      {children}
    </span>
  )
}

export function Stat({ label, value, sub, icon: Icon, tone = 'brand', trend }) {
  const tc = { brand: 'from-indigo-500 to-violet-500', green: 'from-emerald-500 to-teal-500', amber: 'from-amber-500 to-orange-500', rose: 'from-rose-500 to-pink-500', sky: 'from-sky-500 to-cyan-500' }[tone]
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{value}</p>
          {sub && <p className={cx('mt-1 text-xs', trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-rose-600' : 'text-slate-500')}>{sub}</p>}
        </div>
        {Icon && (
          <div className={cx('grid size-10 place-items-center rounded-xl bg-gradient-to-br text-white shadow-sm', tc)}>
            <Icon className="size-5" />
          </div>
        )}
      </div>
    </Card>
  )
}

export function Modal({ open, onClose, title, children, footer, wide }) {
  useEffect(() => {
    if (!open) return
    const h = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div className={cx('animate-pop max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl dark:bg-slate-900', wide ? 'sm:max-w-2xl' : 'sm:max-w-lg')} onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="font-semibold">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close">
            <X className="size-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4 dark:border-slate-800">{footer}</div>}
      </div>
    </div>
  )
}

const field = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-slate-700 dark:bg-slate-800'
export function Field({ label, hint, children }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>}
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  )
}
export const Input = (p) => <input {...p} className={cx(field, p.className)} />
export const Textarea = (p) => <textarea rows={4} {...p} className={cx(field, p.className)} />
export const Select = ({ options, ...p }) => (
  <select {...p} className={cx(field, p.className)}>
    {options.map((o) => (typeof o === 'string' ? <option key={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>))}
  </select>
)

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800/70">
      {tabs.map((t) => {
        const v = t.value ?? t
        return (
          <button key={v} onClick={() => onChange(v)} className={cx('rounded-lg px-3 py-1.5 text-sm font-medium transition', value === v ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200')}>
            {t.label ?? t}
            {t.count != null && <span className="ml-1.5 rounded-full bg-slate-200 px-1.5 text-xs dark:bg-slate-600">{t.count}</span>}
          </button>
        )
      })}
    </div>
  )
}

// Table with consistent spacing, right-aligned numbers/actions and pagination.
// Column options: { key, label, render?, align?: 'right' | 'center', className?, nowrap? }
// A column keyed 'x' is treated as the actions column (right-aligned, shrinks).
export function Table({ columns, rows, empty = 'Nothing here yet', onRow, pageSize = 15, dense }) {
  const [page, setPage] = useState(0)
  const pages = Math.max(1, Math.ceil(rows.length / pageSize))
  useEffect(() => {
    if (page > pages - 1) setPage(0)
  }, [pages, page])
  const view = rows.slice(page * pageSize, page * pageSize + pageSize)
  const align = (c) => (c.align === 'right' || c.key === 'x' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left')
  const pad = dense ? 'px-4 py-2' : 'px-5 py-3'
  return (
    <div>
      <div className="scrollbar-thin overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/30">
              {columns.map((c) => (
                <th key={c.key} className={cx('whitespace-nowrap font-semibold', pad, align(c), c.key === 'x' && 'w-px')}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-5 py-12 text-center text-slate-500">{empty}</td>
              </tr>
            )}
            {view.map((r, i) => (
              <tr key={r.id || i} onClick={onRow ? () => onRow(r) : undefined} className={cx('transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40', onRow && 'cursor-pointer')}>
                {columns.map((c) => (
                  <td key={c.key} className={cx(pad, align(c), c.nowrap === false ? '' : 'whitespace-nowrap', c.key === 'x' && 'w-px', c.className)}>{c.render ? c.render(r) : r[c.key] ?? '—'}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > pageSize && (
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 text-xs text-slate-500 dark:border-slate-800">
          <span>Showing <strong className="text-slate-700 dark:text-slate-300">{page * pageSize + 1}–{Math.min(rows.length, (page + 1) * pageSize)}</strong> of {rows.length}</span>
          <div className="flex items-center gap-1">
            <button disabled={page === 0} onClick={() => setPage(page - 1)} className="rounded-lg border border-slate-200 px-2.5 py-1 font-medium disabled:opacity-40 dark:border-slate-700">Prev</button>
            <span className="px-2">{page + 1} / {pages}</span>
            <button disabled={page >= pages - 1} onClick={() => setPage(page + 1)} className="rounded-lg border border-slate-200 px-2.5 py-1 font-medium disabled:opacity-40 dark:border-slate-700">Next</button>
          </div>
        </div>
      )}
    </div>
  )
}

// Clickable unit code: opens the Unit 360° panel from anywhere.
export function UnitLink({ id }) {
  const { openUnit, role } = useApp()
  if (!id) return <span className="text-slate-400">—</span>
  if (role === 'guard') return <span className="font-semibold">{id}</span>
  return (
    <button onClick={(e) => (e.stopPropagation(), openUnit(id))} className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-xs font-semibold text-slate-700 transition hover:bg-brand-100 hover:text-brand-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-brand-500/20" title="Open unit profile">
      {id}
    </button>
  )
}

export function Skeleton({ rows = 4 }) {
  return (
    <div className="space-y-3 p-5">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="skeleton h-9" />
      ))}
    </div>
  )
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function Avatar({ name = '?', size = 'md' }) {
  const colors = ['bg-indigo-500', 'bg-violet-500', 'bg-pink-500', 'bg-emerald-500', 'bg-amber-500', 'bg-sky-500', 'bg-rose-500']
  const c = colors[name.charCodeAt(0) % colors.length]
  const initials = name.split(' ').map((x) => x[0]).slice(0, 2).join('')
  return <div className={cx('grid shrink-0 place-items-center rounded-full font-semibold text-white', c, size === 'sm' ? 'size-7 text-[10px]' : size === 'lg' ? 'size-12 text-base' : 'size-9 text-xs')}>{initials}</div>
}

export function Empty({ icon: Icon, title, text, action }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      {Icon && <div className="mb-3 grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800"><Icon className="size-6" /></div>}
      <p className="font-medium">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-slate-500">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
