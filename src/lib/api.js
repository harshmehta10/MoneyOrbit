import { mockRequest } from './mock.js'

const MOCK = import.meta.env.VITE_MOCK === 'true'
export const getToken = () => localStorage.getItem('mo_token')

async function request(method, path, body) {
  if (MOCK) return mockRequest(method, path, body)
  const res = await fetch('/api' + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() && { Authorization: `Bearer ${getToken()}` }),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (res.status === 401 && getToken()) {
    localStorage.removeItem('mo_token')
    location.href = '/login'
  }
  const data = res.status === 204 ? null : await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.message || 'Something went wrong. Please try again.')
  return data
}

export const api = {
  get: (p) => request('GET', p),
  post: (p, b) => request('POST', p, b),
  put: (p, b) => request('PUT', p, b),
  del: (p) => request('DELETE', p),
}

// PDF / CSV download (reports). Mock mode builds CSV locally; PDF needs the real backend.
export async function download(path, filename) {
  if (MOCK) throw new Error('PDF/CSV export needs the real backend (turn off VITE_MOCK).')
  const res = await fetch('/api' + path, { headers: { Authorization: `Bearer ${getToken()}` } })
  if (!res.ok) throw new Error('Could not download the report.')
  const url = URL.createObjectURL(await res.blob())
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  a.click()
  URL.revokeObjectURL(url)
}
