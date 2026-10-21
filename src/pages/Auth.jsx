import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Planet, Wallet, UsersThree, Scales, EnvelopeSimple } from '@icons'
import { api } from '../lib/api.js'
import { useAuth } from '../context/Auth.jsx'
import { Alert, Button, Input, PasswordInput } from '../components/ui.jsx'

function Shell({ title, sub, children, foot }) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-2">
      <div className="hidden bg-brand-600 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-2 text-xl font-bold"><Planet className="size-7" />MoneyOrbit</div>
        <div>
          <h2 className="max-w-md text-4xl font-bold leading-tight">Your money and your group bills, in one place.</h2>
          <ul className="mt-8 space-y-4 text-brand-100">
            {[[Wallet, 'Track personal expenses and monthly budgets'], [UsersThree, 'Split bills equally or by custom amounts'], [Scales, 'See who owes whom, settle with few payments']].map(([I, t]) => (
              <li key={t} className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-white/15"><I className="size-5" /></span>{t}</li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-brand-100">Group shares flow into your personal budget automatically.</p>
      </div>
      <div className="grid place-items-center p-4 sm:p-8">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex items-center gap-2 text-xl font-bold lg:hidden"><span className="grid size-9 place-items-center rounded-xl bg-brand-600 text-white"><Planet className="size-5" /></span>MoneyOrbit</div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="mb-6 mt-1 text-sm text-stone-600">{sub}</p>
          {children}
          <p className="mt-6 text-center text-sm text-stone-600">{foot}</p>
        </div>
      </div>
    </div>
  )
}

function useSubmit(path, check) {
  const { login } = useAuth()
  const nav = useNavigate()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    const f = Object.fromEntries(new FormData(e.target))
    const bad = check?.(f)
    if (bad) return setError(bad)
    setBusy(true); setError('')
    try { login(await api.post(path, f)); nav('/') } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  return { submit, error, busy }
}

export function Login() {
  const { submit, error, busy } = useSubmit('/auth/login')
  return (
    <Shell title="Welcome back" sub="Log in to see your spending and group balances." foot={<>New here? <Link className="font-medium text-brand-700" to="/register">Create an account</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        <Alert>{error}</Alert>
        <Input label="Email" name="email" type="email" required autoComplete="email" />
        <PasswordInput label="Password" name="password" required autoComplete="current-password" />
        <div className="-mt-1 text-right"><Link to="/forgot-password" className="inline-flex min-h-9 items-center text-sm font-semibold text-brand-700">Forgot password?</Link></div>
        <Button loading={busy} className="w-full">Log in</Button>
      </form>
    </Shell>
  )
}

// BR1: at least 8 characters with a letter and a number.
const checkPw = (f) => !/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(f.password) && 'Password needs at least 8 characters with a letter and a number.'

export function Register() {
  const { submit, error, busy } = useSubmit('/auth/register', checkPw)
  return (
    <Shell title="Create your account" sub="Takes under a minute. No bank details needed." foot={<>Already registered? <Link className="font-medium text-brand-700" to="/login">Log in</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        <Alert>{error}</Alert>
        <Input label="Full name" name="name" required maxLength={100} autoComplete="name" />
        <Input label="Email" name="email" type="email" required maxLength={150} autoComplete="email" defaultValue={new URLSearchParams(location.search).get('email') || ''} />
        <PasswordInput label="Password" name="password" required autoComplete="new-password" hint="At least 8 characters, with a letter and a number." />
        <Button loading={busy} className="w-full">Register</Button>
      </form>
    </Shell>
  )
}

export function ForgotPassword() {
  const [state, setState] = useState({ busy: false, error: '', done: null })
  const submit = async (e) => {
    e.preventDefault()
    setState({ busy: true, error: '', done: null })
    try {
      const email = new FormData(e.target).get('email')
      setState({ busy: false, error: '', done: { ...(await api.post('/auth/forgot-password', { email })), email } })
    } catch (err) { setState({ busy: false, error: err.message, done: null }) }
  }
  const { busy, error, done } = state
  return (
    <Shell title="Reset your password" sub="Enter your email and we will send you a reset link." foot={<Link className="font-medium text-brand-700" to="/login">Back to log in</Link>}>
      {done ? (
        <div className="space-y-4" role="status">
          <div className="flex items-start gap-3 rounded-xl bg-sage-100 p-4 text-sm text-sage-900">
            <EnvelopeSimple className="mt-0.5 size-5 shrink-0" />
            <p>If <b>{done.email}</b> has a MoneyOrbit account, a reset link is on its way. It works for 1 hour.</p>
          </div>
          {/* Mock mode only: no email exists, so show the link. A real API never returns dev_link. */}
          {done.dev_link && <p className="rounded-xl border border-dashed border-sand-400 p-3 text-xs text-stone-600">Demo mode (no email is sent): <a className="break-all font-semibold text-brand-700 underline" href={done.dev_link}>open the reset link</a></p>}
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Alert>{error}</Alert>
          <Input label="Email" name="email" type="email" required autoComplete="email" autoFocus />
          <Button loading={busy} className="w-full">Send reset link</Button>
        </form>
      )}
    </Shell>
  )
}

export function ResetPassword() {
  const token = useSearchParams()[0].get('token')
  const nav = useNavigate()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [ok, setOk] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    const { new_password } = Object.fromEntries(new FormData(e.target))
    const bad = checkPw({ password: new_password })
    if (bad) return setError(bad)
    setBusy(true); setError('')
    try { await api.post('/auth/reset-password', { token, new_password }); setOk(true); setTimeout(() => nav('/login'), 2000) }
    catch (err) { setError(err.message); setBusy(false) }
  }
  return (
    <Shell title="Choose a new password" sub="Pick something you have not used here before." foot={<Link className="font-medium text-brand-700" to="/login">Back to log in</Link>}>
      {!token ? <Alert>This reset link is incomplete. Request a new one from the log in page.</Alert>
        : ok ? <p role="status" className="rounded-xl bg-sage-100 p-4 text-sm text-sage-900">Password changed. Taking you to log in…</p>
        : (
          <form onSubmit={submit} className="space-y-4">
            <Alert>{error}</Alert>
            <PasswordInput label="New password" name="new_password" required autoComplete="new-password" autoFocus hint="At least 8 characters, with a letter and a number." />
            <Button loading={busy} className="w-full">Change password</Button>
          </form>
        )}
    </Shell>
  )
}
