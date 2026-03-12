import { useState, useEffect, useRef, FormEvent } from 'react'
import { useOutletContext, useLocation } from 'react-router-dom'
import { Card, Button, Input, LoadingSpinner } from '../../components/common'
import { showToast } from '../../components/common/Toast'
import { tenantApi, authApi, storageApi } from '../../services/api'
import { Tenant } from '../../types'
import { CreditCard, Plus, RefreshCw, Trash2, ShieldCheck, Globe, MessageSquare, Palette, LayoutGrid, Upload, Info, Printer } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import FeatureGuard from '../../components/FeatureGuard'

const TABS = [
  { id: 'general', label: 'General', icon: Globe },
  { id: 'contact', label: 'Información', icon: MessageSquare },
  { id: 'orders', label: 'Pedidos', icon: LayoutGrid },
  { id: 'customization', label: 'Diseño', icon: Palette },
  { id: 'printer', label: 'Impresora', icon: Printer },
  { id: 'payments', label: 'Pagos', icon: CreditCard },
  { id: 'account', label: 'Cuenta', icon: ShieldCheck },
]

export default function SettingsPage() {
  const { subscription, selectedStoreId } = useAuth()
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
  const [descriptionLong, setDescriptionLong] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [bannerUrl, setBannerUrl] = useState('')
  const [highlights, setHighlights] = useState<{ icon: string, label: string, description: string }[]>([])
  const [aboutTitle, setAboutTitle] = useState('Nosotros')
  const [historyTitle, setHistoryTitle] = useState('Nuestra Historia')

  // Form para contacto
  const [whatsapp, setWhatsapp] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [instagram, setInstagram] = useState('')
  const [facebook, setFacebook] = useState('')
  const [customDomain, setCustomDomain] = useState('')
  const [country, setCountry] = useState('')
  const [city, setCity] = useState('')

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

  // Form para impresora
  const [ticketWidth, setTicketWidth] = useState('80mm')
  const [ticketHeader, setTicketHeader] = useState('')
  const [ticketFooter, setTicketFooter] = useState('')
  const [showOrderNumber, setShowOrderNumber] = useState(true)

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
    transfer_details: '',
    yape: false,
    yape_details: '',
    plin: false,
    plin_details: ''
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
        setCountry(data.country || '')
        setCity(data.city || '')

        const metadata = (data as any).metadata || {}
        setDescriptionLong(metadata.description_long || '')
        setHighlights(metadata.highlights || [])
        setAboutTitle(metadata.about_title || 'Nosotros')
        setHistoryTitle(metadata.history_title || 'Nuestra Historia')

        // Load printer settings from metadata
        const printer = metadata.printer || {}
        setTicketWidth(printer.width || '80mm')
        setTicketHeader(printer.header || '')
        setTicketFooter(printer.footer || '')
        setShowOrderNumber(printer.show_order_number ?? true)

        const gws = await tenantApi.listGateways()
        setGateways(gws)

        // Load manual methods from metadata
        setManualMethods({
          cash: metadata.payment_methods?.cash ?? true,
          transfer: metadata.payment_methods?.transfer ?? false,
          transfer_details: metadata.transfer_details || '',
          yape: metadata.payment_methods?.yape ?? false,
          yape_details: metadata.yape_details || '',
          plin: metadata.payment_methods?.plin ?? false,
          plin_details: metadata.plin_details || ''
        })
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [selectedStoreId])

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
        custom_domain: customDomain || null,
        metadata: {
          ...((tenant as any)?.metadata || {}),
          description_long: descriptionLong,
          highlights: highlights,
          about_title: aboutTitle,
          history_title: historyTitle
        }
      })
      handleUpdateTenantState({
        name,
        description,
        logo_url: logoUrl,
        banner_url: bannerUrl,
        custom_domain: customDomain || null,
        metadata: {
          ...((tenant as any)?.metadata || {}),
          description_long: descriptionLong,
          highlights: highlights,
          about_title: aboutTitle,
          history_title: historyTitle
        }
      } as any)
      showToast('success', 'Información actualizada')
    } catch (err: unknown) {
      console.error('[SaveGeneral]', err)
      showToast('error', err instanceof Error ? err.message : 'Error al guardar general')
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
      await tenantApi.updateMe({ whatsapp, email, address, country, city, instagram: cleanInstagram, facebook: cleanFacebook })
      handleUpdateTenantState({ whatsapp, email, address, country, city, instagram: cleanInstagram, facebook: cleanFacebook })
      setInstagram(cleanInstagram)
      setFacebook(cleanFacebook)
      showToast('success', 'Contacto actualizado')
    } catch (err: unknown) {
      console.error('[SaveContact]', err)
      showToast('error', err instanceof Error ? err.message : 'Error al guardar contacto')
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
    } catch (err: unknown) {
      console.error('[SaveOrders]', err)
      showToast('error', err instanceof Error ? err.message : 'Error al guardar pedidos')
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
    } catch (err: unknown) {
      console.error('[SaveCustomization]', err)
      showToast('error', err instanceof Error ? err.message : 'Error al guardar diseño')
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
          yape: manualMethods.yape,
          plin: manualMethods.plin,
        },
        transfer_details: manualMethods.transfer_details,
        yape_details: manualMethods.yape_details,
        plin_details: manualMethods.plin_details
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

  const handleSavePrinter = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const currentMetadata = (tenant as any)?.metadata || {}
      const updatedMetadata = {
        ...currentMetadata,
        printer: {
          width: ticketWidth,
          header: ticketHeader,
          footer: ticketFooter,
          show_order_number: showOrderNumber
        }
      }

      await tenantApi.updateMe({
        metadata: updatedMetadata
      } as any)

      handleUpdateTenantState({ metadata: updatedMetadata } as any)
      showToast('success', 'Configuración de impresora actualizada')
    } catch (err: unknown) {
      console.error('Error saving printer settings:', err)
      showToast('error', err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleUpload = async (file: File, type: 'logo' | 'banner') => {
    if (!tenant?.id) {
      showToast('error', 'No se encontró el ID de la tienda. Recarga la página.')
      return
    }

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
    } catch (err: unknown) {
      console.error('Error uploading image (Settings):', err)
      showToast('error', err instanceof Error ? err.message : 'Error al subir la imagen. Verifica el tamaño y formato.')
    } finally {
      if (isLogo) {
        setUploadingLogo(false)
        if (logoInputRef.current) logoInputRef.current.value = ''
      } else {
        setUploadingBanner(false)
        if (bannerInputRef.current) bannerInputRef.current.value = ''
      }
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Input label="Título Sección Nosotros" value={aboutTitle} onChange={(e) => setAboutTitle(e.target.value)} />
                <label className="block text-sm font-medium text-gray-700 mt-2 mb-1">Descripción breve / Observaciones</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div>
                <Input label="Título Sección Historia" value={historyTitle} onChange={(e) => setHistoryTitle(e.target.value)} />
                <label className="block text-sm font-medium text-gray-700 mt-2 mb-1">Nuestra Historia (Descripción detallada)</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  rows={3}
                  value={descriptionLong}
                  onChange={(e) => setDescriptionLong(e.target.value)}
                  placeholder="Cuenta más sobre tu negocio, valores o historia aquí..."
                />
              </div>
            </div>

            {/* Highlights Section */}
            <div className="pt-6 border-t border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Destacados (Highlights)</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Iconos y descripciones clave de tu servicio</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setHighlights([...highlights, { icon: 'Frozen', label: 'Nuevo Destacado', description: 'Descripción breve' }])}
                  disabled={highlights.length >= 6}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {highlights.map((highlight, index) => (
                  <div key={index} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3 relative group">
                    <button
                      type="button"
                      onClick={() => setHighlights(highlights.filter((_, i) => i !== index))}
                      className="absolute top-2 right-2 p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div className="flex gap-3">
                      <div className="space-y-1 flex-1">
                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Icono</label>
                        <select
                          value={highlight.icon}
                          onChange={(e) => {
                            const newHighlights = [...highlights]
                            newHighlights[index].icon = e.target.value
                            setHighlights(newHighlights)
                          }}
                          className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20"
                        >
                          <option value="Frozen">Copo de Nieve (Frío)</option>
                          <option value="Truck">Camión (Envío)</option>
                          <option value="Utensils">Cubiertos (Comida)</option>
                          <option value="Zap">Rayo (Rápido)</option>
                          <option value="Clock">Reloj (Horario)</option>
                          <option value="Shield">Escudo (Seguro)</option>
                          <option value="Box">Paquete (Hermético)</option>
                          <option value="Calendar">Calendario (Pack)</option>
                          <option value="MapPin">Mapa (Ubicación)</option>
                          <option value="Phone">Teléfono (Contacto)</option>
                        </select>
                      </div>
                      <div className="space-y-1 flex-[2]">
                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Etiqueta</label>
                        <input
                          type="text"
                          value={highlight.label}
                          onChange={(e) => {
                            const newHighlights = [...highlights]
                            newHighlights[index].label = e.target.value
                            setHighlights(newHighlights)
                          }}
                          className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20"
                          placeholder="Ej: Congelados"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Descripción</label>
                      <textarea
                        value={highlight.description}
                        onChange={(e) => {
                          const newHighlights = [...highlights]
                          newHighlights[index].description = e.target.value
                          setHighlights(newHighlights)
                        }}
                        rows={2}
                        className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
                        placeholder="Breve descripción..."
                      />
                    </div>
                  </div>
                ))}
              </div>
              {highlights.length === 0 && (
                <div className="text-center py-8 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-100">
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No hay destaques configurados</p>
                </div>
              )}
            </div>

            <div className="pt-6">
              <Button type="submit" loading={saving}>Guardar cambios</Button>
            </div>
          </form>
        </Card>
      )}

      {/* Tab: Información */}
      {activeTab === 'contact' && (
        <Card>
          <form onSubmit={handleSaveContact} className="space-y-4">
            <Input label="WhatsApp de la tienda" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+54 9 11 1234-5678" />
            <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">País</label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Seleccionar país</option>
                  <option value="Argentina">Argentina</option>
                  <option value="Peru">Perú</option>
                  <option value="Chile">Chile</option>
                  <option value="Colombia">Colombia</option>
                  <option value="Mexico">México</option>
                  <option value="Ecuador">Ecuador</option>
                  <option value="Bolivia">Bolivia</option>
                  <option value="Uruguay">Uruguay</option>
                  <option value="Paraguay">Paraguay</option>
                  <option value="Other">Otro</option>
                </select>
              </div>
              <Input label="Ciudad" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={manualMethods.cash}
                      onChange={e => setManualMethods(p => ({ ...p, cash: e.target.checked }))}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Efectivo</p>
                      <p className="text-[10px] text-gray-500">Pagar al recibir o retirar.</p>
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
                      <p className="text-sm font-medium text-gray-900">Transferencia</p>
                      <p className="text-[10px] text-gray-500">Mostrar CBU/Alias.</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={manualMethods.yape}
                      onChange={e => setManualMethods(p => ({ ...p, yape: e.target.checked }))}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Yape</p>
                      <p className="text-[10px] text-gray-500">Billetera digital (Perú).</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={manualMethods.plin}
                      onChange={e => setManualMethods(p => ({ ...p, plin: e.target.checked }))}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Plin</p>
                      <p className="text-[10px] text-gray-500">Billetera digital (Perú).</p>
                    </div>
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {manualMethods.transfer && (
                    <div className="space-y-1">
                      <label className="text-xs font-black uppercase text-slate-400 tracking-widest">Datos Bancarios</label>
                      <textarea
                        placeholder="Alias, CBU, Titular..."
                        value={manualMethods.transfer_details}
                        onChange={e => setManualMethods(p => ({ ...p, transfer_details: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-emerald-500 focus:outline-none focus:ring-2"
                        rows={3}
                      />
                    </div>
                  )}

                  {manualMethods.yape && (
                    <div className="space-y-1">
                      <label className="text-xs font-black uppercase text-slate-400 tracking-widest">Datos de Yape</label>
                      <textarea
                        placeholder="Número de teléfono y Titular..."
                        value={manualMethods.yape_details}
                        onChange={e => setManualMethods(p => ({ ...p, yape_details: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-emerald-500 focus:outline-none focus:ring-2"
                        rows={3}
                      />
                    </div>
                  )}

                  {manualMethods.plin && (
                    <div className="space-y-1">
                      <label className="text-xs font-black uppercase text-slate-400 tracking-widest">Datos de Plin</label>
                      <textarea
                        placeholder="Número de teléfono y Titular..."
                        value={manualMethods.plin_details}
                        onChange={e => setManualMethods(p => ({ ...p, plin_details: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-emerald-500 focus:outline-none focus:ring-2"
                        rows={3}
                      />
                    </div>
                  )}
                </div>
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

      {activeTab === 'printer' && (
        <div className="space-y-6">
          <Card>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                <Printer className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">Ajustes de Impresión</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Configura el formato de tus comandas para ticketeras térmicas</p>
              </div>
            </div>

            <form onSubmit={handleSavePrinter} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Ancho del Papel</label>
                    <div className="flex gap-2">
                      {['58mm', '80mm'].map((width) => (
                        <button
                          key={width}
                          type="button"
                          onClick={() => setTicketWidth(width)}
                          className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold border-2 transition-all ${ticketWidth === width
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                            : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'
                            }`}
                        >
                          {width}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Input
                    label="Cabecera del Ticket"
                    value={ticketHeader}
                    onChange={(e) => setTicketHeader(e.target.value)}
                    placeholder="Ej: ¡Gracias por elegirnos!"
                    helperText="Aparece al inicio de cada comanda"
                  />

                  <Input
                    label="Pie del Ticket"
                    value={ticketFooter}
                    onChange={(e) => setTicketFooter(e.target.value)}
                    placeholder="Ej: Síguenos en @tienda"
                    helperText="Aparece al final de cada comanda"
                  />

                  <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-50 rounded-xl">
                    <input
                      type="checkbox"
                      checked={showOrderNumber}
                      onChange={(e) => setShowOrderNumber(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-xs font-bold text-slate-700">Mostrar número de pedido grande</span>
                  </label>
                </div>

                {/* Preview */}
                <div className="bg-slate-100 p-6 rounded-3xl flex flex-col items-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Vista Previa (Simulada)</p>
                  <div
                    className={`bg-white shadow-lg p-4 font-mono text-[10px] text-slate-800 transition-all duration-300 overflow-hidden`}
                    style={{ width: ticketWidth === '58mm' ? '180px' : '240px' }}
                  >
                    <div className="text-center border-b border-dashed border-slate-200 pb-2 mb-2">
                      <p className="font-bold uppercase">{tenant?.name}</p>
                      <p className="text-[8px]">{new Date().toLocaleString()}</p>
                    </div>

                    {ticketHeader && (
                      <div className="text-center mb-2 italic">
                        {ticketHeader}
                      </div>
                    )}

                    {showOrderNumber && (
                      <div className="text-center py-2 border-b border-dashed border-slate-200 mb-2">
                        <p className="text-[8px] uppercase font-bold">Pedido</p>
                        <p className="text-xl font-black">#0001</p>
                      </div>
                    )}

                    <div className="space-y-1 mb-2">
                      <div className="flex justify-between"><span>1x Producto A</span><span>$1.000</span></div>
                      <div className="flex justify-between"><span>2x Producto B</span><span>$2.000</span></div>
                    </div>

                    <div className="border-t border-dashed border-slate-200 pt-1 font-bold flex justify-between mb-2">
                      <span>TOTAL</span>
                      <span>$3.000</span>
                    </div>

                    {ticketFooter && (
                      <div className="text-center mt-2 border-t border-dashed border-slate-200 pt-2 text-[8px]">
                        {ticketFooter}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <Button type="submit" loading={saving}>Guardar Configuración</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

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
