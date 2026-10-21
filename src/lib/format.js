export const inr = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(n) || 0)
const pad = (n) => String(n).padStart(2, '0')
// local-time helpers: toISOString() is UTC and shifts dates in timezones like IST
export const ym = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
export const addMonths = (m, n) => { const [y, mo] = m.split('-').map(Number); return ym(new Date(y, mo - 1 + n, 1)) }
export const today = () => { const d = new Date(); return `${ym(d)}-${pad(d.getDate())}` }
export const thisMonth = () => today().slice(0, 7)
export const monthLabel = (ym) =>
  new Date(ym + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
export const dateLabel = (d) =>
  new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
