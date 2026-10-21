import { createContext, useContext, useEffect, useState } from 'react'
import { api, getToken } from '../lib/api.js'

const Ctx = createContext(null)
export const useAuth = () => useContext(Ctx)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(!getToken())

  useEffect(() => {
    if (!getToken()) return
    api.get('/users/me').then(setUser).catch(() => localStorage.removeItem('mo_token')).finally(() => setReady(true))
  }, [])

  const login = ({ token, user }) => { localStorage.setItem('mo_token', token); setUser(user) }
  const logout = () => { localStorage.removeItem('mo_token'); setUser(null) }
  return <Ctx.Provider value={{ user, setUser, login, logout, ready }}>{children}</Ctx.Provider>
}
