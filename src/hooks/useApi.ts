// ========================================
// Hook para manejar llamadas API con estado de carga y errores
// ========================================
import { useState, useCallback } from 'react'

interface UseApiState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

export function useApi<T>() {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  })

  // Ejecutar una función API y manejar los estados automáticamente
  const execute = useCallback(async (apiCall: () => Promise<T>): Promise<T | null> => {
    setState({ data: null, loading: true, error: null })
    try {
      const result = await apiCall()
      setState({ data: result, loading: false, error: null })
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      setState({ data: null, loading: false, error: message })
      return null
    }
  }, [])

  return { ...state, execute }
}
