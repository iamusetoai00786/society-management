import { useState } from 'react'
import { PartyPopper, Dumbbell, Waves, Trophy, BedDouble, CalendarDays, Users } from 'lucide-react'
import { useApp, useApi, useAction } from '../context/AppContext'
import { api } from '../api/client'
import { Card, CardHeader, Badge, Button, PageHeader, Skeleton, Input, Table, inr, fmtDate, cx } from '../components/ui'

const ICONS = { party: PartyPopper, dumbbell: Dumbbell, waves: Waves, trophy: Trophy, bed: BedDouble }
const GRAD = ['from-indigo-500 to-violet-500', 'from-emerald-500 to-teal-500', 'from-sky-500 to-cyan-500', 'from-amber-500 to-orange-500', 'from-pink-500 to-rose-500']

export default function Amenities() {
  const { user } = useApp()
  const { data: amenities } = useApi('/api/amenities')
  const [sel, setSel] = useState('am_gym')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const { data: slots, loading } = useApi(`/api/amenities/${sel}/availability?date=${date}`)
  const { data: bookings } = useApi('/api/bookings')
  const { run, busy } = useAction()
  const a = amenities?.find((x) => x.id === sel)
  const name = (id) => amenities?.find((x) => x.id === id)?.name || id
  return (
    <>
      <PageHeader title="Amenity Booking" subtitle="Reserve the clubhouse, gym, pool and more. No double bookings." />
      {!amenities ? <Skeleton /> : (
        <div className="scrollbar-thin mb-6 flex gap-3 overflow-x-auto pb-2">
          {amenities.map((x, i) => {
            const I = ICONS[x.icon] || CalendarDays
            return (
              <button key={x.id} onClick={() => setSel(x.id)} className={cx('min-w-44 shrink-0 rounded-2xl border-2 bg-white p-4 text-left transition dark:bg-slate-900', sel === x.id ? 'border-brand-500 shadow-lg shadow-brand-500/10' : 'border-transparent shadow-sm')}>
                <div className={cx('mb-3 grid size-10 place-items-center rounded-xl bg-gradient-to-br text-white', GRAD[i % GRAD.length])}><I className="size-5" /></div>
                <p className="font-semibold">{x.name}</p>
                <p className="text-xs text-slate-500">{x.fee ? inr(x.fee) + ' / slot' : 'Free'} · up to {x.capacity}</p>
              </button>
            )
          })}
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title={a?.name || '…'} subtitle={a?.requiresApproval ? 'Needs committee approval' : 'Instant confirmation'} icon={CalendarDays}
            action={<Input type="date" className="w-auto" value={date} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} />} />
          {loading && !slots ? <Skeleton rows={3} /> : (
            <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
              {(slots || []).map((s) => (
                <div key={s.slot} className={cx('rounded-xl border p-4', s.available ? 'border-slate-200 dark:border-slate-700' : 'border-slate-100 bg-slate-50 opacity-60 dark:border-slate-800 dark:bg-slate-800/40')}>
                  <p className="font-semibold">{s.slot}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><Users className="size-3.5" /> {s.taken}/{s.capacity} booked</p>
                  <Button size="sm" className="mt-3 w-full" disabled={!s.available || user.role === 'admin'} loading={busy}
                    onClick={() => run(() => api.post('/api/bookings', { amenityId: sel, date, slot: s.slot }), (b) => (b.status === 'pending' ? 'Request sent for approval' : 'Booking confirmed 🎉'))}>
                    {s.available ? (a?.fee ? `Book · ${inr(a.fee)}` : 'Book') : 'Full'}
                  </Button>
                </div>
              ))}
            </div>
          )}
          {a?.deposit > 0 && <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500 dark:border-slate-800">Refundable deposit: {inr(a.deposit)}</p>}
        </Card>
        <Card>
          <CardHeader title={user.role === 'admin' ? 'All bookings' : 'My bookings'} icon={CalendarDays} />
          <Table rows={(bookings || []).slice(0, 10)} empty="No bookings" columns={[
            { key: 'a', label: 'Amenity', render: (b) => <div><p className="font-medium">{name(b.amenityId)}</p><p className="text-xs text-slate-500">{fmtDate(b.date, { day: 'numeric', month: 'short' })} · {b.slot}{user.role === 'admin' ? ` · ${b.unitId}` : ''}</p></div> },
            { key: 'status', label: '', render: (b) => user.role === 'admin' && b.status === 'pending'
              ? <Button size="sm" variant="success" onClick={() => run(() => api.patch(`/api/bookings/${b.id}`, { status: 'confirmed' }), 'Booking approved')}>Approve</Button>
              : b.status !== 'cancelled' && user.role === 'resident'
                ? <button className="text-xs text-rose-600" onClick={() => run(() => api.patch(`/api/bookings/${b.id}`, { status: 'cancelled' }), 'Booking cancelled')}>Cancel</button>
                : <Badge>{b.status}</Badge> },
          ]} />
        </Card>
      </div>
    </>
  )
}
