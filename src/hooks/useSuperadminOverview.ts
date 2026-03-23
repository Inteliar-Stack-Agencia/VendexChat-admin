import { useState, useEffect, useCallback } from 'react'
import { superadminApi } from '../services/api'

export function useSuperadminOverview() {
    const [data, setData] = useState<unknown>(null)
    const [loading, setLoading] = useState(true)

    const loadOverview = useCallback(async () => {
        setLoading(true)
        try {
            const res = await superadminApi.overview()
            setData(res)
        } catch (err) {
            console.error('Error loading overview:', err)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadOverview()
    }, [loadOverview])

    return {
        data,
        loading,
        refresh: loadOverview
    }
}
