// API client. Uses the in-browser mock server by default. Set VITE_API_URL to
// point the same calls at a real backend that implements docs/API.md.
// Every call carries the session token and, for the platform owner, the
// society currently being viewed (x-society-id).
import { handle } from './mockServer'

const BASE = import.meta.env.VITE_API_URL
const store = {
  get: (k) => {
    try {
      return localStorage.getItem(k)
    } catch {
      return null
    }
  },
  set: (k, v) => {
    try {
      v ? localStorage.setItem(k, v) : localStorage.removeItem(k)
    } catch {
      // ignore
    }
  },
}
export const getToken = () => store.get('societyos-token')
export const setToken = (t) => store.set('societyos-token', t)
export const getSocietyId = () => store.get('societyos-society')
export const setSocietyId = (id) => store.set('societyos-society', id)

async function request(method, url, body) {
  const token = getToken()
  const societyId = getSocietyId()
  if (!BASE) {
    try {
      return await handle(method, url, { body, token, societyId })
    } catch (e) {
      const err = new Error(e.message)
      err.status = e.status || 500
      throw err
    }
  }
  const res = await fetch(BASE + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(societyId ? { 'x-society-id': societyId } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.message || res.statusText)
    err.status = res.status
    throw err
  }
  return data
}

export const api = {
  get: (u) => request('GET', u),
  post: (u, b) => request('POST', u, b ?? {}),
  put: (u, b) => request('PUT', u, b),
  patch: (u, b) => request('PATCH', u, b),
  del: (u) => request('DELETE', u),
  raw: request,
}
