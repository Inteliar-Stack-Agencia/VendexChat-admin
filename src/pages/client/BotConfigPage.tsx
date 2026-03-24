import { useState, useEffect, useRef } from 'react'
import {
    Bot, Save, Plus, Trash2, MessageSquare,
    Sparkles, Send, User,
    Copy, CheckCircle2, Info, Loader2
} from 'lucide-react'
import FeatureGuard from '../../components/FeatureGuard'
import { Card, Button, LoadingSpinner, showToast } from '../../components/common'
import { tenantApi } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import type { Tenant } from '../../types'

// --- Tipos internos ---
interface FAQ {
    id: string
    question: string
    answer: string
}

interface BotConfig {
    enabled: boolean
    name: string
    personality: 'friendly' | 'formal' | 'concise'
    greeting: string
    faqs: FAQ[]
}

const DEFAULT_CONFIG: BotConfig = {
    enabled: false,
    name: 'VENDEx Bot',
    personality: 'friendly',
    greeting: '¡Hola! 👋 Soy el asistente virtual de la tienda. ¿En qué puedo ayudarte hoy?',
    faqs: [],
}

const PERSONALITY_OPTIONS = [
    {
        value: 'friendly',
        label: 'Amigable',
        description: 'Cálido, usa emojis, tono cercano',
        icon: '😊',
    },
    {
        value: 'formal',
        label: 'Profesional',
        description: 'Cortés, sin emojis, tono corporativo',
        icon: '🎩',
    },
    {
        value: 'concise',
        label: 'Conciso',
        description: 'Respuestas cortas y directas al punto',
        icon: '⚡',
    },
]

import { callAI as callAIService } from '../../services/aiService'

function buildSystemPrompt(config: BotConfig, aiPrompt: string, storeName: string): string {
    const personalityMap = {
        friendly: 'amigable, cálido, usa emojis con moderación, tutea al cliente',
        formal: 'profesional y cortés, usa usted, no usa emojis',
        concise: 'muy conciso, respuestas de máximo 2 oraciones, sin adornos',
    }

    const faqsText =
        config.faqs.length > 0
            ? `\n\nRESPUESTAS PREDEFINIDAS (úsalas cuando el cliente haga estas preguntas):\n${config.faqs
                .map((f) => `P: ${f.question}\nR: ${f.answer}`)
                .join('\n\n')}`
            : ''

    return `Eres el asistente virtual de "${storeName}". Eres ${personalityMap[config.personality]}.
Tu misión es ayudar a los clientes con preguntas sobre el catálogo, precios, horarios y pedidos.
${aiPrompt ? `\n\nINSTRUCCIONES ADICIONALES DE LA TIENDA:\n${aiPrompt}` : ''}${faqsText}
Si no sabes algo, sé honesto y ofrece que un humano responderá pronto.
Responde siempre en español.`
}

// ============================================================
// Componente principal (inner)
// ============================================================
function BotConfigPageInner() {
    const { selectedStoreId, subscription } = useAuth()
    const plan = subscription?.plan_type ?? 'free'
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [tenant, setTenant] = useState<Tenant | null>(null)
    const [config, setConfig] = useState<BotConfig>(DEFAULT_CONFIG)
    const [aiPrompt, setAiPrompt] = useState('')
    const [activeTab, setActiveTab] = useState<'config' | 'faqs' | 'preview'>('config')

    // FAQs
    const [newQuestion, setNewQuestion] = useState('')
    const [newAnswer, setNewAnswer] = useState('')

    // Preview chat
    const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'bot'; text: string }[]>([])
    const [chatInput, setChatInput] = useState('')
    const [chatLoading, setChatLoading] = useState(false)
    const chatEndRef = useRef<HTMLDivElement>(null)

    // Copy
    const [copied, setCopied] = useState(false)

    // ---- Load ----
    useEffect(() => {
        loadTenant()
    }, [selectedStoreId])

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [chatMessages])

    const loadTenant = async () => {
        setLoading(true)
        try {
            const t = await tenantApi.getMe()
            setTenant(t)
            setAiPrompt(String(t.metadata?.ai_prompt || t.ai_prompt || ''))
            const savedConfig = t.metadata?.bot_config as Partial<BotConfig> | undefined
            if (savedConfig) {
                setConfig({ ...DEFAULT_CONFIG, ...savedConfig })
            }
        } catch {
            showToast('error', 'Error al cargar configuración')
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        if (!tenant) return
        setSaving(true)
        try {
            await tenantApi.updateMe({
                metadata: {
                    ...tenant.metadata,
                    ai_prompt: aiPrompt,
                    bot_config: config,
                },
            })
            showToast('success', 'Configuración del Bot guardada')
        } catch {
            showToast('error', 'Error al guardar')
        } finally {
            setSaving(false)
        }
    }

    const handleAddFAQ = () => {
        if (!newQuestion.trim() || !newAnswer.trim()) {
            showToast('error', 'Completá pregunta y respuesta')
            return
        }
        setConfig((prev) => ({
            ...prev,
            faqs: [
                ...prev.faqs,
                { id: Date.now().toString(), question: newQuestion.trim(), answer: newAnswer.trim() },
            ],
        }))
        setNewQuestion('')
        setNewAnswer('')
    }

    const handleDeleteFAQ = (id: string) => {
        setConfig((prev) => ({ ...prev, faqs: prev.faqs.filter((f) => f.id !== id) }))
    }

    const handleChat = async () => {
        if (!chatInput.trim() || chatLoading) return
        const userMsg = chatInput.trim()
        setChatInput('')
        setChatMessages((prev) => [...prev, { role: 'user', text: userMsg }])
        setChatLoading(true)
        try {
            const system = buildSystemPrompt(config, aiPrompt, tenant?.name || 'la tienda')
            const text = await callAIService([
                { role: 'system', content: system },
                { role: 'user', content: userMsg },
            ], plan)
            setChatMessages((prev) => [...prev, { role: 'bot', text }])
        } catch {
            setChatMessages((prev) => [...prev, { role: 'bot', text: '❌ Error de conexión. Revisá tu internet.' }])
        } finally {
            setChatLoading(false)
        }
    }

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    if (loading) return <LoadingSpinner text="Cargando configuración del Bot..." />

    // ---- Render ----
    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Asistente IA</h1>
                    <p className="text-slate-500 text-sm">
                        Configurá el asistente virtual de tu tienda.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        onClick={handleSave}
                        loading={saving}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-xs px-6 py-3 rounded-xl shadow-lg shadow-indigo-100 flex items-center gap-2"
                    >
                        <Save className="w-4 h-4" />
                        Guardar
                    </Button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-xl w-fit gap-1">
                {(
                    [
                        { id: 'config', label: 'Configuración', icon: Bot },
                        { id: 'faqs', label: 'Respuestas Rápidas', icon: MessageSquare },
                        { id: 'preview', label: 'Preview', icon: Sparkles },
                    ] as const
                ).map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        onClick={() => setActiveTab(id)}
                        className={`flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === id
                            ? 'bg-white text-indigo-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <Icon className="w-3 h-3" />
                        {label}
                    </button>
                ))}
            </div>

            {/* ---- Tab: Configuración ---- */}
            {activeTab === 'config' && (
                <div className="space-y-5">
                    {/* Nombre del bot */}
                    <Card className="p-6 space-y-4">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                            Identidad del Bot
                        </h3>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">
                                Nombre del asistente
                            </label>
                            <input
                                type="text"
                                value={config.name}
                                onChange={(e) => setConfig((p) => ({ ...p, name: e.target.value }))}
                                placeholder="Ej: Asistente de La Hamburguesería"
                                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white text-slate-700 font-medium transition-all outline-none text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">
                                Mensaje de bienvenida
                            </label>
                            <textarea
                                value={config.greeting}
                                onChange={(e) => setConfig((p) => ({ ...p, greeting: e.target.value }))}
                                placeholder="Primer mensaje al iniciar el chat..."
                                rows={3}
                                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white text-slate-700 font-medium transition-all outline-none text-sm resize-none"
                            />
                        </div>
                    </Card>

                    {/* Personalidad */}
                    <Card className="p-6 space-y-4">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                            Personalidad
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {PERSONALITY_OPTIONS.map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() =>
                                        setConfig((p) => ({
                                            ...p,
                                            personality: opt.value as BotConfig['personality'],
                                        }))
                                    }
                                    className={`p-4 rounded-2xl border-2 text-left transition-all ${config.personality === opt.value
                                        ? 'border-indigo-500 bg-indigo-50'
                                        : 'border-slate-200 hover:border-indigo-200 bg-white'
                                        }`}
                                >
                                    <div className="text-2xl mb-2">{opt.icon}</div>
                                    <div className="font-black text-slate-900 text-sm">{opt.label}</div>
                                    <div className="text-[11px] text-slate-500 mt-1">{opt.description}</div>
                                </button>
                            ))}
                        </div>
                    </Card>

                    {/* Prompt personalizado */}
                    <Card className="p-6 space-y-3">
                        <div className="flex items-center gap-2">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                                Instrucciones del Catálogo
                            </h3>
                            <div className="group relative">
                                <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                                <div className="absolute hidden group-hover:block bg-slate-800 text-white text-[10px] rounded-xl p-3 w-64 bottom-5 left-0 z-10 font-medium leading-relaxed">
                                    El bot usará estas instrucciones para presentar tu catálogo. Podés indicar qué
                                    productos destacar, precios especiales, promociones, horarios, etc.
                                </div>
                            </div>
                            <span className="text-[9px] bg-emerald-100 text-emerald-600 font-black px-2 py-0.5 rounded-full uppercase tracking-widest ml-auto">
                                Sin límite de palabras
                            </span>
                        </div>
                        <textarea
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                            placeholder={`Ej: Nuestro producto estrella es la Triple Burger. Los fines de semana hay 2x1 en papas fritas. El delivery llega en 30-45 min. No hacemos cambios en combos.`}
                            rows={5}
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white text-slate-700 font-medium transition-all outline-none text-sm resize-none"
                        />
                        <div className="flex items-center justify-between">
                            <p className="text-[10px] text-slate-400 font-medium">
                                Estas instrucciones también se usan en el módulo AI Inteligencia.
                            </p>
                            <span className="text-[11px] font-bold text-slate-400 tabular-nums">
                                {aiPrompt.trim() ? aiPrompt.trim().split(/\s+/).length : 0} palabras
                            </span>
                        </div>
                    </Card>
                </div>
            )}

            {/* ---- Tab: FAQs ---- */}
            {activeTab === 'faqs' && (
                <div className="space-y-5">
                    {/* Agregar FAQ */}
                    <Card className="p-6 space-y-4">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                            Nueva Respuesta Rápida
                        </h3>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">Pregunta del cliente</label>
                            <input
                                type="text"
                                value={newQuestion}
                                onChange={(e) => setNewQuestion(e.target.value)}
                                placeholder="Ej: ¿Hacen envíos a domicilio?"
                                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white text-slate-700 font-medium transition-all outline-none text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">Respuesta del bot</label>
                            <textarea
                                value={newAnswer}
                                onChange={(e) => setNewAnswer(e.target.value)}
                                placeholder="Ej: ¡Sí! Hacemos envíos a toda la ciudad de lunes a sábado de 11hs a 23hs."
                                rows={3}
                                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white text-slate-700 font-medium transition-all outline-none text-sm resize-none"
                            />
                        </div>
                        <Button
                            onClick={handleAddFAQ}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-xs px-5 py-2.5 rounded-xl flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Agregar
                        </Button>
                    </Card>

                    {/* Lista de FAQs */}
                    {config.faqs.length === 0 ? (
                        <Card className="p-10 flex flex-col items-center text-center">
                            <MessageSquare className="w-10 h-10 text-slate-200 mb-3" />
                            <p className="text-slate-400 text-sm font-medium">
                                Todavía no hay respuestas rápidas. Agregá la primera arriba.
                            </p>
                        </Card>
                    ) : (
                        <div className="space-y-3">
                            {config.faqs.map((faq) => (
                                <Card key={faq.id} className="p-5">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="space-y-1 flex-1">
                                            <p className="font-black text-slate-900 text-sm">
                                                💬 {faq.question}
                                            </p>
                                            <p className="text-slate-500 text-sm">{faq.answer}</p>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteFAQ(faq.id)}
                                            className="p-2 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ---- Tab: Preview ---- */}
            {activeTab === 'preview' && (
                <Card className="overflow-hidden">
                    {/* Chat header */}
                    <div className="flex items-center gap-3 p-4 bg-indigo-600">
                        <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
                            <Bot className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="text-white font-black text-sm">{config.name}</p>
                            <p className="text-indigo-200 text-[10px] font-bold uppercase tracking-widest">
                                Asistente Virtual
                            </p>
                        </div>
                        <div className="ml-auto flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-[10px] text-white/70 font-bold uppercase tracking-widest">
                                En línea
                            </span>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="h-80 overflow-y-auto p-4 space-y-3 bg-slate-50">
                        {/* Greeting */}
                        <div className="flex items-end gap-2">
                            <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <Bot className="w-4 h-4 text-indigo-600" />
                            </div>
                            <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3 max-w-xs shadow-sm">
                                <p className="text-slate-700 text-sm">{config.greeting}</p>
                            </div>
                        </div>

                        {chatMessages.map((msg, i) => (
                            <div
                                key={i}
                                className={`flex items-end gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                            >
                                {msg.role === 'bot' && (
                                    <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                                        <Bot className="w-4 h-4 text-indigo-600" />
                                    </div>
                                )}
                                {msg.role === 'user' && (
                                    <div className="w-7 h-7 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0">
                                        <User className="w-4 h-4 text-slate-500" />
                                    </div>
                                )}
                                <div
                                    className={`rounded-2xl px-4 py-3 max-w-xs shadow-sm ${msg.role === 'user'
                                        ? 'bg-indigo-600 text-white rounded-br-sm'
                                        : 'bg-white border border-slate-200 text-slate-700 rounded-bl-sm'
                                        }`}
                                >
                                    <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                                    {msg.role === 'bot' && (
                                        <button
                                            onClick={() => handleCopy(msg.text)}
                                            className="mt-1 flex items-center gap-1 text-[9px] text-slate-400 hover:text-slate-600 transition-colors"
                                        >
                                            {copied ? (
                                                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                            ) : (
                                                <Copy className="w-3 h-3" />
                                            )}
                                            {copied ? 'Copiado' : 'Copiar'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}

                        {chatLoading && (
                            <div className="flex items-end gap-2">
                                <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center">
                                    <Bot className="w-4 h-4 text-indigo-600" />
                                </div>
                                <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                                    <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Input */}
                    <div className="p-4 bg-white border-t border-slate-100 flex gap-2">
                        <input
                            type="text"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleChat()}
                            placeholder="Escribí como si fueras un cliente..."
                            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-sm font-medium outline-none focus:bg-slate-50 focus:ring-2 focus:ring-indigo-200 transition-all"
                        />
                        <button
                            onClick={handleChat}
                            disabled={chatLoading || !chatInput.trim()}
                            className="w-10 h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center justify-center transition-all disabled:opacity-40"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>

                    <p className="text-center text-[9px] text-slate-400 font-bold uppercase tracking-widest py-2 bg-slate-50 border-t border-slate-100">
                        Vista previa con IA real · No refleja datos de pedidos en tiempo real
                    </p>
                </Card>
            )}

        </div>
    )
}

// ============================================================
// Export con FeatureGuard
// ============================================================
export default function BotConfigPage() {
    return (
        <FeatureGuard feature="bot" minPlan="vip">
            <BotConfigPageInner />
        </FeatureGuard>
    )
}
