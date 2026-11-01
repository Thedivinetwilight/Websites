import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { AlertTriangle, Check, Info, X } from 'lucide-react'

interface ToastItem {
  id: number
  message: string
  tone: 'success' | 'info' | 'error'
}

const ToastContext = createContext<{ push: (message: string, tone?: 'success' | 'info' | 'error') => void } | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const nextId = useRef(1)

  const remove = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const push = useCallback(
    (message: string, tone: 'success' | 'info' | 'error' = 'success') => {
      const id = nextId.current++
      setItems((prev) => [...prev.slice(-2), { id, message, tone }])
      window.setTimeout(() => remove(id), 3800)
    },
    [remove],
  )

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast toast--${t.tone}`}>
            <span className="toast__icon">
              {t.tone === 'success' ? (
                <Check size={14} strokeWidth={2.6} />
              ) : t.tone === 'error' ? (
                <AlertTriangle size={14} />
              ) : (
                <Info size={14} />
              )}
            </span>
            <span>{t.message}</span>
            <button className="toast__close" onClick={() => remove(t.id)} aria-label="Dismiss">
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx.push
}
