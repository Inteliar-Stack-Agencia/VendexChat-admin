import { useState, useEffect, useCallback } from 'react'
import { superadminApi } from '../services/api'
import { Tenant } from '../types'
import { toast } from 'sonner'

export function useTenants() {
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [tenants, setTenants] = useState<Tenant[]>([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    const loadTenants = useCallback(async () => {
        setLoading(true)
        try {
            const res = await superadminApi.listTenants({ q: searchTerm, status: statusFilter })
            setTenants(res.data)
            setTotal(res.total)
        } catch (err: any) {
            console.error('Error loading tenants:', err)
            toast.error('Error al cargar tiendas')
        } finally {
            setLoading(false)
        }
    }, [searchTerm, statusFilter])

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            loadTenants()
        }, 500)

        return () => clearTimeout(delayDebounceFn)
    }, [loadTenants])

    const createTenant = async (data: any) => {
        setSaving(true)
        try {
            await superadminApi.createTenant({
                ...data,
                slug: data.slug.toLowerCase().replace(/\s+/g, '-'),
                is_active: true
            })
            toast.success('Tienda creada exitosamente')
            loadTenants()
            return true
        } catch (err: any) {
            console.error('Error creating tenant:', err)
            toast.error('Error al crear la tienda', {
                description: err.message || 'El slug podría estar duplicado.'
            })
            return false
        } finally {
            setSaving(false)
        }
    }

    const deleteTenant = async (id: string | number) => {
        try {
            await superadminApi.deleteTenant(id)
            toast.success('Tienda eliminada permanentemente')
            loadTenants()
            return true
        } catch (err: any) {
            console.error('Error deleting tenant:', err)
            toast.error('Error al eliminar la tienda')
            return false
        }
    }

    return {
        tenants,
        total,
        loading,
        saving,
        searchTerm,
        setSearchTerm,
        statusFilter,
        setStatusFilter,
        loadTenants,
        createTenant,
        deleteTenant
    }
}
