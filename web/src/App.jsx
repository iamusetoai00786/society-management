import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useApp } from './context/AppContext'
import Layout, { NAV } from './components/Layout'
import Login from './pages/Login'

const pages = {
  '/': lazy(() => import('./pages/Dashboard')),
  '/insights': lazy(() => import('./pages/Insights')),
  '/residents': lazy(() => import('./pages/Residents')),
  '/billing': lazy(() => import('./pages/Billing')),
  '/accounting': lazy(() => import('./pages/Accounting')),
  '/visitors': lazy(() => import('./pages/Visitors')),
  '/helpdesk': lazy(() => import('./pages/Helpdesk')),
  '/notices': lazy(() => import('./pages/Notices')),
  '/polls': lazy(() => import('./pages/Polls')),
  '/amenities': lazy(() => import('./pages/Amenities')),
  '/documents': lazy(() => import('./pages/Documents')),
  '/staff': lazy(() => import('./pages/Staff')),
  '/parking': lazy(() => import('./pages/Parking')),
  '/sos': lazy(() => import('./pages/Sos')),
  '/api-explorer': lazy(() => import('./pages/ApiExplorer')),
  '/settings': lazy(() => import('./pages/Settings')),
}

const Spinner = () => (
  <div className="grid h-64 place-items-center text-slate-400"><Loader2 className="size-6 animate-spin" /></div>
)

export default function App() {
  const { user, booting } = useApp()
  if (booting) return <div className="grid h-screen place-items-center"><Spinner /></div>
  if (!user) return <Login />
  const allowed = NAV.flatMap((s) => s.items).filter((i) => i.roles.includes(user.role))
  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        <Route element={<Layout />}>
          {allowed.map((i) => {
            const Page = pages[i.to]
            return <Route key={i.to} path={i.to} element={<Suspense fallback={<Spinner />}><Page /></Suspense>} />
          })}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
