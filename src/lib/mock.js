// Browser-only fake backend (localStorage) so the UI works before the real API exists.
// Mirrors the contract in API.md. Delete this file + VITE_MOCK when the backend is ready.
const CATS = ['Food', 'Travel/Stay', 'Rent', 'Shopping', 'Bills', 'Health', 'Entertainment', 'Other'].map(
  (name, i) => ({ category_id: i + 1, name }),
)
const KEY = 'mo_db'
const load = () =>
  JSON.parse(localStorage.getItem(KEY) || 'null') || {
    id: 1, users: [], expenses: [], budgets: [], groups: [], members: [],
    gexp: [], splits: [], settlements: [], notes: [], invites: [],
  }
const save = (db) => localStorage.setItem(KEY, JSON.stringify(db))
const fail = (message) => { throw new Error(message) }
// Mock only: never keep plain-text passwords, even in a fake db. (Real hashing = bcrypt on your server.)
const sha = async (s) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map((b) => b.toString(16).padStart(2, '0')).join('')
const r2 = (n) => Math.round(n * 100) / 100
const cat = (id) => CATS.find((c) => c.category_id === +id)?.name || '-'

export async function mockRequest(method, fullPath, body = {}) {
  const db = load()
  const [path, qs] = fullPath.split('?')
  const q = Object.fromEntries(new URLSearchParams(qs))
  const me = db.users.find((u) => 'u' + u.user_id === localStorage.getItem('mo_token'))
  const key = `${method} ${path}`
  const m = (re) => key.match(new RegExp('^' + re + '$'))
  const out = (v) => { save(db); return v }
  const note = (user_id, text) =>
    db.notes.unshift({ id: db.id++, user_id, text, read: false, created_at: new Date().toISOString() })
  const pub = ({ password, ...u }) => u

  if (key === 'POST /auth/register') {
    if (db.users.some((u) => u.email === body.email)) fail('This email is already registered.')
    const user = { user_id: db.id++, name: body.name, email: body.email, password: await sha(body.password) }
    db.users.push(user)
    // pending group invites for this email become memberships
    ;(db.invites ||= []).filter((i) => i.email === user.email).forEach((i) => db.members.push({ group_id: i.group_id, user_id: user.user_id, role: 'member' }))
    ;(db.invites || []).filter((i) => i.email === user.email).forEach((i) => db.gexp.filter((e) => e.paid_by_invite === i.invite_id).forEach((e) => { delete e.paid_by_invite; e.paid_by = user.user_id }))
    ;(db.invites || []).filter((i) => i.email === user.email).forEach((i) =>
      db.splits.filter((s) => s.invite_id === i.invite_id).forEach((s) => {
        const ge = db.gexp.find((e) => e.group_expense_id === s.group_expense_id)
        delete s.invite_id; s.user_id = user.user_id
        db.expenses.push({ expense_id: db.id++, user_id: user.user_id, category_id: ge.category_id, amount: s.share_amount, expense_date: ge.expense_date, description: `${ge.description} (${db.groups.find((g) => g.group_id === ge.group_id).name})`, split_id: s.split_id })
      }))
    db.invites = db.invites.filter((i) => i.email !== user.email)
    localStorage.setItem('mo_token', 'u' + user.user_id)
    return out({ token: 'u' + user.user_id, user: pub(user) })
  }
  if (key === 'POST /auth/login') {
    const hash = await sha(body.password)
    const u = db.users.find((x) => x.email === body.email && x.password === hash)
    if (!u) fail('Incorrect email or password.')
    return { token: 'u' + u.user_id, user: pub(u) }
  }
  if (key === 'POST /auth/forgot-password') {
    const u = db.users.find((x) => x.email === body.email)
    if (!u) return { sent: true } // same answer either way: never reveal which emails exist
    db.resets = (db.resets || []).filter((r) => r.user_id !== u.user_id)
    const token = Math.random().toString(36).slice(2) + Date.now().toString(36)
    db.resets.push({ token, user_id: u.user_id, expires: Date.now() + 3600e3 })
    return out({ sent: true, dev_link: `${location.origin}/reset-password?token=${token}` }) // dev_link: mock only, a real API emails this
  }
  if (key === 'POST /auth/reset-password') {
    const r = (db.resets || []).find((x) => x.token === body.token && x.expires > Date.now())
    if (!r) fail('This reset link is invalid or has expired. Please request a new one.')
    db.users.find((u) => u.user_id === r.user_id).password = await sha(body.new_password)
    db.resets = db.resets.filter((x) => x !== r)
    return out(null)
  }
  if (!me) fail('Please log in.')
  const uid = me.user_id
  const name = (id) => db.users.find((u) => u.user_id === id)?.name || '?'
  const isMember = (gid) => db.members.some((x) => x.group_id === gid && x.user_id === uid)

  if (key === 'GET /users/me') return pub(me)
  if (key === 'PUT /users/me') { Object.assign(me, { name: body.name, email: body.email }); return out(pub(me)) }
  if (key === 'PUT /users/me/password') {
    if (me.password !== (await sha(body.current_password))) fail('Current password is wrong.')
    me.password = await sha(body.new_password)
    return out(null)
  }
  if (key === 'GET /categories') return CATS

  // ---- personal expenses
  if (key === 'GET /expenses') {
    return db.expenses
      .filter((e) => e.user_id === uid && (!q.month || e.expense_date.startsWith(q.month)) &&
        (!q.category_id || e.category_id === +q.category_id))
      .sort((a, b) => b.expense_date.localeCompare(a.expense_date) || b.expense_id - a.expense_id)
      .map((e) => ({ ...e, category: cat(e.category_id) }))
  }
  if (key === 'POST /expenses') {
    const e = { expense_id: db.id++, user_id: uid, ...body, amount: +body.amount, category_id: +body.category_id }
    db.expenses.push(e)
    budgetAlert(db, uid, e, note)
    return out(e)
  }
  let x
  if ((x = m('(PUT|DELETE) /expenses/(\\d+)'))) {
    const i = db.expenses.findIndex((e) => e.expense_id === +x[2] && e.user_id === uid)
    if (i < 0) fail('Expense not found.')
    if (db.expenses[i].split_id) fail('Shared-bill shares are changed from the group page.')
    if (x[1] === 'DELETE') db.expenses.splice(i, 1)
    else Object.assign(db.expenses[i], body, { amount: +body.amount, category_id: +body.category_id })
    return out(null)
  }

  // ---- budgets
  if (key === 'GET /budgets') {
    return db.budgets
      .filter((b) => b.user_id === uid && b.month === q.month)
      .map((b) => ({ ...b, category: cat(b.category_id), spent: spent(db, uid, b.category_id, b.month) }))
  }
  if (key === 'POST /budgets') {
    let b = db.budgets.find((x) => x.user_id === uid && x.category_id === +body.category_id && x.month === body.month)
    if (b) b.limit_amount = +body.limit_amount
    else db.budgets.push({ budget_id: db.id++, user_id: uid, category_id: +body.category_id, month: body.month, limit_amount: +body.limit_amount })
    return out(null)
  }

  // ---- notifications
  if (key === 'GET /notifications') return db.notes.filter((n) => n.user_id === uid)
  if (key === 'POST /notifications/read') { db.notes.forEach((n) => n.user_id === uid && (n.read = true)); return out(null) }

  // ---- groups
  if (key === 'GET /groups') {
    return db.groups.filter((g) => isMember(g.group_id)).map((g) => ({
      ...g, member_count: db.members.filter((x) => x.group_id === g.group_id).length,
      role: db.members.find((x) => x.group_id === g.group_id && x.user_id === uid).role,
    }))
  }
  if (key === 'POST /groups') {
    const g = { group_id: db.id++, name: body.name, created_by: uid }
    db.groups.push(g)
    db.members.push({ group_id: g.group_id, user_id: uid, role: 'creator' })
    return out(g)
  }
  if ((x = m('GET /groups/(\\d+)'))) {
    const gid = +x[1]
    if (!isMember(gid)) fail('You are not a member of this group.')
    return {
      group: db.groups.find((g) => g.group_id === gid),
      invites: (db.invites || []).filter((i) => i.group_id === gid),
      members: db.members.filter((y) => y.group_id === gid).map((y) => ({ ...y, name: name(y.user_id), email: db.users.find((u) => u.user_id === y.user_id).email })),
    }
  }
  if ((x = m('POST /groups/(\\d+)/members'))) {
    const gid = +x[1]
    const u = db.users.find((y) => y.email === body.email)
    db.invites ||= []
    if (db.members.filter((y) => y.group_id === gid).length + db.invites.filter((i) => i.group_id === gid).length >= 20) fail('A group can have at most 20 members.')
    if (!u) {
      if (db.invites.some((i) => i.group_id === gid && i.email === body.email)) fail('This email is already invited.')
      db.invites.push({ invite_id: db.id++, group_id: gid, email: body.email })
      return out({ status: 'invited' })
    }
    if (db.members.some((y) => y.group_id === gid && y.user_id === u.user_id)) fail('Already a member.')
    db.members.push({ group_id: gid, user_id: u.user_id, role: 'member' })
    note(u.user_id, `You were added to "${db.groups.find((g) => g.group_id === gid).name}".`)
    return out({ status: 'added' })
  }
  if ((x = m('DELETE /groups/(\\d+)/invites/(\\d+)'))) {
    if (balances(db, +x[1]).find((b) => b.invite_id === +x[2])?.balance) fail('This person has unsettled dues.')
    db.invites = db.invites.filter((i) => i.invite_id !== +x[2])
    return out(null)
  }
  if ((x = m('DELETE /groups/(\\d+)/members/(\\d+)'))) {
    const [gid, target] = [+x[1], +x[2]]
    if (balances(db, gid).find((b) => b.user_id === target)?.balance) fail('This member has unsettled dues.')
    db.members = db.members.filter((y) => !(y.group_id === gid && y.user_id === target))
    return out(null)
  }
  if ((x = m('GET /groups/(\\d+)/expenses'))) {
    const gid = +x[1]
    return db.gexp.filter((e) => e.group_id === gid).sort((a, b) => b.expense_date.localeCompare(a.expense_date)).map((e) => ({
      ...e, category: cat(e.category_id), paid_by_name: e.paid_by_invite ? db.invites.find((i) => i.invite_id === e.paid_by_invite)?.email : name(e.paid_by),
      splits: db.splits.filter((s) => s.group_expense_id === e.group_expense_id).map((s) => ({ ...s, name: s.invite_id ? db.invites.find((i) => i.invite_id === s.invite_id)?.email : name(s.user_id) })),
    }))
  }
  if ((x = m('POST /groups/(\\d+)/expenses'))) {
    const gid = +x[1]
    const amount = +body.amount
    const key = (s) => s.user_id ?? 'i' + s.invite_id
    const ids = body.splits.map(key)
    let shares
    if (body.split_type === 'equal') {
      const each = Math.floor((amount * 100) / ids.length) / 100
      shares = body.splits.map((s) => ({ ...(s.user_id ? { user_id: s.user_id } : { invite_id: s.invite_id }), share_amount: each }))
      const left = r2(amount - each * ids.length)
      const p = shares.find((s) => (body.paid_by_invite ? s.invite_id === +body.paid_by_invite : s.user_id === +body.paid_by)) || shares[0]
      p.share_amount = r2(p.share_amount + left) // BR6: leftover paise go to payer
    } else {
      shares = body.splits.map((s) => ({ ...(s.user_id ? { user_id: s.user_id } : { invite_id: s.invite_id }), share_amount: +s.share_amount }))
      if (r2(shares.reduce((a, s) => a + s.share_amount, 0)) !== r2(amount)) fail('Custom shares must add up to the bill amount.')
    }
    const ge = { group_expense_id: db.id++, group_id: gid, ...(body.paid_by_invite ? { paid_by_invite: +body.paid_by_invite } : { paid_by: +body.paid_by }), category_id: +body.category_id, amount, split_type: body.split_type, description: body.description, expense_date: body.expense_date }
    db.gexp.push(ge)
    const gname = db.groups.find((g) => g.group_id === gid).name
    shares.forEach((s) => {
      const split = { split_id: db.id++, group_expense_id: ge.group_expense_id, ...s }
      db.splits.push(split)
      if (s.invite_id) return // pending: personal expense is created when they register
      const e = { expense_id: db.id++, user_id: s.user_id, category_id: ge.category_id, amount: s.share_amount, expense_date: ge.expense_date, description: `${ge.description} (${gname})`, split_id: split.split_id }
      db.expenses.push(e)
      if (s.user_id !== uid) note(s.user_id, `${me.name} added "${ge.description}" in ${gname}.`)
      budgetAlert(db, s.user_id, e, note)
    })
    return out(ge)
  }
  if ((x = m('(DELETE|PUT) /groups/(\\d+)/expenses/(\\d+)'))) {
    const verb = x[1] === 'PUT' ? 'edit' : 'delete'
    const ge = db.gexp.find((e) => e.group_expense_id === +x[3] && e.group_id === +x[2])
    const g = db.groups.find((y) => y.group_id === +x[2])
    if (!ge || (ge.paid_by !== uid && g.created_by !== uid)) fail(`Only the payer or the group creator can ${verb} a bill.`)
    const before = localStorage.getItem(KEY)
    const sids = db.splits.filter((s) => s.group_expense_id === ge.group_expense_id).map((s) => s.split_id)
    db.expenses = db.expenses.filter((e) => !sids.includes(e.split_id))
    db.splits = db.splits.filter((s) => !sids.includes(s.split_id))
    db.gexp = db.gexp.filter((e) => e !== ge)
    if (verb === 'delete') return out(null)
    // mock only: edit = remove + re-create; restore the old bill if the new one is invalid (a real API updates in place, same id)
    save(db)
    try { return await mockRequest('POST', `/groups/${x[2]}/expenses`, body) } catch (err) { localStorage.setItem(KEY, before); throw err }
  }
  if ((x = m('GET /groups/(\\d+)/balances'))) {
    const bal = balances(db, +x[1]).map((b) => ({ ...b, name: b.invite_id ? db.invites.find((i) => i.invite_id === b.invite_id).email : name(b.user_id), pending: !!b.invite_id }))
    return { balances: bal, plan: plan(bal.filter((b) => !b.pending)).map((p) => ({ ...p, from_name: name(p.from), to_name: name(p.to) })) }
  }
  if ((x = m('GET /groups/(\\d+)/settlements'))) {
    return db.settlements.filter((s) => s.group_id === +x[1]).map((s) => ({ ...s, payer_name: name(s.payer_id), payee_name: name(s.payee_id) }))
  }
  if ((x = m('POST /groups/(\\d+)/settlements'))) {
    const gid = +x[1]
    const [payer, payee, amount] = [+body.payer_id, +body.payee_id, +body.amount]
    if (payer === payee) fail('Payer and payee must be different.')
    const owed = -(balances(db, gid).find((b) => b.user_id === payer)?.balance || 0)
    if (amount > owed) fail(`Amount cannot be more than the amount owed (${owed}).`)
    db.settlements.push({ settlement_id: db.id++, group_id: gid, payer_id: payer, payee_id: payee, amount, settled_on: body.settled_on, mode: body.mode })
    note(payee, `${name(payer)} paid you ₹${amount}.`)
    return out(null)
  }

  // ---- reports (JSON shape: {title, columns, rows})
  if ((x = m('GET /reports/([a-z-]+)'))) return report(db, x[1], q, uid, name)
  fail('Not found: ' + key)
}

const spent = (db, uid, cid, month) =>
  r2(db.expenses.filter((e) => e.user_id === uid && e.category_id === cid && e.expense_date.startsWith(month.slice(0, 7))).reduce((a, e) => a + e.amount, 0))

function budgetAlert(db, uid, e, note) {
  const month = e.expense_date.slice(0, 7)
  const b = db.budgets.find((x) => x.user_id === uid && x.category_id === e.category_id && x.month.startsWith(month))
  if (!b) return
  const after = spent(db, uid, e.category_id, month)
  const pct = (v) => (v / b.limit_amount) * 100
  const before = after - e.amount
  for (const t of [100, 80]) {
    if (pct(after) >= t && pct(before) < t) { note(uid, `${cat(e.category_id)} budget reached ${t}%.`); break }
  }
}

function balances(db, gid) {
  const map = Object.fromEntries(db.members.filter((m) => m.group_id === gid).map((m) => [m.user_id, 0]))
  ;(db.invites || []).filter((i) => i.group_id === gid).forEach((i) => (map['i' + i.invite_id] = 0))
  const add = (id, v) => { if (id in map) map[id] = r2(map[id] + v) }
  const ids = db.gexp.filter((e) => e.group_id === gid).map((e) => e.group_expense_id)
  db.gexp.filter((e) => e.group_id === gid).forEach((e) => add(e.paid_by ?? 'i' + e.paid_by_invite, e.amount))
  db.splits.filter((s) => ids.includes(s.group_expense_id)).forEach((s) => add(s.user_id ?? 'i' + s.invite_id, -s.share_amount))
  db.settlements.filter((s) => s.group_id === gid).forEach((s) => { add(s.payer_id, s.amount); add(s.payee_id, -s.amount) })
  return Object.entries(map).map(([id, balance]) => (id[0] === 'i' ? { invite_id: +id.slice(1), balance } : { user_id: +id, balance }))
}

// Greedy: biggest debtor pays biggest creditor (SRS §8).
function plan(bal) {
  const b = bal.map((x) => ({ ...x }))
  const out = []
  for (;;) {
    b.sort((p, q) => p.balance - q.balance)
    const d = b[0], c = b[b.length - 1]
    if (!d || d.balance >= -0.005 || c.balance <= 0.005) return out
    const amt = r2(Math.min(-d.balance, c.balance))
    out.push({ from: d.user_id, to: c.user_id, amount: amt })
    d.balance = r2(d.balance + amt)
    c.balance = r2(c.balance - amt)
  }
}

function report(db, type, q, uid, name) {
  const inRange = (d) => (!q.from || d >= q.from) && (!q.to || d <= q.to)
  const mine = db.expenses.filter((e) => e.user_id === uid && inRange(e.expense_date))
  const sum = (l) => r2(l.reduce((a, e) => a + e.amount, 0))
  const byCat = () => CATS.map((c) => [c.name, sum(mine.filter((e) => e.category_id === c.category_id))]).filter((r) => r[1] > 0)
  const gid = +q.group_id
  switch (type) {
    case 'monthly':
      return { title: 'Monthly expense report', columns: ['Date', 'Category', 'Note', 'Amount'], rows: mine.map((e) => [e.expense_date, cat(e.category_id), e.description || '', e.amount]), total: sum(mine) }
    case 'category':
      return { title: 'Category-wise report', columns: ['Category', 'Amount'], rows: byCat(), chart: 'pie' }
    case 'budget': {
      const month = (q.from || new Date().toISOString()).slice(0, 7)
      return { title: 'Budget vs actual', columns: ['Category', 'Limit', 'Spent', '% used'], rows: db.budgets.filter((b) => b.user_id === uid && b.month.startsWith(month)).map((b) => { const s = spent(db, uid, b.category_id, month); return [cat(b.category_id), b.limit_amount, s, Math.round((s / b.limit_amount) * 100) + '%'] }) }
    }
    case 'trend': {
      const rows = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i)
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        rows.push([ym, sum(db.expenses.filter((e) => e.user_id === uid && e.expense_date.startsWith(ym)))])
      }
      return { title: 'Month-over-month trend', columns: ['Month', 'Total'], rows, chart: 'bar' }
    }
    case 'group-expenses':
      return { title: 'Group expense report', columns: ['Date', 'Description', 'Paid by', 'Amount'], rows: db.gexp.filter((e) => e.group_id === gid && inRange(e.expense_date)).map((e) => [e.expense_date, e.description, e.paid_by_invite ? db.invites.find((i) => i.invite_id === e.paid_by_invite)?.email : name(e.paid_by), e.amount]) }
    case 'group-balance':
      return { title: 'Group balance report', columns: ['Member', 'Net balance'], rows: balances(db, gid).map((b) => [name(b.user_id), b.balance]) }
    case 'settlements':
      return { title: 'Settlement history', columns: ['Date', 'From', 'To', 'Amount', 'Mode'], rows: db.settlements.filter((s) => s.group_id === gid && inRange(s.settled_on)).map((s) => [s.settled_on, name(s.payer_id), name(s.payee_id), s.amount, s.mode || '']) }
    case 'combined': {
      const dues = db.groups.filter((g) => db.members.some((m) => m.group_id === g.group_id && m.user_id === uid)).map((g) => [g.name, balances(db, g.group_id).find((b) => b.user_id === uid)?.balance || 0])
      return { title: 'Combined statement', columns: ['Item', 'Amount'], rows: [['Total personal spending (incl. group shares)', sum(mine)], ...dues.map(([n, v]) => [`Net balance in ${n}`, v])] }
    }
  }
  fail('Unknown report.')
}
