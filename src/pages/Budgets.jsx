import { useState } from 'react'
import { api } from '../lib/api.js'
import { inr, thisMonth } from '../lib/format.js'
import { useLoad, Button, Card, Input, PageHeader, Status, BudgetBar, Alert, Empty, MonthNav } from '../components/ui.jsx'
import { CatIcon } from '../lib/cats.jsx'
import { useToast } from '../components/Toast.jsx'
import { useCategories } from './Expenses.jsx'

export default function Budgets() {
  const [month, setMonth] = useState(thisMonth())
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const cats = useCategories()
  const toast = useToast()
  const [cid, setCid] = useState('')
  const { data, loading, error: loadErr, reload } = useLoad(() => api.get(`/budgets?month=${month}`), [month])

  const save = async (e) => {
    e.preventDefault()
    const form = e.target
    const f = { ...Object.fromEntries(new FormData(form)), category_id: cid }
    if (!cid) return setError('Pick a category.')
    if (!(+f.limit_amount > 0)) return setError('Limit must be above zero.')
    setBusy(true); setError('')
    try { await api.post('/budgets', { ...f, month }); form.reset(); setCid(''); toast('Budget saved'); reload() } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  return (
    <>
      <PageHeader title="Budgets" sub="One limit per category per month. Warnings at 80% and 100%."><MonthNav month={month} onChange={setMonth} /></PageHeader>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="h-fit lg:order-2">
          <h2 className="mb-3 font-semibold">Set a budget</h2>
          <form onSubmit={save} className="space-y-4">
            <Alert>{error}</Alert>
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-stone-700">Category</legend>
              <div className="grid grid-cols-4 gap-2">
                {cats.map((c) => (
                  <button type="button" key={c.category_id} aria-pressed={cid === String(c.category_id)} onClick={() => setCid(String(c.category_id))}
                    className={`flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-xl p-1 text-[10px] font-medium ring-1 min-w-0 ${cid === String(c.category_id) ? 'bg-brand-50 text-brand-700 ring-2 ring-brand-600' : 'bg-white text-stone-600 ring-stone-200'}`}>
                    <CatIcon name={c.name} className="size-8" /><span className="w-full truncate text-center">{c.name}</span>
                  </button>
                ))}
              </div>
            </fieldset>
            <Input label="Monthly limit (₹)" name="limit_amount" inputMode="decimal" required />
            <Button loading={busy} className="w-full">Save budget</Button>
          </form>
        </Card>
        <div className="space-y-3 lg:col-span-2">
          <Status loading={loading} error={loadErr}>
            {data?.length ? data.map((b, n) => (
              <div key={b.budget_id} className="rise" style={{ '--i': n }}><Card>
                <div className="mb-3 flex items-center gap-3">
                  <CatIcon name={b.category} />
                  <div className="flex-1"><p className="text-sm font-semibold">{b.category}</p><p className="text-xs text-stone-600">{inr(Math.max(b.limit_amount - b.spent, 0))} left</p></div>
                  <span className="text-sm text-stone-600">{inr(b.spent)} / {inr(b.limit_amount)}</span>
                </div>
                <BudgetBar spent={b.spent} limit={b.limit_amount} />
              </Card></div>
            )) : <Card><Empty text="No budgets for this month. Pick a category and set a limit." /></Card>}
          </Status>
        </div>
      </div>
    </>
  )
}
