/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { User } from '../types'
import { authApi, billingApi } from '../services/api'
import { supabase } from '../supabaseClient'
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

  // 1. Restauración inicial y Sincronización en tiempo real
  useEffect(() => {
    let isMounted = true

    // Sincronizar con el estado interno de Supabase
    const { data: { subscription: authListener } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[AuthContext] Auth Event:', event, !!session)

      if (session?.user && session?.access_token) {
        if (isMounted) {
          setToken(session.access_token)
          localStorage.setItem('vendexchat_token', session.access_token)
        }

        // Cargar perfil completo si el usuario cambió o no existe
        if (!user || user.id !== session.user.id) {
          try {
            const res = await authApi.me()
            if (isMounted) setUser(res.user)
          } catch (err) {
            console.error('[AuthContext] Error loading user info:', err)
          }
        }
      } else if (event === 'SIGNED_OUT') {
        if (isMounted) {
          setUser(null)
          setToken(null)
          setSelectedStoreId(null)
          localStorage.removeItem('vendexchat_token')
          localStorage.removeItem('vendexchat_selected_store')
        }
      }

      if (isMounted) setLoading(false)
    })

    return () => {
      isMounted = false
      authListener.unsubscribe()
    }
  }, [user]) // Re-correr si el user cambia para asegurar consistencia

  const selectStore = useCallback((storeId: string) => {
    console.log('[AuthContext] Selecting store:', storeId)
    localStorage.removeItem('vendexchat_impersonated_store') // Limpiar suplantación al seleccionar manual
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
    supabase.auth.signOut().catch(() => { })
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
