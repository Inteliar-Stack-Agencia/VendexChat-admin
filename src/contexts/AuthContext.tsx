/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { User } from '../types'
import { authApi, billingApi } from '../services/api'
import { Subscription } from '../types'

interface AuthContextType {
  user: User | null
  token: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: { store_name: string; email: string; password: string; slug: string; country: string; city: string }) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
  isSuperadmin: boolean
  subscription: Subscription | null
  refreshSubscription: () => Promise<void>
  selectedStoreId: string | null
  selectStore: (storeId: string) => void
}

const AuthContext = createContext<AuthContextType | null>(null)

const resolveAuthPayload = (response: unknown) => {
  const dataResponse = response as { data?: { token?: string; access_token?: string; user: User } }
  return dataResponse.data ?? (response as { token?: string; access_token?: string; user: User })
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [token, setToken] = useState<string | null>(localStorage.getItem('vendexchat_token'))
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(localStorage.getItem('vendexchat_selected_store'))
  const [loading, setLoading] = useState(true)

  // 1. Restauración inicial de sesión (Una sola vez al montar)
  useEffect(() => {
    let isMounted = true

    async function restoreSession() {
      if (!token) {
        setLoading(false)
        return
      }

      try {
        const res = await authApi.me()
        if (isMounted) {
          setUser(res.user)
        }
      } catch (err) {
        console.error('Session restoration failed:', err)
        if (isMounted) {
          localStorage.removeItem('vendexchat_token')
          localStorage.removeItem('vendexchat_selected_store')
          setToken(null)
          setUser(null)
          setSelectedStoreId(null)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    restoreSession()
    return () => { isMounted = false }
  }, []) // Solo al montar

  const selectStore = useCallback((storeId: string) => {
    localStorage.setItem('vendexchat_selected_store', storeId)
    setSelectedStoreId(storeId)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    // La página ya maneja su propio loading local para el botón
    const response = await authApi.login(email, password)
    const payload = resolveAuthPayload(response)
    const authToken = payload.token ?? payload.access_token

    if (!authToken) {
      throw new Error('Token no recibido')
    }

    // Guardar token y usuario (payload ya trae el perfil completo gracias al refactor de api.ts)
    localStorage.setItem('vendexchat_token', authToken)
    setToken(authToken)
    setUser(payload.user)

    // Limpiar selección previa
    localStorage.removeItem('vendexchat_selected_store')
    setSelectedStoreId(null)
  }, [])

  const register = useCallback(async (data: { store_name: string; email: string; password: string; slug: string; country: string; city: string }) => {
    const response = await authApi.register(data)
    const payload = resolveAuthPayload(response)
    const authToken = payload.token ?? payload.access_token

    if (!authToken) {
      throw new Error('Token no recibido')
    }

    localStorage.setItem('vendexchat_token', authToken)
    setToken(authToken)
    setUser(payload.user)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('vendexchat_token')
    localStorage.removeItem('vendexchat_selected_store')
    setToken(null)
    setUser(null)
    setSubscription(null)
    setSelectedStoreId(null)
  }, [])

  const refreshSubscription = useCallback(async () => {
    if (!user || user.role === 'superadmin') return
    try {
      const sub = await billingApi.getCurrentSubscription()
      setSubscription(sub)
    } catch (err) {
      console.error('Error refreshing subscription:', err)
    }
  }, [user])

  useEffect(() => {
    if (user && user.role !== 'superadmin') {
      refreshSubscription()
    }
  }, [user, refreshSubscription])

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!user,
        isSuperadmin: user?.role === 'superadmin',
        subscription,
        refreshSubscription,
        selectedStoreId,
        selectStore,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// Hook para usar el contexto de autenticación
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider')
  }
  return context
}
