import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, CaretRight } from '@icons'
import { Avatar } from '../lib/cats.jsx'
import { useToast } from '../components/Toast.jsx'
import { api } from '../lib/api.js'
import { useLoad, Button, Card, Input, Modal, PageHeader, Status, Alert, Empty } from '../components/ui.jsx'

export default function Groups() {
  const { data, loading, error, reload } = useLoad(() => api.get('/groups'))
  const [open, setOpen] = useState(false)
  const [err, setErr] = useState('')
  const toast = useToast()

  const create = async (e) => {
    e.preventDefault()
    try { await api.post('/groups', { name: new FormData(e.target).get('name') }); setOpen(false); toast('Group created'); reload() } catch (x) { setErr(x.message) }
  }

  return (
    <>
      <PageHeader title="Groups" sub="Share bills with friends, flatmates and family.">
        <Button onClick={() => { setErr(''); setOpen(true) }}><Plus className="size-4" />New group</Button>
      </PageHeader>
      <Status loading={loading} error={error}>
        {data?.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {data.map((g, n) => (
              <Link key={g.group_id} to={`/groups/${g.group_id}`} className="rise" style={{ '--i': n }}>
                <Card className="flex items-center gap-3 hover:border-brand-300">
                  <Avatar name={g.name} className="size-11 text-sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{g.name}</p>
                    <p className="text-xs text-stone-600">{g.member_count} {g.member_count === 1 ? 'member' : 'members'}{g.role === 'creator' && ' · You created this'}</p>
                  </div>
                  <CaretRight className="size-5 text-stone-500" />
                </Card>
              </Link>
            ))}
          </div>
        ) : <Card><Empty text="Split a trip or flat bills: create a group, add friends, add bills."><Button onClick={() => setOpen(true)}><Plus className="size-4" />Create a group</Button></Empty></Card>}
      </Status>
      {open && (
        <Modal title="New group" onClose={() => setOpen(false)}>
          <form onSubmit={create} className="space-y-4">
            <Alert>{err}</Alert>
            <Input label="Group name" name="name" required maxLength={100} placeholder="e.g. Goa Trip" autoFocus />
            <Button className="w-full">Create group</Button>
          </form>
        </Modal>
      )}
    </>
  )
}
