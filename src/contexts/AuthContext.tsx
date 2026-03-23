/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { User } from '../types'
import { authApi, billingApi } from '../services/api'
import { supabase } from '../supabaseClient'
import { resetCoreCache } from '../services/coreApi'
import { withTimeout } from '../utils/timeout'
import { Subscription } from '../types'

// Safety timeout: if auth init takes longer than this, stop loading to unblock the UI
const AUTH_INIT_TIMEOUT = 10000

interface AuthContextType {
  user: User | null
  token: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: { store_name: string; email: string; slug: string; country: string; city: string; phone: string }) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
  isSuperadmin: boolean
  isEmpresa: boolean
  subscription: Subscription | null
  refreshSubscription: () => Promise<void>
  selectedStoreId: string | null
  selectStore: (storeId: string) => void
  storesCount: number
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
  const [storesCount, setStoresCount] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  // 1. Restauración inicial y Sincronización en tiempo real
  useEffect(() => {
    let isMounted = true

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()

        if (session && isMounted) {
          const authToken = session.access_token
          setToken(authToken)
          localStorage.setItem('vendexchat_token', authToken)

          try {
            const res = await withTimeout(authApi.me(), 8000, 'authApi.me')
            if (isMounted) setUser(res.user)
          } catch (meError) {
            console.error('[AuthContext] Profile load failed during init:', meError)
            // Fallback: usar datos mínimos del auth de Supabase
            if (isMounted) {
              setUser({
                ...session.user,
                role: (session.user.user_metadata as Record<string, unknown>)?.role as string || 'client'
              } as unknown as User)
            }
          }
        }
      } catch (err) {
        console.error('[AuthContext] getSession failed:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    initAuth()

    // Safety net: if initAuth hangs (bad network, Supabase down), force loading=false
    const safetyTimeout = setTimeout(() => {
      if (isMounted) {
        console.warn('[AuthContext] Safety timeout reached — forcing loading=false')
        setLoading(false)
      }
    }, AUTH_INIT_TIMEOUT)

    const { data: { subscription: authListener } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[AuthContext] Auth Event:', event, !!session)

      if (event === 'SIGNED_OUT') {
        resetCoreCache()
        if (isMounted) {
          setUser(null)
          setToken(null)
          setSelectedStoreId(null)
          localStorage.removeItem('vendexchat_token')
          localStorage.removeItem('vendexchat_selected_store')
          setLoading(false)
        }
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session && isMounted) {
          setToken(session.access_token)
          localStorage.setItem('vendexchat_token', session.access_token)
          // No forzamos setLoading(true) aquí para evitar parpadeos si ya estamos cargando
        }
      }
    })

    return () => {
      isMounted = false
      clearTimeout(safetyTimeout)
      authListener.unsubscribe()
    }
  }, []) // Solo al montar

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

  const register = useCallback(async (data: { store_name: string; email: string; slug: string; country: string; city: string; phone: string }) => {
    await authApi.register(data)
    // No establecer sesión - el usuario debe verificar su email primero
    // La sesión se creará cuando haga click en el magic link
  }, [])

  const logout = useCallback(() => {
    resetCoreCache()
    supabase.auth.signOut().catch((err) => { console.error('[AuthContext] signOut failed:', err) })
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
      const sub = await withTimeout(billingApi.getCurrentSubscription(), 8000, 'getCurrentSubscription')
      setSubscription(sub)
    } catch (err) {
      console.error('Error refreshing subscription:', err)
    }
  }, [user])

  useEffect(() => {
    if (user && user.role !== 'superadmin') {
      refreshSubscription()

      // También cargar conteo de tiendas para la UI
      withTimeout(authApi.getMyStores(), 8000, 'getMyStores').then(stores => {
        setStoresCount(stores.length)
      }).catch(err => console.error('Error fetching stores count:', err))
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
        isEmpresa: user?.role === 'empresa',
        subscription,
        refreshSubscription,
        selectedStoreId,
        selectStore,
        storesCount,
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
