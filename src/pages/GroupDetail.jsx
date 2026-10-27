import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Plus, UserPlus, Trash, PencilSimple, HandCoins, UserMinus, Envelope, LinkSimple } from '@icons'
import { api } from '../lib/api.js'
import { inr, today, dateLabel } from '../lib/format.js'
import { useAuth } from '../context/Auth.jsx'
import { Avatar, CatIcon } from '../lib/cats.jsx'
import { useToast } from '../components/Toast.jsx'
import CountUp from '../components/CountUp.jsx'
import { useLoad, Button, Card, Input, Select, Modal, PageHeader, Status, Alert, Empty } from '../components/ui.jsx'
import { useCategories } from './Expenses.jsx'

export default function GroupDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const [tab, setTab] = useState('bills')
  const [modal, setModal] = useState(null)
  const [error, setError] = useState('')
  const cats = useCategories()
  const toast = useToast()
  const info = useLoad(() => api.get(`/groups/${id}`), [id])
  const bills = useLoad(() => api.get(`/groups/${id}/expenses`), [id])
  const bal = useLoad(() => api.get(`/groups/${id}/balances`), [id])
  const sets = useLoad(() => api.get(`/groups/${id}/settlements`), [id])

  const refresh = () => { bills.reload(); bal.reload(); sets.reload(); info.reload() }
  const act = async (fn, msg) => { setError(''); try { await fn(); toast(msg); refresh() } catch (e) { setError(e.message) } }

  const members = info.data?.members || []
  const invites = info.data?.invites || []
  const mine = bal.data?.balances.find((b) => b.user_id === user.user_id)?.balance
  const copyInvite = async (email) => {
    const link = `${location.origin}/register?email=${encodeURIComponent(email)}`
    try { await navigator.clipboard.writeText(link); toast('Invite link copied') } catch { prompt('Copy this invite link', link) }
  }
  const isCreator = info.data?.group.created_by === user.user_id
  const tabs = [['bills', 'Bills'], ['balances', 'Balances'], ['settle', 'Settlements'], ['members', 'Members']]

  return (
    <>
      <Link to="/groups" className="mb-3 inline-flex min-h-11 items-center gap-1 text-sm text-stone-600"><ArrowLeft className="size-4" />Groups</Link>
      <Status loading={info.loading} error={info.error}>
        {info.data && (
          <>
            <PageHeader title={info.data.group.name} sub={`${members.length} of 20 members${invites.length ? ` · ${invites.length} invited` : ''}`}>
              <Button onClick={() => setModal({ bill: null })}><Plus className="size-4" />Add bill</Button>
            </PageHeader>
            {mine !== undefined && (
              <div className={`mb-4 rise rounded-2xl p-4 text-white shadow-3d-color ${mine > 0 ? 'bg-sage-600' : mine < 0 ? 'bg-clay-600' : 'bg-stone-700'}`}>
                <p className="text-sm opacity-90">{mine > 0 ? 'You are owed' : mine < 0 ? 'You owe' : 'You are all settled up'}</p>
                {mine !== 0 && <p className="text-3xl font-bold"><CountUp value={Math.abs(mine)} /></p>}
              </div>
            )}
            <div role="tablist" className="mb-4 flex gap-1 overflow-x-auto rounded-lg bg-stone-200/60 p-1">
              {tabs.map(([k, l]) => (
                <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
                  className={`min-h-10 flex-1 whitespace-nowrap rounded-md px-3 text-sm font-medium ${tab === k ? 'bg-white shadow-sm' : 'text-stone-600'}`}>{l}</button>
              ))}
            </div>
            <div className="mb-4"><Alert>{error}</Alert></div>

            {tab === 'bills' && (
              <Status loading={bills.loading} error={bills.error}>
                <Card className="!p-0">
                  {bills.data?.length ? (
                    <ul className="divide-y divide-stone-100">
                      {bills.data.map((b) => (
                        <li key={b.group_expense_id} className="p-3 sm:p-4">
                          <div className="flex items-center gap-3">
                            <CatIcon name={b.category} />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{b.description}</p>
                              <p className="text-xs text-stone-600">{b.paid_by_name} paid · {b.category} · {dateLabel(b.expense_date)} · {b.split_type}</p>
                              <p className="mt-1 text-xs text-stone-600">{b.splits.map((s) => `${s.name} ${inr(s.share_amount)}`).join(' · ')}</p>
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                              <p className="text-sm font-semibold leading-10">{inr(b.amount)}</p>
                              {(b.paid_by === user.user_id || isCreator) ? (<>
                                <button aria-label="Edit bill" onClick={() => setModal({ bill: b })}
                                  className="grid size-10 place-items-center rounded-lg text-stone-600 hover:bg-stone-100"><PencilSimple className="size-4" /></button>
                                <button aria-label="Delete bill" onClick={() => confirm('Delete this bill?') && act(() => api.del(`/groups/${id}/expenses/${b.group_expense_id}`), 'Bill deleted')}
                                  className="grid size-10 place-items-center rounded-lg text-clay-600 hover:bg-clay-50"><Trash className="size-4" /></button></>
                              ) : <span className="w-[5.25rem]" aria-hidden />}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : <Empty text="No bills yet. Add the first one." />}
                </Card>
              </Status>
            )}

            {tab === 'balances' && (
              <Status loading={bal.loading} error={bal.error}>
                <div className="grid gap-4 lg:grid-cols-2">
                  <Card>
                    <h2 className="mb-2 font-semibold">Net balances</h2>
                    <ul className="divide-y divide-stone-100">
                      {bal.data?.balances.map((b) => (
                        <li key={b.user_id ?? 'i' + b.invite_id} className="flex items-center gap-3 py-2 text-sm">
                          <Avatar name={b.name} /><span className="flex-1 truncate">{b.name}{b.pending && <span className="text-xs text-sand-700"> · invited</span>}</span>
                          <span className={`font-medium ${b.balance > 0 ? 'text-sage-700' : b.balance < 0 ? 'text-clay-700' : ''}`}>
                            {b.balance > 0 ? 'gets ' : b.balance < 0 ? 'owes ' : ''}{inr(Math.abs(b.balance))}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                  <Card>
                    <div className="mb-2 flex items-center justify-between">
                      <h2 className="font-semibold">Settlement plan</h2>
                      <Button variant="secondary" onClick={() => setModal({ settle: {} })}><HandCoins className="size-4" />Record</Button>
                    </div>
                    {bal.data?.plan.length ? (
                      <ul className="divide-y divide-stone-100">
                        {bal.data.plan.map((p, i) => (
                          <li key={i} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                            <span className="font-medium">{p.from_name}</span><ArrowRight className="size-4 text-stone-500" /><span className="font-medium">{p.to_name}</span>
                            <span className="ml-auto font-semibold">{inr(p.amount)}</span>
                            <button className="min-h-9 rounded-lg bg-brand-50 px-3 text-xs font-semibold text-brand-700 hover:bg-brand-100" onClick={() => setModal({ settle: p })}>Pay</button>
                          </li>
                        ))}
                      </ul>
                    ) : <Empty text="All settled up." />}
                  </Card>
                </div>
              </Status>
            )}

            {tab === 'settle' && (
              <Status loading={sets.loading} error={sets.error}>
                <Card className="!p-0">
                  {sets.data?.length ? (
                    <ul className="divide-y divide-stone-100">
                      {sets.data.map((s) => (
                        <li key={s.settlement_id} className="flex items-center gap-3 p-3 text-sm sm:p-4">
                          <div className="min-w-0 flex-1"><p className="truncate">{s.payer_name} paid {s.payee_name}</p><p className="text-xs text-stone-600">{dateLabel(s.settled_on)}{s.mode && ` · ${s.mode}`}</p></div>
                          <span className="font-semibold">{inr(s.amount)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : <Empty text="No settlements recorded." />}
                </Card>
              </Status>
            )}

            {tab === 'members' && (
              <Card>
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="font-semibold">Members</h2>
                  <Button variant="secondary" onClick={() => setModal('member')}><UserPlus className="size-4" />Add</Button>
                </div>
                <ul className="divide-y divide-stone-100">
                  {members.map((m) => (
                    <li key={m.user_id} className="flex items-center gap-3 py-2 text-sm">
                      <Avatar name={m.name} className="size-10 text-sm" />
                      <div className="min-w-0 flex-1"><p className="truncate font-medium">{m.name}</p><p className="truncate text-xs text-stone-600">{m.email} · {m.role}</p></div>
                      {isCreator && m.role !== 'creator' && (
                        <button aria-label={`Remove ${m.name}`} onClick={() => confirm(`Remove ${m.name}?`) && act(() => api.del(`/groups/${id}/members/${m.user_id}`), 'Member removed')}
                          className="grid size-10 place-items-center rounded-lg text-clay-600 hover:bg-clay-50"><UserMinus className="size-4" /></button>
                      )}
                    </li>
                  ))}
                  {invites.map((i) => (
                    <li key={i.invite_id} className="flex items-center gap-3 py-2 text-sm">
                      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-stone-200 text-stone-600"><Envelope className="size-4" /></span>
                      <div className="min-w-0 flex-1"><p className="truncate font-medium">{i.email}</p><p className="text-xs text-sand-700">Invited · hasn't joined yet</p></div>
                      <button aria-label={`Copy invite link for ${i.email}`} onClick={() => copyInvite(i.email)} className="grid size-10 place-items-center rounded-lg text-stone-600 hover:bg-stone-100"><LinkSimple className="size-4" /></button>
                      <button aria-label={`Cancel invite for ${i.email}`} onClick={() => confirm(`Cancel the invite for ${i.email}?`) && act(() => api.del(`/groups/${id}/invites/${i.invite_id}`), 'Invite cancelled')} className="grid size-10 place-items-center rounded-lg text-clay-600 hover:bg-clay-50"><UserMinus className="size-4" /></button>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </>
        )}
      </Status>

      {modal?.bill !== undefined && <BillForm bill={modal.bill} gid={id} members={members} invites={invites} cats={cats} me={user.user_id} onClose={() => setModal(null)} onSaved={() => { setModal(null); refresh() }} />}
      {modal === 'member' && <MemberForm gid={id} onClose={() => setModal(null)} onSaved={() => { setModal(null); refresh() }} />}
      {modal?.settle && <SettleForm gid={id} members={members} init={modal.settle} onClose={() => setModal(null)} onSaved={() => { setModal(null); refresh() }} />}
    </>
  )
}

function useForm(onSaved, run) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setError('')
    try { await run(Object.fromEntries(new FormData(e.target))); onSaved() } catch (x) { setError(x.message); setBusy(false) }
  }
  return { error, busy, submit, setError }
}

function MemberForm({ gid, onClose, onSaved }) {
  const toast = useToast()
  const { error, busy, submit } = useForm(onSaved, async (f) => { const r = await api.post(`/groups/${gid}/members`, f); toast(r?.status === 'invited' ? 'Invite saved — they join when they sign up' : 'Member added') })
  return (
    <Modal title="Add member" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Alert>{error}</Alert>
        <Input label="Email" name="email" type="email" required autoFocus hint="Not on MoneyOrbit yet? They are invited and join this group when they register with this email." />
        <Button loading={busy} className="w-full">Add or invite</Button>
      </form>
    </Modal>
  )
}

function SettleForm({ gid, members, init, onClose, onSaved }) {
  const toast = useToast()
  const { error, busy, submit } = useForm(onSaved, async (f) => { await api.post(`/groups/${gid}/settlements`, f); toast('Settlement recorded') })
  return (
    <Modal title="Record settlement" onClose={onClose}>
      <p className="mb-3 text-sm text-stone-600">This only records a payment made outside the app (cash or UPI).</p>
      <form onSubmit={submit} className="space-y-4">
        <Alert>{error}</Alert>
        <Select label="Payer" name="payer_id" required defaultValue={init.from || ''}>
          <option value="" disabled>Choose…</option>{members.map((m) => <option key={m.user_id} value={m.user_id}>{m.name}</option>)}
        </Select>
        <Select label="Payee" name="payee_id" required defaultValue={init.to || ''}>
          <option value="" disabled>Choose…</option>{members.map((m) => <option key={m.user_id} value={m.user_id}>{m.name}</option>)}
        </Select>
        <Input label="Amount (₹)" name="amount" inputMode="decimal" required defaultValue={init.amount} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Date" name="settled_on" type="date" max={today()} required defaultValue={bill?.expense_date || today()} />
          <Select label="Mode" name="mode" defaultValue="UPI"><option>UPI</option><option>Cash</option><option>Bank</option></Select>
        </div>
        <Button loading={busy} className="w-full">Record payment</Button>
      </form>
    </Modal>
  )
}

function BillForm({ bill, gid, members, invites, cats, me, onClose, onSaved }) {
  const toast = useToast()
  const [type, setType] = useState(bill?.split_type || 'equal')
  const splitKey = (s) => s.invite_id ? 'i' + s.invite_id : s.user_id
  // shareable people: members by user_id, pending invitees by invite_id (key 'i<id>')
  const people = [...members.map((m) => ({ key: m.user_id, name: m.name })), ...invites.map((i) => ({ key: 'i' + i.invite_id, name: i.email, pending: true }))]
  const [picked, setPicked] = useState(bill ? bill.splits.map(splitKey) : people.map((p) => p.key))
  const [shares, setShares] = useState(bill ? Object.fromEntries(bill.splits.map((s) => [splitKey(s), s.share_amount])) : {})
  const [amount, setAmount] = useState(bill ? String(bill.amount) : '')
  const { error, busy, submit, setError } = useForm(onSaved, (f) => {
    if (!(+amount > 0)) throw new Error('Amount must be above zero.')
    if (!picked.length) throw new Error('Pick at least one member to share the bill.')
    const splits = picked.map((id) => ({ ...(typeof id === 'string' ? { invite_id: +id.slice(1) } : { user_id: id }), ...(type === 'custom' && { share_amount: +shares[id] || 0 }) }))
    if (type === 'custom' && Math.round(splits.reduce((a, s) => a + s.share_amount, 0) * 100) !== Math.round(+amount * 100))
      throw new Error('Custom shares must add up exactly to the bill amount.')
    const { paid_by, ...rest } = f
    const payer = typeof paid_by === 'string' && paid_by[0] === 'i' ? { paid_by_invite: +paid_by.slice(1) } : { paid_by }
    const data = { ...rest, ...payer, amount: +amount, split_type: type, splits }
    return (bill ? api.put(`/groups/${gid}/expenses/${bill.group_expense_id}`, data) : api.post(`/groups/${gid}/expenses`, data)).then(() => toast(bill ? 'Bill updated' : 'Bill added'))
  })
  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  const sum = picked.reduce((a, id) => a + (+shares[id] || 0), 0)

  return (
    <Modal title={bill ? 'Edit shared bill' : 'Add shared bill'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Alert>{error}</Alert>
        <Input label="Description" name="description" required maxLength={255} placeholder="e.g. Hotel booking" autoFocus defaultValue={bill?.description} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Amount (₹)" inputMode="decimal" required value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Input label="Date" name="expense_date" type="date" max={today()} required defaultValue={today()} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Select label="Paid by" name="paid_by" defaultValue={bill ? (bill.paid_by_invite ? 'i' + bill.paid_by_invite : bill.paid_by) : me}>{people.map((m) => <option key={m.key} value={m.key}>{m.name}{m.pending ? ' (invited)' : ''}</option>)}</Select>
          <Select label="Category" name="category_id" required defaultValue={bill?.category_id ?? ""}><option value="" disabled>Choose…</option>{cats.map((c) => <option key={c.category_id} value={c.category_id}>{c.name}</option>)}</Select>
        </div>
        <div className="flex gap-1 rounded-lg bg-stone-200/60 p-1">
          {['equal', 'custom'].map((t) => (
            <button type="button" key={t} aria-pressed={type === t} onClick={() => { setType(t); setError('') }}
              className={`min-h-10 flex-1 rounded-md text-sm font-medium capitalize ${type === t ? 'bg-white shadow-sm' : 'text-stone-600'}`}>{t} split</button>
          ))}
        </div>
        <fieldset className="space-y-2">
          <legend className="mb-1 text-sm font-medium text-stone-700">Shared between</legend>
          {people.map((m) => (
            <div key={m.key} className="flex items-center gap-3">
              <label className="flex min-h-11 flex-1 items-center gap-2 text-sm">
                <input type="checkbox" className="size-4 accent-brand-600" checked={picked.includes(m.key)} onChange={() => toggle(m.key)} />
                <span className="truncate">{m.name}{m.pending && <span className="text-xs text-sand-700"> · invited</span>}</span>
              </label>
              {type === 'custom' && picked.includes(m.key) && (
                <input aria-label={`Share of ${m.name}`} inputMode="decimal" placeholder="0.00" value={shares[m.key] ?? ''}
                  onChange={(e) => setShares({ ...shares, [m.key]: e.target.value })}
                  className="min-h-11 w-28 rounded-lg border border-stone-300 px-3 text-sm outline-none focus:border-brand-600" />
              )}
            </div>
          ))}
          {type === 'custom' && <p className="text-xs text-stone-600">Shares total {inr(sum)} of {inr(amount)}</p>}
          {type === 'equal' && picked.length > 0 && +amount > 0 && <p className="text-xs text-stone-600">About {inr(amount / picked.length)} each</p>}
        </fieldset>
        <Button loading={busy} className="w-full">{bill ? 'Save changes' : 'Save bill'}</Button>
      </form>
    </Modal>
  )
}
