import { useState } from 'react'
import { SignOut } from '@icons'
import { api } from '../lib/api.js'
import { useAuth } from '../context/Auth.jsx'
import { Alert, Button, Card, Input, PasswordInput, PageHeader } from '../components/ui.jsx'

function useAction(run, ok) {
  const [msg, setMsg] = useState({})
  const [busy, setBusy] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    const form = e.target
    setBusy(true); setMsg({})
    try { await run(Object.fromEntries(new FormData(form))); form.reset?.(); setMsg({ ok }) } catch (x) { setMsg({ err: x.message }) } finally { setBusy(false) }
  }
  return [{ ...msg, busy }, submit]
}

export default function Profile() {
  const { user, setUser, logout } = useAuth()
  const [pm, saveProfile] = useAction(async (f) => setUser(await api.put('/users/me', f)), 'Profile updated.')
  const [wm, savePw] = useAction(async (f) => {
    if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(f.new_password)) throw new Error('Password needs at least 8 characters with a letter and a number.')
    await api.put('/users/me/password', f)
  }, 'Password changed.')

  return (
    <>
      <PageHeader title="Profile" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-semibold">Your details</h2>
          <form onSubmit={saveProfile} className="space-y-4">
            <Alert>{pm.err}</Alert>{pm.ok && <p role="status" className="text-sm text-sage-700">{pm.ok}</p>}
            <Input label="Name" name="name" required defaultValue={user.name} />
            <Input label="Email" name="email" type="email" required defaultValue={user.email} />
            <Button loading={pm.busy} className="w-full sm:w-auto">Save changes</Button>
          </form>
        </Card>
        <Card>
          <h2 className="mb-3 font-semibold">Change password</h2>
          <form onSubmit={savePw} className="space-y-4">
            <Alert>{wm.err}</Alert>{wm.ok && <p role="status" className="text-sm text-sage-700">{wm.ok}</p>}
            <PasswordInput label="Current password" name="current_password" required autoComplete="current-password" />
            <PasswordInput label="New password" name="new_password" required autoComplete="new-password" />
            <Button loading={wm.busy} className="w-full sm:w-auto">Update password</Button>
          </form>
        </Card>
      </div>
      <Button variant="secondary" onClick={logout} className="mt-4 lg:hidden"><SignOut className="size-4" />Log out</Button>
    </>
  )
}
