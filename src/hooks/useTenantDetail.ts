import { useState, useEffect, useCallback } from 'react'
import { superadminApi } from '../services/api'
import type { Tenant, PaymentGateway, TenantMetadata, GatewayConfig } from '../types'
import { showToast } from '../components/common/Toast'

export function useTenantDetail(id: string | undefined) {
    const [tenant, setTenant] = useState<Tenant | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState<Record<string, boolean>>({})
    const [tenantGateways, setTenantGateways] = useState<PaymentGateway[]>([])

    const loadTenant = useCallback(async () => {
        if (!id) return
        setLoading(true)
        try {
            const t = await superadminApi.getTenant(id)
            setTenant(t)
            const gateways = await superadminApi.listTenantGateways(t.id)
            setTenantGateways(gateways)
        } catch (err) {
            console.error('Error loading tenant:', err)
            showToast('error', 'Error al cargar los detalles de la tienda.')
        } finally {
            setLoading(false)
        }
    }, [id])

    useEffect(() => {
        loadTenant()
    }, [loadTenant])

    const setSavingState = (key: string, value: boolean) => {
        setSaving(prev => ({ ...prev, [key]: value }))
    }

    const updateTenant = async (data: Partial<Tenant>) => {
        if (!tenant || !id) return false
        setSavingState('general', true)
        try {
            await superadminApi.updateTenant(id, data)
            setTenant({ ...tenant, ...data })
            showToast('success', 'Tienda actualizada correctamente.')
            return true
        } catch (err: unknown) {
            showToast('error', `Error al actualizar: ${err instanceof Error ? err.message : 'Error desconocido'}`)
            return false
        } finally {
            setSavingState('general', false)
        }
    }

    const updateMetadata = async (metadata: Partial<TenantMetadata>) => {
        if (!tenant || !id) return false
        setSavingState('metadata', true)
        try {
            const updatedMetadata = { ...(tenant.metadata || {}), ...metadata }
            await superadminApi.updateTenant(id, { metadata: updatedMetadata })
            setTenant({ ...tenant, metadata: updatedMetadata })
            showToast('success', 'Configuración actualizada.')
            return true
        } catch (err: unknown) {
            showToast('error', `Error: ${err instanceof Error ? err.message : 'Error desconocido'}`)
            return false
        } finally {
            setSavingState('metadata', false)
        }
    }

    const changePlan = async (targetPlan: string) => {
        if (!tenant || !id) return false
        setSavingState('plan', true)
        try {
            const updatedMetadata = { ...(tenant.metadata || {}), plan_type: targetPlan }
            await superadminApi.updateTenant(id, { metadata: updatedMetadata })
            await superadminApi.updateSubscription(id, {
                plan_type: targetPlan as 'free' | 'pro' | 'vip' | 'ultra',
                status: 'active',
                current_period_end: new Date(new Date().setFullYear(new Date().getFullYear() + 10)).toISOString(),
                billing_cycle: 'annual'
            })
            setTenant({ ...tenant, metadata: updatedMetadata })
            showToast('success', `Plan cambiado a ${targetPlan.toUpperCase()}`)
            return true
        } catch (err: unknown) {
            showToast('error', `Error al cambiar plan: ${err instanceof Error ? err.message : 'Error desconocido'}`)
            return false
        } finally {
            setSavingState('plan', false)
        }
    }

    const connectGateway = async (provider: string, config: GatewayConfig) => {
        if (!tenant) return false
        setSavingState('gateway', true)
        try {
            const result = await superadminApi.connectTenantGateway(tenant.id, provider, config)
            setTenantGateways(prev => [...prev.filter(g => g.provider !== provider), result])
            showToast('success', `Pasarela ${provider} conectada.`)
            return true
        } catch {
            showToast('error', 'Error al vincular pasarela.')
            return false
        } finally {
            setSavingState('gateway', false)
        }
    }

    const disconnectGateway = async (gatewayId: string | number) => {
        try {
            await superadminApi.disconnectTenantGateway(String(gatewayId))
            setTenantGateways(prev => prev.filter(g => g.id !== gatewayId))
            showToast('success', 'Pasarela desconectada.')
            return true
        } catch {
            showToast('error', 'Error al desconectar.')
            return false
        }
    }

    const impersonate = async () => {
        if (!tenant) return
        try {
            showToast('success', `Iniciando sesión como ${tenant.name}...`)
            await superadminApi.impersonate(tenant.id)
        } catch {
            showToast('error', 'Error al suplantar identidad.')
        }
    }

    const deleteTenant = async () => {
        if (!id) return false
        try {
            await superadminApi.deleteTenant(id)
            showToast('success', 'Tienda eliminada.')
            window.location.href = '/sa/tenants'
            return true
        } catch (err: unknown) {
            showToast('error', `Error al eliminar: ${err instanceof Error ? err.message : 'Error desconocido'}`)
            return false
        }
    }

    return {
        tenant,
        loading,
        saving,
        tenantGateways,
        updateTenant,
        updateMetadata,
        changePlan,
        connectGateway,
        disconnectGateway,
        impersonate,
        deleteTenant,
        refresh: loadTenant
    }
}
