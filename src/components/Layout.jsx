import { NavLink, Outlet, Link, useLocation } from 'react-router-dom'
import { SquaresFour, Receipt, PiggyBank, UsersThree, FileText, Bell, User, SignOut, Planet, Plus } from '@icons'
import { useAuth } from '../context/Auth.jsx'
import { useLoad } from './ui.jsx'
import { api } from '../lib/api.js'
import { Avatar } from '../lib/cats.jsx'

const nav = [
  { to: '/', label: 'Dashboard', icon: SquaresFour },
  { to: '/expenses', label: 'Expenses', icon: Receipt },
  { to: '/budgets', label: 'Budgets', icon: PiggyBank },
  { to: '/groups', label: 'Groups', icon: UsersThree },
  { to: '/reports', label: 'Reports', icon: FileText },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const { pathname } = useLocation()
  const { data: notes } = useLoad(() => api.get('/notifications'))
  const unread = notes?.filter((n) => !n.read).length || 0

  const link = ({ isActive }) =>
    `flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold ${isActive ? 'bg-brand-600 text-white shadow-sm' : 'text-stone-600 hover:bg-stone-100'}`

  return (
    <div className="min-h-dvh lg:flex">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-stone-200 bg-white p-4 lg:flex">
        <Link to="/" className="mb-6 flex items-center gap-2 px-2 text-lg font-bold"><span className="grid size-9 place-items-center rounded-xl bg-brand-600 text-white"><Planet className="size-5" /></span>MoneyOrbit</Link>
        <nav className="flex flex-1 flex-col gap-1">
          {nav.map(({ to, label, icon: I }) => <NavLink key={to} to={to} end={to === '/'} className={link}><I className="size-5" />{label}</NavLink>)}
        </nav>
        <NavLink to="/profile" className={link}><Avatar name={user.name} className="size-7 text-[10px]" /><span className="truncate">{user.name}</span></NavLink>
        <button onClick={logout} className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-stone-600 hover:bg-stone-100"><SignOut className="size-5" />Log out</button>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-page/90 px-4 backdrop-blur">
          <Link to="/" className="flex items-center gap-2 font-bold lg:invisible"><span className="grid size-8 place-items-center rounded-lg bg-brand-600 text-white"><Planet className="size-4" /></span>MoneyOrbit</Link>
          <div className="flex items-center gap-1">
            <Link to="/notifications" aria-label={`Notifications, ${unread} unread`} className="relative grid size-11 place-items-center rounded-lg hover:bg-stone-100">
              <Bell className="size-5" />
              {unread > 0 && <span className="absolute right-1.5 top-1.5 grid min-w-4 place-items-center rounded-full bg-clay-600 px-1 text-[10px] font-semibold text-white">{unread}</span>}
            </Link>
            <Link to="/profile" aria-label="Profile" className="grid size-11 place-items-center rounded-lg hover:bg-stone-100 lg:hidden"><User className="size-5" /></Link>
          </div>
        </header>
        <main key={pathname} className="page mx-auto w-full max-w-5xl p-4 pb-24 sm:p-6 lg:pb-8"><Outlet /></main>
        {(pathname === '/' || pathname === '/expenses') && (
          <Link to="/expenses?add=1" aria-label="Add expense" className="fixed bottom-20 right-4 z-30 grid size-14 place-items-center rounded-full bg-brand-600 text-white shadow-lg lg:hidden"><Plus className="size-6" /></Link>
        )}
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-stone-200 bg-white lg:hidden">
        {nav.map(({ to, label, icon: I }) => (
          <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${isActive ? 'text-brand-700' : 'text-stone-600'}`}>
            <span className={`grid h-7 w-12 place-items-center rounded-full ${false ? '' : ''}`}><I className="size-5" /></span>{label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
