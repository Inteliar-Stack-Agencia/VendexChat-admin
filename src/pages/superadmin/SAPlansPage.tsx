import { useState, useEffect } from 'react'
import { DollarSign, Save, RefreshCw } from 'lucide-react'
import { supabase } from '../../supabaseClient'
import { toast } from 'sonner'

interface Plan {
    id: string
    name: string
    price_usd: number
    annual_price_usd: number
    sort_order: number
    is_active: boolean
}

interface EditState {
    price_usd: string
    annual_price_usd: string
}

const PLAN_BADGES: Record<string, { label: string; color: string }> = {
    free:  { label: 'Free',   color: 'bg-slate-100 text-slate-600' },
    pro:   { label: 'Pro',    color: 'bg-indigo-100 text-indigo-700' },
    vip:   { label: 'VIP',    color: 'bg-violet-100 text-violet-700' },
    ultra: { label: 'Ultra',  color: 'bg-amber-100 text-amber-700' },
}

export default function SAPlansPage() {
    const [plans, setPlans] = useState<Plan[]>([])
    const [loading, setLoading] = useState(true)
    const [edits, setEdits] = useState<Record<string, EditState>>({})
    const [saving, setSaving] = useState<Record<string, boolean>>({})

    const fetchPlans = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('plans')
            .select('id, name, price_usd, annual_price_usd, sort_order, is_active')
            .order('sort_order')
        if (error) {
            toast.error('Error al cargar planes')
            console.error(error)
        } else {
            setPlans(data as Plan[])
            const initial: Record<string, EditState> = {}
            for (const p of data as Plan[]) {
                initial[p.id] = {
                    price_usd: String(p.price_usd),
                    annual_price_usd: String(p.annual_price_usd),
                }
            }
            setEdits(initial)
        }
        setLoading(false)
    }

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchPlans()
    }, [])

    const handleSave = async (planId: string) => {
        const edit = edits[planId]
        const price_usd = parseFloat(edit.price_usd)
        const annual_price_usd = parseFloat(edit.annual_price_usd)

        if (isNaN(price_usd) || isNaN(annual_price_usd)) {
            toast.error('Los precios deben ser números válidos')
            return
        }

        setSaving(s => ({ ...s, [planId]: true }))
        const { error } = await supabase
            .from('plans')
            .update({ price_usd, annual_price_usd, updated_at: new Date().toISOString() })
            .eq('id', planId)

        if (error) {
            toast.error('Error al guardar', { description: error.message })
        } else {
            toast.success(`Plan ${planId} actualizado`)
            setPlans(ps => ps.map(p => p.id === planId ? { ...p, price_usd, annual_price_usd } : p))
        }
        setSaving(s => ({ ...s, [planId]: false }))
    }

    const isDirty = (planId: string) => {
        const plan = plans.find(p => p.id === planId)
        if (!plan || !edits[planId]) return false
        return (
            parseFloat(edits[planId].price_usd) !== plan.price_usd ||
            parseFloat(edits[planId].annual_price_usd) !== plan.annual_price_usd
        )
    }

    return (
        <div className="space-y-8 pb-10">
            <header className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Planes y Precios</h2>
                    <p className="text-slate-500 mt-1">Editá los precios de cada plan directamente en la base de datos.</p>
                </div>
                <button
                    onClick={fetchPlans}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                    <RefreshCw className="w-4 h-4" />
                    Recargar
                </button>
            </header>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 animate-pulse">
                            <div className="h-4 bg-slate-100 rounded w-1/3 mb-4" />
                            <div className="h-8 bg-slate-100 rounded w-1/2 mb-2" />
                            <div className="h-8 bg-slate-100 rounded w-1/2" />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {plans.map(plan => {
                        const badge = PLAN_BADGES[plan.id] ?? { label: plan.id, color: 'bg-slate-100 text-slate-600' }
                        const edit = edits[plan.id] ?? { price_usd: '0', annual_price_usd: '0' }
                        const dirty = isDirty(plan.id)
                        const isSaving = saving[plan.id] ?? false

                        return (
                            <div key={plan.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-indigo-50 rounded-xl">
                                            <DollarSign className="w-5 h-5 text-indigo-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900">{plan.name}</h3>
                                            <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${badge.color}`}>
                                                {badge.label}
                                            </span>
                                        </div>
                                    </div>
                                    {dirty && (
                                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full uppercase tracking-widest">
                                            Sin guardar
                                        </span>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                                            Precio mensual (USD)
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">$</span>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={edit.price_usd}
                                                onChange={e => setEdits(ed => ({ ...ed, [plan.id]: { ...ed[plan.id], price_usd: e.target.value } }))}
                                                className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                                            Precio anual (USD)
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">$</span>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={edit.annual_price_usd}
                                                onChange={e => setEdits(ed => ({ ...ed, [plan.id]: { ...ed[plan.id], annual_price_usd: e.target.value } }))}
                                                className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {plan.price_usd > 0 && plan.annual_price_usd > 0 && (
                                    <p className="text-xs text-slate-400">
                                        Descuento anual actual:{' '}
                                        <span className="font-bold text-emerald-600">
                                            {Math.round((1 - plan.annual_price_usd / (plan.price_usd * 12)) * 100)}%
                                        </span>
                                    </p>
                                )}

                                <button
                                    onClick={() => handleSave(plan.id)}
                                    disabled={!dirty || isSaving}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-200 w-full justify-center"
                                >
                                    <Save className="w-4 h-4" />
                                    {isSaving ? 'Guardando...' : 'Guardar cambios'}
                                </button>
                            </div>
                        )
                    })}
                </div>
            )}

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
                <strong>Nota:</strong> Los cambios de precio se aplican a nuevas suscripciones. Las suscripciones activas no se ven afectadas hasta su próxima renovación.
            </div>
        </div>
    )
}
