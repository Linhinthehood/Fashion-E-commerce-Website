import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

type ToastType = 'success' | 'error' | 'info'

type ToastOptions = {
  duration?: number
}

type Toast = {
  id: number
  message: string
  type: ToastType
  duration: number
}

type ToastContextValue = {
  show: (message: string, type?: ToastType, options?: ToastOptions) => void
  success: (message: string, options?: ToastOptions) => void
  error: (message: string, options?: ToastOptions) => void
  info: (message: string, options?: ToastOptions) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

const DEFAULT_DURATION = 3500

const toastTypeStyles: Record<ToastType, string> = {
  success: 'bg-green-600 text-white',
  error: 'bg-red-600 text-white',
  info: 'bg-slate-900 text-white'
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const show = useCallback((message: string, type: ToastType = 'info', options?: ToastOptions) => {
    const duration = options?.duration ?? DEFAULT_DURATION
    const id = Date.now() + Math.floor(Math.random() * 1_000)

    setToasts(prev => [...prev, { id, message, type, duration }])

    window.setTimeout(() => {
      removeToast(id)
    }, duration)
  }, [removeToast])

  const contextValue = useMemo<ToastContextValue>(() => ({
    show,
    success: (message, options) => show(message, 'success', options),
    error: (message, options) => show(message, 'error', options),
    info: (message, options) => show(message, 'info', options)
  }), [show])

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {createPortal(
        <div className="pointer-events-none fixed inset-0 z-[9999] flex flex-col items-end gap-3 px-4 py-6 sm:px-6">
          {toasts.map(toast => (
            <div
              key={toast.id}
              className={`pointer-events-auto w-full max-w-xs overflow-hidden rounded-lg shadow-lg transition-all duration-300 ${toastTypeStyles[toast.type]}`}
            >
              <div className="p-4 text-sm font-medium">
                {toast.message}
              </div>
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

