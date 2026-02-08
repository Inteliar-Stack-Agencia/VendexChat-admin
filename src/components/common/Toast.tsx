/* eslint-disable react-refresh/only-export-components */
import { useEffect, useState, useCallback } from 'react'
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'info'

interface ToastMessage {
  id: number
  type: ToastType
  message: string
}

// Estado global simple para los toasts
let toastListeners: ((toasts: ToastMessage[]) => void)[] = []
let toasts: ToastMessage[] = []
let nextId = 1

// Función global para mostrar toasts desde cualquier parte de la app
export function showToast(type: ToastType, message: string) {
  const toast: ToastMessage = { id: nextId++, type, message }
  toasts = [...toasts, toast]
  toastListeners.forEach((fn) => fn(toasts))

  // Auto-remover después de 4 segundos
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== toast.id)
    toastListeners.forEach((fn) => fn(toasts))
  }, 4000)
}

const icons = {
  success: CheckCircle,
  error: XCircle,
  info: AlertCircle,
}

const colors = {
  success: 'bg-green-50 border-green-400 text-green-800',
  error: 'bg-red-50 border-red-400 text-red-800',
  info: 'bg-blue-50 border-blue-400 text-blue-800',
}

export default function ToastContainer() {
  const [items, setItems] = useState<ToastMessage[]>([])

  useEffect(() => {
    toastListeners.push(setItems)
    return () => {
      toastListeners = toastListeners.filter((fn) => fn !== setItems)
    }
  }, [])

  const remove = useCallback((id: number) => {
    toasts = toasts.filter((t) => t.id !== id)
    toastListeners.forEach((fn) => fn(toasts))
  }, [])

  if (items.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {items.map((toast) => {
        const Icon = icons[toast.type]
        return (
          <div
            key={toast.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg animate-fade-in ${colors[toast.type]}`}
          >
            <Icon className="w-5 h-5 shrink-0" />
            <p className="text-sm flex-1">{toast.message}</p>
            <button onClick={() => remove(toast.id)} className="shrink-0 hover:opacity-70">
              <X className="w-4 h-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
