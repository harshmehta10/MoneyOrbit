import { useEffect } from 'react'
import { Bell } from '@icons'
import { api } from '../lib/api.js'
import { dateLabel } from '../lib/format.js'
import { useLoad, Card, Empty, PageHeader, Status } from '../components/ui.jsx'

export default function Notifications() {
  const { data, loading, error } = useLoad(() => api.get('/notifications'))
  // mark as read once shown (the list keeps its unread styling for this visit)
  useEffect(() => { api.post('/notifications/read').catch(() => {}) }, [])
  return (
    <>
      <PageHeader title="Notifications" />
      <Status loading={loading} error={error}>
        <Card className="!p-0">
          {data?.length ? (
            <ul className="divide-y divide-stone-100">
              {data.map((n) => (
                <li key={n.id} className="flex items-start gap-3 p-3 text-sm sm:p-4">
                  <span className={`grid size-9 shrink-0 place-items-center rounded-full ${n.read ? 'bg-stone-100 text-stone-600' : 'bg-brand-100 text-brand-700'}`}><Bell className="size-4" /></span>
                  <div><p className={n.read ? '' : 'font-semibold'}>{n.text}</p><p className="text-xs text-stone-600">{dateLabel(n.created_at)}</p></div>
                </li>
              ))}
            </ul>
          ) : <Empty text="You are all caught up." />}
        </Card>
      </Status>
    </>
  )
}
