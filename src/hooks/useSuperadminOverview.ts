import { useState, useEffect, useCallback } from 'react'
import { superadminApi } from '../services/api'

interface OverviewData {
    active_stores: number
    new_stores_7d: number
    mrr_estimated: number
    failed_payments: number
    recent_activity: { name: string; created_at: string; is_active: boolean }[]
    pending_actions: number
    [key: string]: unknown
}

export function useSuperadminOverview() {
    const [data, setData] = useState<OverviewData | null>(null)
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
