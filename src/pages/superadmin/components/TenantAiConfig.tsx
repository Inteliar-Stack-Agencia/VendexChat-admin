import { useState } from 'react'
import { Bot, RefreshCw } from 'lucide-react'
import { Tenant } from '../../../types'

interface TenantAiConfigProps {
    tenant: Tenant
    onUpdatePrompt: (prompt: string) => Promise<boolean>
    isSaving: boolean
}

export default function TenantAiConfig({ tenant, onUpdatePrompt, isSaving }: TenantAiConfigProps) {
    const [prompt, setPrompt] = useState(tenant.metadata?.ai_prompt || tenant.ai_prompt || '')

    const handleSave = async () => {
        await onUpdatePrompt(prompt)
    }

    return (
        <div className="bg-white rounded-[2rem] border border-indigo-100 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-indigo-50 bg-indigo-50/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 rounded-xl text-indigo-600">
                        <Bot className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-lg text-slate-900">Prompt del Asistente Virtual</h3>
                </div>
                <span className="px-2 py-1 bg-indigo-600 text-[8px] font-black text-white uppercase tracking-widest rounded-md">Solo Soporte</span>
            </div>
            <div className="p-8 space-y-4">
                <p className="text-xs text-slate-400 font-medium leading-relaxed">Instrucciones para la IA (personalidad, conocimientos, etc.).</p>
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="w-full h-48 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                    placeholder="Escribe el prompt aquí..."
                />
                <div className="flex justify-end gap-3 items-center">
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
    )
}
