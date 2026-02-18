import { useState, useEffect, FormEvent } from 'react'
import { Card, Button, Input, LoadingSpinner } from '../../components/common'
import { showToast } from '../../components/common/Toast'
import { tenantApi, authApi } from '../../services/api'
import { Tenant } from '../../types'
import { CreditCard, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import FeatureGuard from '../../components/FeatureGuard'

export default function SettingsPage() {
  const { subscription } = useAuth()
  const currentPlan = subscription?.plan_type || 'free'
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('general')

  // Form para info general
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [logoUrl, setLogoUrl] = useState('')

  // Form para contacto
  const [whatsapp, setWhatsapp] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [instagram, setInstagram] = useState('')
  const [facebook, setFacebook] = useState('')

  // Form para pedidos
  const [acceptOrders, setAcceptOrders] = useState(true)
  const [minOrder, setMinOrder] = useState('0')
  const [deliveryCost, setDeliveryCost] = useState('0')

  // Form para personalización
  const [primaryColor, setPrimaryColor] = useState('#10b981')
  const [welcomeMessage, setWelcomeMessage] = useState('')
  const [footerMessage, setFooterMessage] = useState('')

  // Form para cambiar contraseña
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  // Pagos
  const [gateways, setGateways] = useState<any[]>([])
  const [loadingGateways, setLoadingGateways] = useState(false)
  const [newGateway, setNewGateway] = useState({ provider: 'mercadopago', public_key: '', secret_key: '' })

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await tenantApi.getMe()
        setTenant(data)
        setName(data.name || '')
        setDescription(data.description || '')
        setLogoUrl(data.logo_url || '')
        setWhatsapp(data.whatsapp || '')
        setEmail(data.email || '')
        setAddress(data.address || '')
        setInstagram(data.instagram || '')
        setFacebook(data.facebook || '')
        setAcceptOrders(data.accept_orders ?? true)
        setMinOrder(String(data.min_order || 0))
        setDeliveryCost(String(data.delivery_cost || 0))
        setPrimaryColor(data.primary_color || '#10b981')
        setWelcomeMessage(data.welcome_message || '')
        setFooterMessage(data.footer_message || '')

        const gws = await tenantApi.listGateways()
        setGateways(gws)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const handleSaveGeneral = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    if (!tenant?.id) {
      showToast('error', 'No se encontró el ID de la tienda')
      setSaving(false)
      return
    }
    try {
      await tenantApi.updateMe({ name, description, logo_url: logoUrl })
      showToast('success', 'Información actualizada')
    } catch {
      showToast('error', 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveContact = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await tenantApi.updateMe({ whatsapp, email, address, instagram, facebook })
      showToast('success', 'Contacto actualizado')
    } catch {
      showToast('error', 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveOrders = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await tenantApi.updateMe({
        accept_orders: acceptOrders,
        min_order: Number(minOrder),
        delivery_cost: Number(deliveryCost),
      })
      showToast('success', 'Configuración de pedidos actualizada')
    } catch {
      showToast('error', 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveCustomization = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await tenantApi.updateMe({
        primary_color: primaryColor,
        welcome_message: welcomeMessage,
        footer_message: footerMessage,
      })
      showToast('success', 'Personalización actualizada')
    } catch {
      showToast('error', 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault()
    if (newPassword.length < 8) {
      showToast('error', 'La contraseña debe tener al menos 8 caracteres')
      return
    }
    if (newPassword !== confirmPassword) {
      showToast('error', 'Las contraseñas no coinciden')
      return
    }
    setChangingPassword(true)
    try {
      await authApi.changePassword(currentPassword, newPassword)
      showToast('success', 'Contraseña cambiada correctamente')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al cambiar contraseña'
      showToast('error', msg)
    } finally {
      setChangingPassword(false)
    }
  }

  const handleConnectGateway = async (e: FormEvent) => {
    e.preventDefault()
    setLoadingGateways(true)
    try {
      await tenantApi.connectGateway(newGateway.provider, {
        public_key: newGateway.public_key,
        secret_key: newGateway.secret_key
      })
      const gws = await tenantApi.listGateways()
      setGateways(gws)
      setNewGateway({ provider: 'mercadopago', public_key: '', secret_key: '' })
      showToast('success', 'Pasarela conectada correctamente')
    } catch (err) {
      showToast('error', 'Error al conectar pasarela')
    } finally {
      setLoadingGateways(false)
    }
  }

  if (loading) return <LoadingSpinner text="Cargando configuración..." />

  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'contact', label: 'Contacto' },
    { id: 'orders', label: 'Pedidos' },
    { id: 'customization', label: 'Personalización' },
    { id: 'payments', label: 'Pagos' },
    { id: 'account', label: 'Cuenta' },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.id
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: General */}
      {activeTab === 'general' && (
        <Card>
          <form onSubmit={handleSaveGeneral} className="space-y-4">
            <Input label="Nombre de la tienda" value={name} onChange={(e) => setName(e.target.value)} />
            <Input label="Slug" value={tenant?.slug || ''} disabled helperText="El slug no se puede cambiar después de crear la tienda" />
            <Input label="URL del logo" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción breve</label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <Button type="submit" loading={saving}>Guardar cambios</Button>
          </form>
        </Card>
      )}

      {/* Tab: Contacto */}
      {activeTab === 'contact' && (
        <Card>
          <form onSubmit={handleSaveContact} className="space-y-4">
            <Input label="WhatsApp de la tienda" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+54 9 11 1234-5678" />
            <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input label="Dirección física" value={address} onChange={(e) => setAddress(e.target.value)} />
            <Input label="Instagram" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@tu_tienda" />
            <Input label="Facebook" value={facebook} onChange={(e) => setFacebook(e.target.value)} placeholder="facebook.com/tu_tienda" />
            <Button type="submit" loading={saving}>Guardar cambios</Button>
          </form>
        </Card>
      )}

      {/* Tab: Pedidos */}
      {activeTab === 'orders' && (
        <Card>
          <form onSubmit={handleSaveOrders} className="space-y-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptOrders}
                onChange={(e) => setAcceptOrders(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-sm text-gray-700 font-medium">Aceptar pedidos</span>
            </label>
            <Input label="Pedido mínimo ($)" type="number" min="0" value={minOrder} onChange={(e) => setMinOrder(e.target.value)} />
            <Input label="Costo de delivery ($)" type="number" min="0" value={deliveryCost} onChange={(e) => setDeliveryCost(e.target.value)} />
            <Button type="submit" loading={saving}>Guardar cambios</Button>
          </form>
        </Card>
      )}

      {/* Tab: Personalización */}
      {activeTab === 'customization' && (
        <Card>
          <form onSubmit={handleSaveCustomization} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Color principal</label>
              <div className="flex items-center gap-3">
                <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-10 h-10 rounded cursor-pointer" />
                <input type="text" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-32" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mensaje de bienvenida</label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                rows={2}
                value={welcomeMessage}
                onChange={(e) => setWelcomeMessage(e.target.value)}
                placeholder="Bienvenido a nuestra tienda..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mensaje del pie de página</label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                rows={2}
                value={footerMessage}
                onChange={(e) => setFooterMessage(e.target.value)}
                placeholder="Gracias por tu compra..."
              />
            </div>
            <Button type="submit" loading={saving}>Guardar cambios</Button>
          </form>
        </Card>
      )}

      {/* Tab: Pagos */}
      {activeTab === 'payments' && (
        <div className="space-y-6">
          <FeatureGuard feature="white-label" minPlan="pro" fallback="message">
            <Card>
              <h2 className="text-sm font-semibold text-gray-500 uppercase mb-4">Configurar Pasarela de Pagos Propia</h2>
              <p className="text-xs text-slate-400 mb-6 font-medium">
                Como usuario <span className="text-indigo-600 font-bold uppercase">{currentPlan}</span>, puedes vincular tus propias credenciales para recibir pagos directos sin comisiones de plataforma adicionales.
              </p>
              <form onSubmit={handleConnectGateway} className="space-y-4 max-w-md">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Proveedor</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    value={newGateway.provider}
                    onChange={(e) => setNewGateway(n => ({ ...n, provider: e.target.value }))}
                  >
                    <option value="mercadopago">MercadoPago</option>
                    <option value="stripe">Stripe</option>
                    <option value="paypal">PayPal</option>
                  </select>
                </div>
                <Input
                  label="Public Key / Client ID"
                  value={newGateway.public_key}
                  onChange={(e) => setNewGateway(n => ({ ...n, public_key: e.target.value }))}
                  placeholder="APP_USR-..."
                />
                <Input
                  label="Access Token / Secret Key"
                  type="password"
                  value={newGateway.secret_key}
                  onChange={(e) => setNewGateway(n => ({ ...n, secret_key: e.target.value }))}
                  placeholder="TEST-..."
                />
                <Button type="submit" loading={loadingGateways} className="bg-emerald-600 text-white font-bold">
                  <Plus className="w-4 h-4 mr-2" />
                  Vincular Pasarela
                </Button>
              </form>
            </Card>
          </FeatureGuard>

          {gateways.length > 0 && (
            <Card>
              <h2 className="text-sm font-semibold text-gray-500 uppercase mb-4">Pasarelas Activas</h2>
              <div className="space-y-3">
                {gateways.map((gw) => (
                  <div key={gw.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-lg border border-gray-200 flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900 capitalize">{gw.provider}</p>
                        <p className="text-xs text-emerald-600 font-medium">Conectada y Activa</p>
                      </div>
                    </div>
                    {/* Aquí se podría agregar botón de eliminar */}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Tab: Cuenta */}
      {activeTab === 'account' && (
        <Card>
          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-4">Cambiar contraseña</h2>
          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            <Input
              label="Contraseña actual"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            <Input
              label="Nueva contraseña"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              helperText="Mínimo 8 caracteres"
            />
            <Input
              label="Confirmar nueva contraseña"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <Button type="submit" loading={changingPassword}>Cambiar contraseña</Button>
          </form>
        </Card>
      )}
    </div>
  )
}
