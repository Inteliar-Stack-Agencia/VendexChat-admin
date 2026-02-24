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
  register: (data: { store_name: string; email: string; password: string; slug: string }) => Promise<void>
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

  // Al cargar la app, verificar si el token guardado es válido
  useEffect(() => {
    if (token) {
      authApi
        .me()
        .then((res) => {
          setUser(res.user)
        })
        .catch(() => {
          console.log('Token inválido, cerrando sesión')
          localStorage.removeItem('vendexchat_token')
          localStorage.removeItem('vendexchat_selected_store')
          setToken(null)
          setUser(null)
          setSelectedStoreId(null)
        })
        .finally(() => setLoading(false))
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false)
    }
  }, [token])

  const selectStore = useCallback((storeId: string) => {
    localStorage.setItem('vendexchat_selected_store', storeId)
    setSelectedStoreId(storeId)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const response = await authApi.login(email, password)
    const payload = resolveAuthPayload(response)
    const authToken = payload.token ?? payload.access_token
    if (!authToken) {
      throw new Error('Token no recibido')
    }
    localStorage.setItem('vendexchat_token', authToken)
    setToken(authToken)
    setUser(payload.user)

    // Al loguear, limpiamos la selección previa para forzar el selector si es necesario
    localStorage.removeItem('vendexchat_selected_store')
    setSelectedStoreId(null)
  }, [])

  const register = useCallback(async (data: { store_name: string; email: string; password: string; slug: string }) => {
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
