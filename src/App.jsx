import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/Auth.jsx'
import Layout from './components/Layout.jsx'
import { Status } from './components/ui.jsx'
import { Login, Register, ForgotPassword, ResetPassword } from './pages/Auth.jsx'

const Dashboard = lazy(() => import('./pages/Dashboard.jsx'))
const Expenses = lazy(() => import('./pages/Expenses.jsx'))
const Budgets = lazy(() => import('./pages/Budgets.jsx'))
const Groups = lazy(() => import('./pages/Groups.jsx'))
const GroupDetail = lazy(() => import('./pages/GroupDetail.jsx'))
const Reports = lazy(() => import('./pages/Reports.jsx'))
const Profile = lazy(() => import('./pages/Profile.jsx'))
const Notifications = lazy(() => import('./pages/Notifications.jsx'))

export default function App() {
  const { user, ready } = useAuth()
  if (!ready) return <Status loading />
  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }
  return (
    <Suspense fallback={<Status loading />}>
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="budgets" element={<Budgets />} />
        <Route path="groups" element={<Groups />} />
        <Route path="groups/:id" element={<GroupDetail />} />
        <Route path="reports" element={<Reports />} />
        <Route path="profile" element={<Profile />} />
        <Route path="notifications" element={<Notifications />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  )
}
