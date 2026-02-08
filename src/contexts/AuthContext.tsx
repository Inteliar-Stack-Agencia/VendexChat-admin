/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { User } from '../types'
import { authApi } from '../services/api'

interface AuthContextType {
  user: User | null
  token: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: { store_name: string; email: string; password: string; slug: string }) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
  isSuperadmin: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(localStorage.getItem('vendexchat_token'))
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
          setToken(null)
          setUser(null)
        })
        .finally(() => setLoading(false))
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false)
    }
  }, [token])

  const login = useCallback(async (email: string, password: string) => {
    const response = await authApi.login(email, password)
    localStorage.setItem('vendexchat_token', response.token)
    setToken(response.token)
    setUser(response.user)
  }, [])

  const register = useCallback(async (data: { store_name: string; email: string; password: string; slug: string }) => {
    const response = await authApi.register(data)
    localStorage.setItem('vendexchat_token', response.token)
    setToken(response.token)
    setUser(response.user)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('vendexchat_token')
    setToken(null)
    setUser(null)
  }, [])

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
