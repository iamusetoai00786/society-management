import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api, getToken, setToken } from '../api/client'
import { CheckCircle2, XCircle, Info } from 'lucide-react'

const Ctx = createContext(null)
export const useApp = () => useContext(Ctx)

const readTheme = () => {
  try {
    return localStorage.getItem('societyos-theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  } catch {
    return 'light'
  }
}

export function AppProvider({ children }) {
  const [user, setUser] = useState(null)
  const [booting, setBooting] = useState(true)
  const [theme, setTheme] = useState(readTheme)
  const [toasts, setToasts] = useState([])
  const [version, setVersion] = useState(0)
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [assistantSeed, setAssistantSeed] = useState('')

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    try {
      localStorage.setItem('societyos-theme', theme)
    } catch {
      // ignore
    }
  }, [theme])

  useEffect(() => {
    if (!getToken()) return setBooting(false)
    api.get('/api/auth/me').then(setUser).catch(() => setToken(null)).finally(() => setBooting(false))
  }, [])

  const toast = useCallback((message, type = 'success') => {
    const id = Math.random()
    setToasts((t) => [...t, { id, message, type }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500)
  }, [])

  const login = async (role) => {
    const { token, user } = await api.post('/api/auth/login', { role })
    setToken(token)
    setUser(user)
  }
  const logout = async () => {
    await api.post('/api/auth/logout').catch(() => {})
    setToken(null)
    setUser(null)
  }
  const refresh = useCallback(() => setVersion((v) => v + 1), [])
  const askAssistant = (text = '') => {
    setAssistantSeed(text)
    setAssistantOpen(true)
  }

  return (
    <Ctx.Provider value={{ user, booting, login, logout, theme, setTheme, toast, version, refresh, assistantOpen, setAssistantOpen, assistantSeed, setAssistantSeed, askAssistant }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} className="animate-pop pointer-events-auto flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-lg dark:border-slate-700 dark:bg-slate-900">
            {t.type === 'error' ? <XCircle className="size-4 text-rose-500" /> : t.type === 'info' ? <Info className="size-4 text-brand-500" /> : <CheckCircle2 className="size-4 text-emerald-500" />}
            {t.message}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}

// Fetch helper: re-runs when url or the global refresh version changes.
export function useApi(url, deps = []) {
  const { version, toast } = useApp()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (!url) return
    let live = true
    setLoading(true)
    api
      .get(url)
      .then((d) => live && setData(d))
      .catch((e) => live && toast(e.message, 'error'))
      .finally(() => live && setLoading(false))
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, version, tick, ...deps])
  return { data, loading, reload: () => setTick((t) => t + 1), setData }
}

// Wraps a mutating call with toast feedback + global refresh.
export function useAction() {
  const { toast, refresh } = useApp()
  const [busy, setBusy] = useState(false)
  const run = async (fn, success) => {
    setBusy(true)
    try {
      const r = await fn()
      if (success) toast(typeof success === 'function' ? success(r) : success)
      refresh()
      return r
    } catch (e) {
      toast(e.message, 'error')
      throw e
    } finally {
      setBusy(false)
    }
  }
  return { run, busy }
}
