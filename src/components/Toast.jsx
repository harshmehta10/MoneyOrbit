import { createContext, useCallback, useContext, useState } from 'react'
import { CheckCircle, WarningCircle } from '@icons'

const Ctx = createContext(() => {})
export const useToast = () => useContext(Ctx)

export function ToastProvider({ children }) {
  const [list, setList] = useState([])
  const toast = useCallback((text, error) => {
    const id = Math.random()
    setList((l) => [...l, { id, text, error }])
    setTimeout(() => setList((l) => l.filter((t) => t.id !== id)), 3500)
  }, [])
  return (
    <Ctx.Provider value={toast}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6">
        {list.map((t) => (
          <div key={t.id} className="toast-in pointer-events-auto flex items-center gap-2 rounded-xl bg-stone-900 px-4 py-3 text-sm text-white shadow-lg">
            {t.error ? <WarningCircle className="size-4 text-clay-400" /> : <CheckCircle className="size-4 text-sage-400" />}{t.text}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}
