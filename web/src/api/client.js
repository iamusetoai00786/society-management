// API client. Uses the in-browser mock server by default. Set VITE_API_URL to
// point the same calls at a real backend that implements docs/API.md.
import { handle } from './mockServer'

const BASE = import.meta.env.VITE_API_URL
const TOKEN_KEY = 'societyos-token'

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}
export const setToken = (t) => {
  try {
    t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY)
  } catch {
    // ignore
  }
}

async function request(method, url, body) {
  const token = getToken()
  if (!BASE) {
    try {
      return await handle(method, url, { body, token })
    } catch (e) {
      const err = new Error(e.message)
      err.status = e.status || 500
      throw err
    }
  }
  const res = await fetch(BASE + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
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
