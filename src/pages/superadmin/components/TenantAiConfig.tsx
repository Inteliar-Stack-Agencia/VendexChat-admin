import { useState } from 'react'
import { Bot, RefreshCw, Shield, Sparkles, Copy, Check } from 'lucide-react'
import { Tenant } from '../../../types'

interface TenantAiConfigProps {
    tenant: Tenant
    onUpdatePrompt: (prompt: string) => Promise<boolean>
    isSaving: boolean
}

// Plantillas PRO predefinidas que el superadmin puede aplicar
const PRO_TEMPLATES: { label: string; description: string; prompt: string }[] = [
    {
        label: 'Vendedor Básico',
        description: 'Responde consultas, recomienda 1 producto, tono neutro.',
        prompt: `Sos el asistente de ventas de la tienda. Tu rol:
- Respondé consultas sobre productos, precios, stock y envíos.
- Recomendá máximo 1 producto por respuesta.
- Sé breve, claro y amable.
- Si no sabés algo, ofrecé que un vendedor responderá pronto.
- Respondé siempre en español.`,
    },
    {
        label: 'Informativo',
        description: 'Solo responde preguntas, no recomienda productos.',
        prompt: `Sos el asistente informativo de la tienda. Tu rol:
- Respondé preguntas sobre precios, stock, horarios y envíos.
- No recomiendes productos ni intentes vender.
- Respuestas cortas y directas.
- Si no sabés algo, derivá a un vendedor humano.
- Respondé siempre en español.`,
    },
    {
        label: 'Atención al Cliente',
        description: 'Orientado a soporte y consultas post-venta.',
        prompt: `Sos el asistente de atención al cliente de la tienda. Tu rol:
- Ayudá con consultas sobre pedidos, envíos, cambios y devoluciones.
- Recomendá máximo 1 producto si el cliente pregunta.
- Sé empático, breve y resolutivo.
- Si no podés resolver, indicá que un agente humano los contactará.
- Respondé siempre en español.`,
    },
]

// Reglas que se aplican automáticamente al plan PRO (server-side)
const PRO_RULES = [
    'Máximo 1 recomendación de producto por respuesta',
    'Sin argumentos extensos de venta ni múltiples razones para comprar',
    'Respuestas breves y directas, sin personalización profunda',
    'Sin técnicas de upselling ni cross-selling',
]

export default function TenantAiConfig({ tenant, onUpdatePrompt, isSaving }: TenantAiConfigProps) {
    const [prompt, setPrompt] = useState<string>((tenant.metadata?.ai_prompt as string | undefined) || '')
    const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
    const tenantPlan = (tenant.metadata?.plan_type as string | undefined) || 'free'

    const handleSave = async () => {
        await onUpdatePrompt(prompt)
    }

    const handleApplyTemplate = (template: string) => {
        // Reemplazar nombre genérico con el nombre real de la tienda
        const customized = template.replace('de la tienda', `de "${tenant.name}"`)
        setPrompt(customized)
    }

    const handleCopyTemplate = (idx: number, template: string) => {
        navigator.clipboard.writeText(template)
        setCopiedIdx(idx)
        setTimeout(() => setCopiedIdx(null), 2000)
    }

    const wordCount = prompt.trim() ? prompt.trim().split(/\s+/).length : 0

    return (
        <div className="bg-white rounded-[2rem] border border-indigo-100 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-indigo-50 bg-indigo-50/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 rounded-xl text-indigo-600">
                        <Bot className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-slate-900">Prompt del Asistente Virtual</h3>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                            Plan actual: <span className={`font-black uppercase ${tenantPlan === 'pro' ? 'text-amber-600' : tenantPlan === 'vip' ? 'text-indigo-600' : tenantPlan === 'ultra' ? 'text-purple-600' : 'text-slate-500'}`}>{tenantPlan}</span>
                            {tenantPlan === 'pro' && ' — El usuario NO puede editar este prompt'}
                            {(tenantPlan === 'vip' || tenantPlan === 'ultra') && ' — El usuario puede editar libremente'}
                        </p>
                    </div>
                </div>
                <span className="px-2 py-1 bg-indigo-600 text-[8px] font-black text-white uppercase tracking-widest rounded-md">Solo Soporte</span>
            </div>

            <div className="p-8 space-y-6">
                {/* Reglas PRO automáticas */}
                {tenantPlan === 'pro' && (
                    <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl space-y-3">
                        <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-amber-600" />
                            <h4 className="text-xs font-black text-amber-700 uppercase tracking-widest">Reglas PRO activas (automáticas)</h4>
                        </div>
                        <ul className="space-y-1">
                            {PRO_RULES.map((rule, i) => (
                                <li key={i} className="text-[11px] text-amber-600 font-medium flex items-start gap-2">
                                    <span className="text-amber-400 mt-0.5">•</span>
                                    {rule}
                                </li>
                            ))}
                        </ul>
                        <p className="text-[10px] text-amber-500 font-medium">
                            Estas reglas se inyectan automáticamente en cada respuesta del bot para el plan PRO.
                        </p>
                    </div>
                )}

                {/* Plantillas PRO rápidas */}
                {tenantPlan === 'pro' && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-indigo-500" />
                            <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">Plantillas rápidas PRO</h4>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {PRO_TEMPLATES.map((tpl, i) => (
                                <div key={i} className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-2 hover:border-indigo-200 transition-all">
                                    <p className="text-xs font-bold text-slate-700">{tpl.label}</p>
                                    <p className="text-[10px] text-slate-400 font-medium leading-relaxed">{tpl.description}</p>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleApplyTemplate(tpl.prompt)}
                                            className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-800 transition-colors"
                                        >
                                            Aplicar
                                        </button>
                                        <button
                                            onClick={() => handleCopyTemplate(i, tpl.prompt)}
                                            className="text-[10px] font-bold text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1"
                                        >
                                            {copiedIdx === i ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                            {copiedIdx === i ? 'Copiado' : 'Copiar'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Editor de prompt */}
                <div className="space-y-3">
                    <p className="text-xs text-slate-400 font-medium leading-relaxed">
                        {tenantPlan === 'pro'
                            ? 'Configurá el prompt que usará este tenant PRO. El usuario solo puede ver estas instrucciones, no editarlas.'
                            : 'Instrucciones para la IA (personalidad, conocimientos, etc.). El usuario VIP/Ultra también puede editar esto desde su panel.'
                        }
                    </p>
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="w-full h-48 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                        placeholder="Escribe el prompt aquí..."
                    />
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-400 font-bold tabular-nums">{wordCount} palabras</span>
                        <div className="flex gap-3 items-center">
                            {isSaving && <RefreshCw className="w-4 h-4 text-indigo-600 animate-spin" />}
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="px-6 py-2.5 bg-indigo-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg active:scale-95"
                            >
                                {isSaving ? 'Actualizando...' : 'Actualizar Prompt'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
