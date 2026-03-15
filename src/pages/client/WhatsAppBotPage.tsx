import { useState, useEffect, useRef } from 'react'
import {
    Bot, Save, Plus, Trash2, MessageSquare, Send, Power,
    ToggleLeft, ToggleRight, Loader2, Smartphone, Wifi, WifiOff,
    Clock, ShoppingBag, Zap, Brain, ChevronDown, ChevronUp,
} from 'lucide-react'
import FeatureGuard from '../../components/FeatureGuard'
import { Card, Button, LoadingSpinner, showToast } from '../../components/common'
import { tenantApi, productsApi } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import { callAI as callAIService } from '../../services/aiService'
import { formatPrice } from '../../utils/helpers'
import type { Tenant } from '../../types'

interface FAQ {
    id: string
    trigger: string
    response: string
}

interface WaBotConfig {
    enabled: boolean
    name: string
    personality: 'friendly' | 'formal' | 'sales'
    greeting: string
    outOfHoursMessage: string
    faqs: FAQ[]
    catalogEnabled: boolean
    autoOrderEnabled: boolean
}

const DEFAULT_CONFIG: WaBotConfig = {
    enabled: false,
    name: 'VENDEx WhatsApp',
    personality: 'friendly',
    greeting: '¡Hola! 👋 Soy el asistente de {tienda}. Puedo mostrarte nuestro catálogo, tomar tu pedido o responder tus dudas. ¿En qué te ayudo?',
    outOfHoursMessage: 'Hola! En este momento estamos fuera de horario. Te responderemos apenas abramos. 🕐',
    faqs: [],
    catalogEnabled: true,
    autoOrderEnabled: true,
}

const PERSONALITY_OPTIONS = [
    { value: 'friendly', label: 'Amigable', description: 'Cercano, usa emojis, tono cálido', icon: '😊' },
    { value: 'formal', label: 'Profesional', description: 'Cortés, sin emojis, tono corporativo', icon: '🎩' },
    { value: 'sales', label: 'Vendedor', description: 'Proactivo, sugiere productos, busca cerrar venta', icon: '🔥' },
]

function buildWhatsAppPrompt(config: WaBotConfig, storeName: string, catalogText: string): string {
    const personalityMap = {
        friendly: 'amigable y cálido, usa emojis con moderación, tutea al cliente',
        formal: 'profesional y cortés, usa usted, no usa emojis',
        sales: 'proactivo y vendedor, sugiere productos complementarios, busca cerrar la venta de forma natural',
    }

    const faqsText = config.faqs.length > 0
        ? `\n\nRESPUESTAS RÁPIDAS (usálas cuando el cliente pregunte algo similar):\n${config.faqs.map(f => `Trigger: "${f.trigger}"\nRespuesta: ${f.response}`).join('\n\n')}`
        : ''

    return `Sos el bot de WhatsApp de "${storeName}". Tu personalidad es ${personalityMap[config.personality]}.

TU MISIÓN: Atender clientes por WhatsApp. Podés:
1. Mostrar productos y precios del catálogo
2. Responder dudas sobre la tienda
3. ${config.autoOrderEnabled ? 'Tomar pedidos (preguntá nombre, dirección y qué quiere)' : 'Derivar pedidos al equipo humano'}
4. Sugerir productos según lo que el cliente busca

${catalogText ? `CATÁLOGO ACTUAL:\n${catalogText}\n` : ''}
${faqsText}

REGLAS:
- Respondé siempre en español
- Mensajes cortos (es WhatsApp, no un email)
- Si no sabés algo, decí que vas a consultar con el equipo
- Nunca inventes precios o productos que no estén en el catálogo
- Si el cliente quiere ordenar, confirmá el pedido antes de cerrarlo`
}

function WhatsAppBotInner() {
    const { subscription, selectedStoreId } = useAuth()
    const plan = subscription?.plan_type ?? 'free'
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [config, setConfig] = useState<WaBotConfig>(DEFAULT_CONFIG)
    const [storeName, setStoreName] = useState('Tu tienda')
    const [catalogText, setCatalogText] = useState('')
    const [activeTab, setActiveTab] = useState<'config' | 'faqs' | 'preview'>('config')

    // Preview chat
    const [chatMessages, setChatMessages] = useState<{ id: string; role: 'user' | 'bot'; content: string }[]>([])
    const [chatInput, setChatInput] = useState('')
    const [chatTyping, setChatTyping] = useState(false)
    const chatContainerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
        }
    }, [chatMessages])

    useEffect(() => {
        loadConfig()
    }, [selectedStoreId])

    const loadConfig = async () => {
        setLoading(true)
        try {
            const [tenant, prodRes] = await Promise.all([
                tenantApi.getMe(),
                productsApi.list({ limit: 200 }),
            ])

            setStoreName(tenant.name?.trim() || 'Tu tienda')

            // Build catalog text for AI
            const activeProd = prodRes.data.filter(p => p.is_active)
            const catText = activeProd.map(p =>
                `- ${p.name} | ${formatPrice(p.price)} | Stock: ${p.unlimited_stock ? 'Disponible' : (p.stock > 0 ? p.stock : 'Agotado')}`
            ).join('\n')
            setCatalogText(catText)

            // Load saved config
            const saved = (tenant as any).metadata?.wa_bot_config
            if (saved) {
                setConfig({ ...DEFAULT_CONFIG, ...saved })
            }
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            const tenant = await tenantApi.getMe()
            const metadata = { ...(tenant as any).metadata, wa_bot_config: config }
            await tenantApi.update({ metadata } as Partial<Tenant>)
            showToast('success', 'Configuración del Bot WhatsApp guardada')
        } catch {
            showToast('error', 'Error al guardar')
        } finally {
            setSaving(false)
        }
    }

    const handleChat = async (overrideInput?: string) => {
        const msg = (overrideInput ?? chatInput).trim()
        if (!msg || chatTyping) return

        setChatMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: msg }])
        setChatInput('')
        setChatTyping(true)

        try {
            const systemPrompt = buildWhatsAppPrompt(config, storeName, catalogText)
            const history = chatMessages.slice(-10).map(m => ({
                role: (m.role === 'bot' ? 'assistant' : 'user') as 'user' | 'assistant',
                content: m.content
            }))

            const response = await callAIService([
                { role: 'system', content: systemPrompt },
                ...history,
                { role: 'user', content: msg },
            ], plan)

            setChatMessages(prev => [...prev, { id: Date.now().toString(), role: 'bot', content: response }])
        } catch {
            setChatMessages(prev => [...prev, { id: Date.now().toString(), role: 'bot', content: 'Error al generar respuesta.' }])
        } finally {
            setChatTyping(false)
        }
    }

    const addFaq = () => {
        setConfig(prev => ({
            ...prev,
            faqs: [...prev.faqs, { id: Date.now().toString(), trigger: '', response: '' }]
        }))
    }

    const removeFaq = (id: string) => {
        setConfig(prev => ({ ...prev, faqs: prev.faqs.filter(f => f.id !== id) }))
    }

    const updateFaq = (id: string, field: 'trigger' | 'response', value: string) => {
        setConfig(prev => ({
            ...prev,
            faqs: prev.faqs.map(f => f.id === id ? { ...f, [field]: value } : f)
        }))
    }

    if (loading) return <LoadingSpinner text="Cargando configuración..." />

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200">
                        <MessageSquare className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Bot WhatsApp</h1>
                        <p className="text-xs text-slate-500 font-medium">IA que responde y vende por WhatsApp 24/7</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all border ${config.enabled
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : 'bg-slate-50 border-slate-200 text-slate-500'
                            }`}
                    >
                        {config.enabled ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                        {config.enabled ? 'Activo' : 'Inactivo'}
                    </button>
                    <Button
                        onClick={handleSave}
                        loading={saving}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-[10px] px-6 py-3 rounded-xl shadow-lg shadow-emerald-100 flex items-center gap-2"
                    >
                        <Save className="w-4 h-4" /> Guardar
                    </Button>
                </div>
            </div>

            {/* Status banner */}
            <Card className={`border-2 ${config.enabled ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 bg-slate-50/50'}`}>
                <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${config.enabled ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                        {config.enabled ? <Wifi className="w-5 h-5 text-emerald-600" /> : <WifiOff className="w-5 h-5 text-slate-400" />}
                    </div>
                    <div className="flex-1">
                        <p className={`text-sm font-bold ${config.enabled ? 'text-emerald-700' : 'text-slate-600'}`}>
                            {config.enabled ? 'Bot WhatsApp activo' : 'Bot WhatsApp desactivado'}
                        </p>
                        <p className="text-[10px] text-slate-400">
                            {config.enabled
                                ? 'El bot responde automáticamente los mensajes de WhatsApp con IA'
                                : 'Activá el bot para que responda automáticamente por WhatsApp'}
                        </p>
                    </div>
                    {config.enabled && (
                        <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500">
                            <span className="flex items-center gap-1"><ShoppingBag className="w-3 h-3" /> Catálogo: {config.catalogEnabled ? 'Sí' : 'No'}</span>
                            <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> Pedidos: {config.autoOrderEnabled ? 'Auto' : 'Manual'}</span>
                        </div>
                    )}
                </div>
            </Card>

            {/* Tabs */}
            <div className="flex gap-2">
                {[
                    { key: 'config', label: 'Configuración', icon: Brain },
                    { key: 'faqs', label: 'Respuestas Rápidas', icon: MessageSquare },
                    { key: 'preview', label: 'Probar Bot', icon: Smartphone },
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key as typeof activeTab)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all border ${activeTab === tab.key
                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-100'
                            : 'bg-white border-slate-200 text-slate-500 hover:border-emerald-300'
                            }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Config Tab */}
            {activeTab === 'config' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                        <div className="space-y-5">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nombre del Bot</label>
                                <input
                                    type="text"
                                    value={config.name}
                                    onChange={(e) => setConfig(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Personalidad</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {PERSONALITY_OPTIONS.map(opt => (
                                        <button
                                            key={opt.value}
                                            onClick={() => setConfig(prev => ({ ...prev, personality: opt.value as WaBotConfig['personality'] }))}
                                            className={`p-3 rounded-xl text-center transition-all border-2 ${config.personality === opt.value
                                                ? 'border-emerald-500 bg-emerald-50 shadow-lg shadow-emerald-100'
                                                : 'border-slate-100 hover:border-emerald-200'
                                                }`}
                                        >
                                            <span className="text-xl">{opt.icon}</span>
                                            <p className="text-[10px] font-black text-slate-700 mt-1">{opt.label}</p>
                                            <p className="text-[9px] text-slate-400">{opt.description}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Mensaje de bienvenida</label>
                                <textarea
                                    value={config.greeting}
                                    onChange={(e) => setConfig(prev => ({ ...prev, greeting: e.target.value }))}
                                    placeholder="Ej: ¡Hola! Soy el bot de {tienda}..."
                                    className="w-full h-24 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none resize-none"
                                />
                                <p className="text-[9px] text-slate-400 mt-1">Usá {'{tienda}'} para insertar el nombre de tu tienda</p>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Mensaje fuera de horario</label>
                                <textarea
                                    value={config.outOfHoursMessage}
                                    onChange={(e) => setConfig(prev => ({ ...prev, outOfHoursMessage: e.target.value }))}
                                    className="w-full h-20 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none resize-none"
                                />
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <div className="space-y-5">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Capacidades del Bot</h3>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <ShoppingBag className="w-5 h-5 text-emerald-500" />
                                        <div>
                                            <p className="text-sm font-bold text-slate-700">Acceso al catálogo</p>
                                            <p className="text-[10px] text-slate-400">El bot conoce tus productos, precios y stock</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setConfig(prev => ({ ...prev, catalogEnabled: !prev.catalogEnabled }))}
                                        className={`${config.catalogEnabled ? 'text-emerald-600' : 'text-slate-300'}`}
                                    >
                                        {config.catalogEnabled ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                                    </button>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <Zap className="w-5 h-5 text-amber-500" />
                                        <div>
                                            <p className="text-sm font-bold text-slate-700">Tomar pedidos automáticos</p>
                                            <p className="text-[10px] text-slate-400">El bot puede armar y confirmar pedidos</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setConfig(prev => ({ ...prev, autoOrderEnabled: !prev.autoOrderEnabled }))}
                                        className={`${config.autoOrderEnabled ? 'text-emerald-600' : 'text-slate-300'}`}
                                    >
                                        {config.autoOrderEnabled ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                                    </button>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <Clock className="w-5 h-5 text-blue-500" />
                                        <div>
                                            <p className="text-sm font-bold text-slate-700">Respuesta fuera de horario</p>
                                            <p className="text-[10px] text-slate-400">Envía mensaje automático fuera de tu horario</p>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">Siempre activo</span>
                                </div>
                            </div>

                            {/* Connection guide */}
                            <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200">
                                <h4 className="text-xs font-black text-green-700 uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <MessageSquare className="w-4 h-4" /> Cómo conectar a WhatsApp
                                </h4>
                                <ol className="space-y-1.5 text-[11px] text-green-700/80">
                                    <li><span className="font-bold">1.</span> Configurá el bot arriba y guardá</li>
                                    <li><span className="font-bold">2.</span> Conectá tu número de WhatsApp Business</li>
                                    <li><span className="font-bold">3.</span> Escaneá el QR que aparecerá</li>
                                    <li><span className="font-bold">4.</span> ¡Listo! El bot responde automáticamente</li>
                                </ol>
                                <p className="text-[10px] text-green-600/60 mt-2 italic">La conexión a WhatsApp Business estará disponible próximamente.</p>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* FAQs Tab */}
            {activeTab === 'faqs' && (
                <Card>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Respuestas Rápidas</h3>
                                <p className="text-[10px] text-slate-400 mt-1">Cuando el cliente pregunte algo similar al trigger, el bot responde con la respuesta configurada</p>
                            </div>
                            <Button
                                onClick={addFaq}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase px-4 py-2 rounded-xl flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" /> Agregar
                            </Button>
                        </div>

                        {config.faqs.length === 0 ? (
                            <div className="text-center py-8 text-slate-400">
                                <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                <p className="text-sm font-bold">Sin respuestas rápidas</p>
                                <p className="text-[10px]">Ej: "¿Hacen envíos?" → "Sí, hacemos envíos a todo CABA..."</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {config.faqs.map((faq) => (
                                    <div key={faq.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 space-y-3">
                                                <div>
                                                    <label className="text-[9px] font-black text-slate-400 uppercase">Cuando pregunte:</label>
                                                    <input
                                                        type="text"
                                                        value={faq.trigger}
                                                        onChange={(e) => updateFaq(faq.id, 'trigger', e.target.value)}
                                                        placeholder="Ej: ¿Hacen envíos?"
                                                        className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[9px] font-black text-slate-400 uppercase">Responder con:</label>
                                                    <textarea
                                                        value={faq.response}
                                                        onChange={(e) => updateFaq(faq.id, 'response', e.target.value)}
                                                        placeholder="Ej: ¡Sí! Hacemos envíos a todo CABA y GBA..."
                                                        className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none resize-none h-16"
                                                    />
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => removeFaq(faq.id)}
                                                className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </Card>
            )}

            {/* Preview Tab */}
            {activeTab === 'preview' && (
                <Card padding={false} className="border-0 shadow-2xl overflow-hidden rounded-[2rem]">
                    {/* WhatsApp-style header */}
                    <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4 flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                            <Bot className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white">{config.name || 'Bot WhatsApp'}</h3>
                            <p className="text-[10px] text-white/70">en línea</p>
                        </div>
                        <div className="ml-auto flex items-center gap-2">
                            {chatMessages.length > 0 && (
                                <button
                                    onClick={() => setChatMessages([])}
                                    className="p-2 text-white/50 hover:text-white transition-colors"
                                    title="Limpiar chat"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Chat area - WhatsApp style */}
                    <div
                        ref={chatContainerRef}
                        className="h-96 overflow-y-auto p-4 space-y-2"
                        style={{ backgroundColor: '#e5ddd5', backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'300\' height=\'300\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 0h300v300H0z\' fill=\'none\'/%3E%3C/svg%3E")' }}
                    >
                        {chatMessages.length === 0 && (
                            <div className="flex justify-center">
                                <div className="bg-white/90 backdrop-blur-sm rounded-lg px-4 py-2 text-[11px] text-slate-500 text-center shadow-sm">
                                    Probá enviar un mensaje para ver cómo responde el bot
                                </div>
                            </div>
                        )}
                        {chatMessages.map((m) => (
                            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] px-3 py-2 rounded-lg text-sm shadow-sm whitespace-pre-wrap ${m.role === 'user'
                                    ? 'bg-[#dcf8c6] text-slate-800 rounded-tr-none'
                                    : 'bg-white text-slate-800 rounded-tl-none'
                                    }`}>
                                    {m.content}
                                    <div className={`text-[9px] mt-1 ${m.role === 'user' ? 'text-emerald-600/50 text-right' : 'text-slate-400 text-right'}`}>
                                        {new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {chatTyping && (
                            <div className="flex justify-start">
                                <div className="bg-white px-4 py-3 rounded-lg rounded-tl-none shadow-sm">
                                    <div className="flex gap-1">
                                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Quick test messages */}
                    <div className="px-4 py-2 bg-white/80 border-t border-slate-200 flex flex-wrap gap-1.5">
                        {['¿Qué tienen?', '¿Cuánto sale?', '¿Hacen envíos?', 'Quiero pedir'].map(q => (
                            <button
                                key={q}
                                onClick={() => handleChat(q)}
                                disabled={chatTyping}
                                className="text-[10px] font-semibold px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-emerald-700 hover:bg-emerald-100 transition-all disabled:opacity-40"
                            >
                                {q}
                            </button>
                        ))}
                    </div>

                    {/* Input */}
                    <div className="p-3 bg-slate-100 flex gap-2">
                        <input
                            type="text"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleChat()}
                            placeholder="Escribí un mensaje..."
                            className="flex-1 bg-white border border-slate-200 rounded-full px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none"
                        />
                        <button
                            onClick={() => handleChat()}
                            disabled={!chatInput.trim() || chatTyping}
                            className="w-10 h-10 bg-emerald-500 text-white rounded-full flex items-center justify-center hover:bg-emerald-600 transition-all disabled:opacity-50"
                        >
                            {chatTyping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </button>
                    </div>
                </Card>
            )}
        </div>
    )
}

export default function WhatsAppBotPage() {
    return (
        <FeatureGuard feature="bot" minPlan="ultra">
            <WhatsAppBotInner />
        </FeatureGuard>
    )
}
