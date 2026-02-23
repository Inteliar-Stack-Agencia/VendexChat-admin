import { useState, useEffect, useRef, FormEvent } from 'react'
import { useOutletContext, useLocation } from 'react-router-dom'
import { Card, Button, Input, LoadingSpinner } from '../../components/common'
import { showToast } from '../../components/common/Toast'
import { tenantApi, authApi, storageApi } from '../../services/api'
import { Tenant } from '../../types'
import { CreditCard, Plus, RefreshCw, Trash2, ShieldCheck, Globe, MessageSquare, Palette, LayoutGrid, Upload, Info } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import FeatureGuard from '../../components/FeatureGuard'

const TABS = [
  { id: 'general', label: 'General', icon: Globe },
  { id: 'contact', label: 'Información', icon: MessageSquare },
  { id: 'orders', label: 'Pedidos', icon: LayoutGrid },
  { id: 'customization', label: 'Diseño', icon: Palette },
  { id: 'payments', label: 'Pagos', icon: CreditCard, hidden: true },
  { id: 'account', label: 'Cuenta', icon: ShieldCheck },
]

export default function SettingsPage() {
  const { subscription } = useAuth()
  const { tenant: globalTenant, setTenant: setGlobalTenant } = useOutletContext<{ tenant: Tenant | null, setTenant: (t: Tenant) => void }>()
  const location = useLocation()
  const currentPlan = subscription?.plan_type || 'free'
  const [tenant, setLocalTenant] = useState<Tenant | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)
  const [activeTab, setActiveTab] = useState(() => {
    const hash = window.location.hash.replace('#', '')
    return TABS.some(t => t.id === hash) ? hash : 'general'
  })

  // Efecto para sincronizar tab con hash
  useEffect(() => {
    const hash = location.hash.replace('#', '')
    if (hash && TABS.some(t => t.id === hash)) {
      setActiveTab(hash)
    }
  }, [location.hash])

  // Form para info general
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [bannerUrl, setBannerUrl] = useState('')

  // Form para contacto
  const [whatsapp, setWhatsapp] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [instagram, setInstagram] = useState('')
  const [facebook, setFacebook] = useState('')
  const [customDomain, setCustomDomain] = useState('')

  // Form para pedidos
  const [acceptOrders, setAcceptOrders] = useState(true)
  const [minOrder, setMinOrder] = useState('0')
  const [deliveryCost, setDeliveryCost] = useState('0')
  const [deliveryInfo, setDeliveryInfo] = useState('')
  const [lowStockThreshold, setLowStockThreshold] = useState('5')

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

  // Métodos Manuales
  const [manualMethods, setManualMethods] = useState({
    cash: true,
    transfer: false,
    transfer_details: ''
  })

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await tenantApi.getMe()
        setLocalTenant(data)
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
        setBannerUrl(data.banner_url || '')
        setDeliveryInfo(data.delivery_info || '')
        setCustomDomain(data.custom_domain || '')
        setLowStockThreshold(String(data.low_stock_threshold ?? 5))

        const gws = await tenantApi.listGateways()
        setGateways(gws)

        // Load manual methods from metadata
        const metadata = (data as any).metadata || {}
        setManualMethods({
          cash: metadata.payment_methods?.cash ?? true,
          transfer: metadata.payment_methods?.transfer ?? false,
          transfer_details: metadata.transfer_details || ''
        })
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const handleUpdateTenantState = (updatedData: Partial<Tenant>) => {
    if (tenant) {
      const newTenant = { ...tenant, ...updatedData }
      setLocalTenant(newTenant)
      if (setGlobalTenant) setGlobalTenant(newTenant)
    }
  }

  const handleSaveGeneral = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    if (!tenant?.id) {
      showToast('error', 'No se encontró el ID de la tienda')
      setSaving(false)
      return
    }
    try {
      await tenantApi.updateMe({
        name,
        description,
        logo_url: logoUrl,
        banner_url: bannerUrl,
        custom_domain: customDomain || null
      })
      handleUpdateTenantState({
        name,
        description,
        logo_url: logoUrl,
        banner_url: bannerUrl,
        custom_domain: customDomain || null
      })
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

    // Sanitize social handles
    const cleanInstagram = instagram.trim().replace(/^@/, '').replace(/^(https?:\/\/)?(www\.)?instagram\.com\//i, '').replace(/\/$/, '')
    const cleanFacebook = facebook.trim().replace(/^(https?:\/\/)?(www\.)?facebook\.com\//i, '').replace(/\/$/, '')

    try {
      await tenantApi.updateMe({ whatsapp, email, address, instagram: cleanInstagram, facebook: cleanFacebook })
      handleUpdateTenantState({ whatsapp, email, address, instagram: cleanInstagram, facebook: cleanFacebook })
      setInstagram(cleanInstagram)
      setFacebook(cleanFacebook)
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
        delivery_info: deliveryInfo,
        low_stock_threshold: Number(lowStockThreshold)
      })
      handleUpdateTenantState({
        accept_orders: acceptOrders,
        min_order: Number(minOrder),
        delivery_cost: Number(deliveryCost),
        delivery_info: deliveryInfo,
        low_stock_threshold: Number(lowStockThreshold)
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
      handleUpdateTenantState({
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
      console.error('Error al conectar pasarela:', err)
      showToast('error', 'Error al conectar pasarela')
    } finally {
      setLoadingGateways(false)
    }
  }

  const handleSaveManualPayments = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const currentMetadata = (tenant as any)?.metadata || {}
      const updatedMetadata = {
        ...currentMetadata,
        payment_methods: {
          ...currentMetadata.payment_methods,
          cash: manualMethods.cash,
          transfer: manualMethods.transfer,
        },
        transfer_details: manualMethods.transfer_details
      }

      await tenantApi.updateMe({
        metadata: updatedMetadata
      } as any)

      handleUpdateTenantState({ metadata: updatedMetadata } as any)
      showToast('success', 'Métodos manuales actualizados')
    } catch (err) {
      console.error('Error saving manual payments:', err)
      showToast('error', 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleUpload = async (file: File, type: 'logo' | 'banner') => {
    if (!tenant?.id) return

    const isLogo = type === 'logo'
    if (isLogo) setUploadingLogo(true)
    else setUploadingBanner(true)

    try {
      const extension = file.name.split('.').pop()
      const path = `${tenant.id}/${type}_${Date.now()}.${extension}`
      const url = await storageApi.uploadImage(file, 'stores', path)

      if (isLogo) {
        setLogoUrl(url)
        await tenantApi.updateMe({ logo_url: url })
        handleUpdateTenantState({ logo_url: url })
      } else {
        setBannerUrl(url)
        await tenantApi.updateMe({ banner_url: url })
        handleUpdateTenantState({ banner_url: url })
      }

      showToast('success', `${isLogo ? 'Logo' : 'Banner'} subido y guardado correctamente`)
    } catch (err: any) {
      console.error('Error uploading image (Settings):', err)
      showToast('error', 'Error al subir la imagen. Verifica el tamaño y formato.')
    } finally {
      if (isLogo) setUploadingLogo(false)
      else setUploadingBanner(false)
    }
  }

  if (loading) return <LoadingSpinner text="Cargando configuración..." />


  return (
    <div className="space-y-8 animate-fade-in pb-16">
      <div className="px-1">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Configuración</h1>
        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1">Personaliza tu experiencia y ajustes de tienda</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto border-b border-slate-100 px-1 pb-px scrollbar-hide">
        {TABS.filter(tab => !(tab as any).hidden).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-4 text-[11px] font-black uppercase tracking-widest whitespace-nowrap border-b-2 transition-all duration-300 ${activeTab === tab.id
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/30'
              : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'
              }`}
          >
            <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-indigo-600' : 'text-slate-300'}`} />
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Input
                      label="URL del logo"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      placeholder="https://..."
                      helperText="Dimensiones: 512x512px (1:1)"
                    />
                  </div>
                  <input
                    type="file"
                    ref={logoInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleUpload(file, 'logo')
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="mb-[2px] h-[42px] px-3"
                    onClick={() => logoInputRef.current?.click()}
                    loading={uploadingLogo}
                  >
                    <Upload className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Input
                      label="URL del banner"
                      value={bannerUrl}
                      onChange={(e) => setBannerUrl(e.target.value)}
                      placeholder="https://..."
                      helperText="Dimensiones: 1200x400px (3:1)"
                    />
                  </div>
                  <input
                    type="file"
                    ref={bannerInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleUpload(file, 'banner')
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="mb-[2px] h-[42px] px-3"
                    onClick={() => bannerInputRef.current?.click()}
                    loading={uploadingBanner}
                  >
                    <Upload className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            <FeatureGuard feature="custom-domain" minPlan="pro" fallback="message">
              <Input
                label="Dominio Personalizado"
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
                placeholder="tienda.tudominio.com"
                helperText="Asegúrate de apuntar tu CNAME a vendexchat.app"
              />
            </FeatureGuard>

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

      {/* Tab: Información */}
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Información de envíos/zonas</label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                rows={3}
                value={deliveryInfo}
                onChange={(e) => setDeliveryInfo(e.target.value)}
                placeholder="Entregamos en zona norte los martes..."
              />
            </div>
            <Input
              label="Alerta de Stock Bajo (Umbral)"
              type="number"
              min="0"
              value={lowStockThreshold}
              onChange={(e) => setLowStockThreshold(e.target.value)}
              helperText="Los productos con stock igual o inferior a este número aparecerán como alerta en el dashboard."
            />
            <Button type="submit" loading={saving}>Guardar cambios</Button>
          </form>
        </Card>
      )
      }

      {/* Tab: Personalización */}
      {
        activeTab === 'customization' && (
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
        )
      }

      {/* Tab: Pagos */}
      {
        activeTab === 'payments' && (
          <div className="space-y-6">
            <Card>
              <h2 className="text-sm font-semibold text-gray-500 uppercase mb-4 flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-500" />
                Métodos Manuales
              </h2>
              <form onSubmit={handleSaveManualPayments} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={manualMethods.cash}
                      onChange={e => setManualMethods(p => ({ ...p, cash: e.target.checked }))}
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
                      checked={manualMethods.transfer}
                      onChange={e => setManualMethods(p => ({ ...p, transfer: e.target.checked }))}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Transferencia Bancaria</p>
                      <p className="text-xs text-gray-500">Mostrá tus datos bancarios al finalizar el pedido.</p>
                    </div>
                  </label>
                </div>

                {manualMethods.transfer && (
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Datos Bancarios (Alias, CVU, Titular)</label>
                    <textarea
                      placeholder="Ingresá CBU, Alias, Banco y Titular..."
                      value={manualMethods.transfer_details}
                      onChange={e => setManualMethods(p => ({ ...p, transfer_details: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-emerald-500 focus:outline-none focus:ring-2"
                      rows={4}
                    />
                  </div>
                )}
                <Button type="submit" loading={saving}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Guardar Métodos Manuales
                </Button>
              </form>
            </Card>
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
        )
      }

      {/* Tab: Cuenta */}
      {
        activeTab === 'account' && (
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
        )
      }
    </div >
  )
}
