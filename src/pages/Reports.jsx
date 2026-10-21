import { lazy, Suspense } from 'react'
import { useState } from 'react'
import { DownloadSimple, FileText } from '@icons'
import { api, download } from '../lib/api.js'
import { inr, today, thisMonth } from '../lib/format.js'
import { useLoad, Button, Card, Input, Select, PageHeader, Alert, Empty } from '../components/ui.jsx'
const ChartView = lazy(() => import('../components/Chart.jsx'))
const chartFallback = <div className="h-64 animate-pulse rounded-2xl bg-stone-100" />

// formats per SRS §3.9
const TYPES = {
  monthly: ['Monthly expense report', ['screen', 'pdf', 'csv']],
  category: ['Category-wise report', ['screen', 'pdf']],
  budget: ['Budget vs actual', ['screen', 'pdf']],
  trend: ['Month-over-month trend', ['screen']],
  'group-expenses': ['Group expense report', ['screen', 'pdf', 'csv'], true],
  'group-balance': ['Group balance report', ['screen', 'pdf'], true],
  settlements: ['Settlement history', ['screen', 'csv'], true],
  combined: ['Combined statement', ['pdf']],
}
const isMoney = (col) => /amount|total|limit|spent|balance/i.test(col)

export default function Reports() {
  const [type, setType] = useState('monthly')
  const [from, setFrom] = useState(thisMonth() + '-01')
  const [to, setTo] = useState(today())
  const [group, setGroup] = useState('')
  const [run, setRun] = useState(null)
  const [error, setError] = useState('')
  const groups = useLoad(() => api.get('/groups')).data || []
  const [, formats, needsGroup] = TYPES[type]
  const qs = `from=${from}&to=${to}${needsGroup ? `&group_id=${group}` : ''}`
  const screenOk = formats.includes('screen')

  const rep = useLoad(() => (run ? api.get(`/reports/${run.type}?${run.qs}`) : Promise.resolve(null)), [run])

  const view = (e) => {
    e.preventDefault(); setError('')
    if (needsGroup && !group) return setError('Choose a group.')
    if (from > to) return setError('The start date must be before the end date.')
    setRun({ type, qs, n: Date.now() })
  }
  const dl = async (fmt) => {
    setError('')
    try { await download(`/reports/${type}?${qs}&format=${fmt}`, `${type}.${fmt}`) } catch (e) { setError(e.message) }
  }
  const d = rep.data

  return (
    <>
      <PageHeader title="Reports" sub="View on screen or export as PDF / CSV." />
      <Card className="mb-4">
        <form onSubmit={view} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select label="Report" value={type} onChange={(e) => setType(e.target.value)}>
            {Object.entries(TYPES).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}
          </Select>
          {needsGroup && (
            <Select label="Group" value={group} onChange={(e) => setGroup(e.target.value)}>
              <option value="">Choose…</option>{groups.map((g) => <option key={g.group_id} value={g.group_id}>{g.name}</option>)}
            </Select>
          )}
          <Input label="From" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} required />
          <Input label="To" type="date" value={to} max={today()} onChange={(e) => setTo(e.target.value)} required />
          <div className="flex flex-wrap items-end gap-2 sm:col-span-2 lg:col-span-4">
            {screenOk && <Button><FileText className="size-4" />View</Button>}
            {formats.filter((f) => f !== 'screen').map((f) => (
              <Button key={f} type="button" variant="secondary" onClick={() => dl(f)}><DownloadSimple className="size-4" />{f.toUpperCase()}</Button>
            ))}
          </div>
        </form>
      </Card>
      <div className="mb-4"><Alert>{error || rep.error}</Alert></div>
      {d && (
        <Card>
          <h2 className="mb-3 font-semibold">{d.title}</h2>
          {d.chart && d.rows.length > 0 && <div className="mb-4"><ChartView type={d.chart} labels={d.rows.map((r) => r[0])} values={d.rows.map((r) => r[1])} /></div>}
          {d.rows.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-max text-left text-sm">
                <thead><tr className="border-b border-stone-200 text-stone-600">{d.columns.map((c) => <th key={c} className={`py-2 pr-4 font-medium ${isMoney(c) ? 'text-right' : ''}`}>{c}</th>)}</tr></thead>
                <tbody>
                  {d.rows.map((r, i) => (
                    <tr key={i} className="border-b border-stone-100 last:border-0">
                      {r.map((v, j) => <td key={j} className={`py-2 pr-4 ${isMoney(d.columns[j]) ? 'text-right' : ''}`}>{isMoney(d.columns[j]) && typeof v === 'number' ? inr(v) : v}</td>)}
                    </tr>
                  ))}
                </tbody>
                {d.total != null && <tfoot><tr><td colSpan={d.columns.length - 1} className="pt-3 font-semibold">Total</td><td className="pt-3 text-right font-semibold">{inr(d.total)}</td></tr></tfoot>}
              </table>
            </div>
          ) : <Empty text="No data for this range." />}
        </Card>
      )}
    </>
  )
}
