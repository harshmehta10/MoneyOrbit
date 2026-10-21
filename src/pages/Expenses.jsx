import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, PencilSimple, Trash, UsersThree } from '@icons'
import { api } from '../lib/api.js'
import { inr, today, thisMonth, dateLabel } from '../lib/format.js'
import { CatIcon } from '../lib/cats.jsx'
import { useToast } from '../components/Toast.jsx'
import { useLoad, Button, Card, Input, Modal, PageHeader, Status, Alert, Empty, MonthNav } from '../components/ui.jsx'

export function useCategories() {
  return useLoad(() => api.get('/categories')).data || []
}

export default function Expenses() {
  const [params, setParams] = useSearchParams()
  const [month, setMonth] = useState(thisMonth())
  const [cat, setCat] = useState('')
  const [editing, setEditing] = useState(params.get('add') ? {} : null)
  const [error, setError] = useState('')
  const toast = useToast()
  const cats = useCategories()
  const { data, loading, error: loadErr, reload } = useLoad(() => api.get(`/expenses?month=${month}${cat ? `&category_id=${cat}` : ''}`), [month, cat])

  const close = () => { setEditing(null); setParams({}) }
  const remove = async (e) => {
    if (!confirm('Delete this expense?')) return
    try { await api.del(`/expenses/${e.expense_id}`); toast('Expense deleted'); reload() } catch (err) { setError(err.message) }
  }
  // group by date
  const days = Object.entries((data || []).reduce((m, e) => ({ ...m, [e.expense_date]: [...(m[e.expense_date] || []), e] }), {}))

  return (
    <>
      <PageHeader title="Expenses" sub={data && `${data.length} ${data.length === 1 ? 'entry' : 'entries'} · ${inr(data.reduce((a, e) => a + e.amount, 0))}`}>
        <MonthNav month={month} onChange={setMonth} />
        <Button onClick={() => setEditing({})} className="hidden sm:inline-flex"><Plus className="size-4" />Add expense</Button>
      </PageHeader>
      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" role="group" aria-label="Filter by category">
        {[{ category_id: '', name: 'All' }, ...cats].map((c) => (
          <button key={c.category_id} onClick={() => setCat(String(c.category_id))} aria-pressed={cat === String(c.category_id)}
            className={`min-h-10 shrink-0 rounded-full px-4 text-sm font-medium ${cat === String(c.category_id) ? 'bg-stone-900 text-white' : 'bg-white text-stone-700 ring-1 ring-stone-200 hover:bg-stone-50'}`}>{c.name}</button>
        ))}
      </div>
      <div className="mb-3"><Alert>{error}</Alert></div>
      <Status loading={loading} error={loadErr}>
        {days.length ? (
          <div className="space-y-4">
            {days.map(([day, list], n) => (
              <section key={day} className="rise" style={{ '--i': Math.min(n, 6) }}>
                <h2 className="mb-2 flex justify-between px-1 text-xs font-semibold uppercase tracking-wide text-stone-600"><span>{dateLabel(day)}</span><span>{inr(list.reduce((a, e) => a + e.amount, 0))}</span></h2>
                <Card className="!p-0">
                  <ul className="divide-y divide-stone-100">
                    {list.map((e) => (
                      <li key={e.expense_id} className="flex items-center gap-3 p-3 sm:p-4">
                        <CatIcon name={e.category} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{e.description || e.category}</p>
                          <p className="flex items-center gap-1 text-xs text-stone-600">{e.split_id && <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-brand-700"><UsersThree className="size-3" />Group share</span>}{e.category}</p>
                        </div>
                        <p className="text-sm font-semibold">{inr(e.amount)}</p>
                        {!e.split_id && (
                          <div className="flex">
                            <button aria-label="Edit" onClick={() => setEditing(e)} className="grid size-10 place-items-center rounded-lg text-stone-600 hover:bg-stone-100"><PencilSimple className="size-4" /></button>
                            <button aria-label="Delete" onClick={() => remove(e)} className="grid size-10 place-items-center rounded-lg text-clay-600 hover:bg-clay-50"><Trash className="size-4" /></button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </Card>
              </section>
            ))}
          </div>
        ) : <Card><Empty text={cat ? 'No expenses in this category.' : 'No expenses this month.'}><Button onClick={() => setEditing({})}><Plus className="size-4" />Add expense</Button></Empty></Card>}
      </Status>
      {editing && <ExpenseForm item={editing} cats={cats} onClose={close} onSaved={(m) => { toast(m); close(); reload() }} />}
    </>
  )
}

function ExpenseForm({ item, cats, onClose, onSaved }) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [cid, setCid] = useState(String(item.category_id || ''))
  const submit = async (ev) => {
    ev.preventDefault()
    const f = { ...Object.fromEntries(new FormData(ev.target)), category_id: cid }
    if (!/^\d+(\.\d{1,2})?$/.test(f.amount) || +f.amount <= 0) return setError('Amount must be above zero with at most two decimals.')
    if (!cid) return setError('Pick a category.')
    setBusy(true); setError('')
    try {
      await (item.expense_id ? api.put(`/expenses/${item.expense_id}`, f) : api.post('/expenses', f))
      onSaved(item.expense_id ? 'Expense updated' : 'Expense added')
    } catch (e) { setError(e.message); setBusy(false) }
  }
  return (
    <Modal title={item.expense_id ? 'Edit expense' : 'Add expense'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        <Alert>{error}</Alert>
        <label className="block text-center">
          <span className="text-sm font-medium text-stone-600">Amount</span>
          <div className="mt-1 flex items-center justify-center gap-1 text-4xl font-bold">
            <span className="text-stone-600">₹</span>
            <input name="amount" inputMode="decimal" required autoFocus placeholder="0" defaultValue={item.amount} aria-label="Amount in rupees"
              className="min-w-[1.5ch] max-w-[9ch] bg-transparent text-left outline-none [field-sizing:content] placeholder:text-stone-500" />
          </div>
        </label>
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-stone-700">Category</legend>
          <div className="grid grid-cols-4 gap-2">
            {cats.map((c) => (
              <button type="button" key={c.category_id} aria-pressed={cid === String(c.category_id)} onClick={() => setCid(String(c.category_id))}
                className={`flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-xl p-2 text-xs font-medium ring-1 ${cid === String(c.category_id) ? 'bg-brand-50 text-brand-700 ring-2 ring-brand-600' : 'bg-white text-stone-600 ring-stone-200 hover:bg-stone-50'}`}>
                <CatIcon name={c.name} className="size-8" />{c.name}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Date" name="expense_date" type="date" max={today()} required defaultValue={item.expense_date || today()} />
          <Input label="Note (optional)" name="description" maxLength={255} defaultValue={item.description} />
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" type="button" onClick={onClose} className="flex-1">Cancel</Button>
          <Button loading={busy} className="flex-1">Save</Button>
        </div>
      </form>
    </Modal>
  )
}
