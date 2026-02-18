import { useState, useEffect } from 'react'
import { CreditCard, Save, Info, AlertCircle } from 'lucide-react'
import { Card, Button, Input, LoadingSpinner } from '../../components/common'
import { showToast } from '../../components/common/Toast'
import { tenantApi } from '../../services/api'
import { Tenant } from '../../types'

export default function PaymentsPage() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [methods, setMethods] = useState({
        cash: true,
        transfer: false,
        mercadopago: false,
        mp_access_token: '',
        transfer_details: ''
    })

    useEffect(() => {
        tenantApi.getMe()
            .then(data => {
                const metadata = (data as any).metadata || {}
                setMethods({
                    cash: metadata.payment_methods?.cash ?? true,
                    transfer: metadata.payment_methods?.transfer ?? false,
                    mercadopago: metadata.payment_methods?.mercadopago ?? false,
                    mp_access_token: metadata.mp_access_token || '',
                    transfer_details: metadata.transfer_details || ''
                })
            })
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    const handleSubmit = async () => {
        setSaving(true)
        try {
            await tenantApi.updateMe({
                metadata: {
                    payment_methods: {
                        cash: methods.cash,
                        transfer: methods.transfer,
                        mercadopago: methods.mercadopago
                    },
                    mp_access_token: methods.mp_access_token,
                    transfer_details: methods.transfer_details
                }
            } as any)
            showToast('success', 'Configuración de pagos actualizada')
        } catch {
            showToast('error', 'Error al guardar la configuración')
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <LoadingSpinner text="Cargando pagos..." />

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Métodos de Pago</h1>
                    <p className="text-sm text-gray-500">Configura cómo tus clientes pueden pagar sus pedidos.</p>
                </div>
                <Button onClick={handleSubmit} loading={saving}>
                    <Save className="w-4 h-4" />
                    Guardar Cambios
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-6">
                    <Card hFull>
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Info className="w-5 h-5 text-blue-500" />
                            Métodos Manuales
                        </h2>
                        <div className="space-y-4">
                            <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                                <input
                                    type="checkbox"
                                    checked={methods.cash}
                                    onChange={e => setMethods(p => ({ ...p, cash: e.target.checked }))}
                                    className="w-4 h-4 text-emerald-600 rounded"
                                />
                                <div>
                                    <p className="text-sm font-medium text-gray-900">Efectivo / Acordar con vendedor</p>
                                    <p className="text-xs text-gray-500">El cliente paga al recibir o retira el pedido.</p>
                                </div>
                            </label>

                            <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                                <input
                                    type="checkbox"
                                    checked={methods.transfer}
                                    onChange={e => setMethods(p => ({ ...p, transfer: e.target.checked }))}
                                    className="w-4 h-4 text-emerald-600 rounded"
                                />
                                <div>
                                    <p className="text-sm font-medium text-gray-900">Transferencia Bancaria</p>
                                    <p className="text-xs text-gray-500">Mostrá tus datos bancarios al finalizar el pedido.</p>
                                </div>
                            </label>

                            {methods.transfer && (
                                <textarea
                                    placeholder="Ingresá CBU, Alias, Banco y Titular..."
                                    value={methods.transfer_details}
                                    onChange={e => setMethods(p => ({ ...p, transfer_details: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-emerald-500"
                                    rows={4}
                                />
                            )}
                        </div>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card hFull>
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <CreditCard className="w-5 h-5 text-blue-500" />
                            Mercado Pago
                        </h2>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={methods.mercadopago}
                                        onChange={e => setMethods(p => ({ ...p, mercadopago: e.target.checked }))}
                                        className="w-4 h-4 text-blue-600 rounded"
                                    />
                                    <span className="text-sm font-medium text-blue-900">Activar Mercado Pago</span>
                                </div>
                                {!methods.mp_access_token && (
                                    <span className="flex items-center gap-1 text-[10px] bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-bold">
                                        <AlertCircle className="w-3 h-3" /> Requiere Token
                                    </span>
                                )}
                            </div>

                            {methods.mercadopago && (
                                <div className="space-y-3">
                                    <Input
                                        label="Access Token (Producción)"
                                        type="password"
                                        value={methods.mp_access_token}
                                        onChange={e => setMethods(p => ({ ...p, mp_access_token: e.target.value }))}
                                        placeholder="APP_USR-..."
                                    />
                                    <p className="text-[11px] text-gray-500">
                                        Podés obtener tu token desde el <a href="https://www.mercadopago.com.ar/developers/panel/credentials" target="_blank" className="text-blue-600 underline">Panel de Desarrolladores</a> de Mercado Pago.
                                    </p>
                                </div>
                            )}

                            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                <h4 className="text-xs font-bold text-gray-700 uppercase mb-2">Instrucciones</h4>
                                <ol className="text-xs text-gray-600 space-y-1 list-decimal pl-4">
                                    <li>Iniciá sesión en Mercado Pago.</li>
                                    <li>Andá a 'Tus integraciones' y creá una aplicación.</li>
                                    <li>Copiá el 'Access Token' de Producción.</li>
                                    <li>Pegalo arriba y guardá los cambios.</li>
                                </ol>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    )
}
