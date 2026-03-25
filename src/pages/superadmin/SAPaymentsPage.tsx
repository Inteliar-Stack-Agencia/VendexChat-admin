import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Globe, MapPin } from 'lucide-react'
import { superadminApi } from '../../services/api'

const PLAN_PRICES: Record<string, Record<string, number>> = {
    free:  { monthly: 0,     annual: 0 },
    pro:   { monthly: 13.99, annual: 119.88 },
    vip:   { monthly: 19.99, annual: 179.88 },
    ultra: { monthly: 25,    annual: 240 },
}

function getPlanAmount(planType: string, billingCycle: string): number {
    return PLAN_PRICES[planType]?.[billingCycle] ?? 0
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getStatusBadge(status: string) {
    switch (status) {
        case 'active':
            return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100">Activo</span>
        case 'trial':
            return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-blue-50 text-blue-600 border border-blue-100">Trial</span>
        case 'past_due':
            return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-50 text-amber-600 border border-amber-100">Vencido</span>
        case 'canceled':
        case 'incomplete':
            return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-rose-50 text-rose-600 border border-rose-100">Cancelado</span>
        default:
            return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 border border-slate-200">{status}</span>
    }
}

export default function SAPaymentsPage() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [subscriptions, setSubscriptions] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [filterCountry, setFilterCountry] = useState('all')
    const [filterCity, setFilterCity] = useState('all')

    useEffect(() => {
        superadminApi.listSubscriptions()
            .then(data => setSubscriptions(data))
            .finally(() => setLoading(false))
    }, [])

    const countries = useMemo(() => {
        const set = new Set(subscriptions.map(s => s.store_country).filter(Boolean))
        return Array.from(set).sort()
    }, [subscriptions])

    const cities = useMemo(() => {
        const set = new Set(
            subscriptions
                .filter(s => filterCountry === 'all' || s.store_country === filterCountry)
                .map(s => s.store_city)
                .filter(Boolean)
        )
        return Array.from(set).sort()
    }, [subscriptions, filterCountry])

    const filtered = useMemo(() => {
        return subscriptions.filter(s => {
            if (filterCountry !== 'all' && s.store_country !== filterCountry) return false
            if (filterCity !== 'all' && s.store_city !== filterCity) return false
            return true
        })
    }, [subscriptions, filterCountry, filterCity])

    const totalMRR = useMemo(() =>
        filtered.filter(s => s.status === 'active').reduce((acc, s) => acc + getPlanAmount(s.plan_type, 'monthly'), 0)
    , [filtered])

    return (
        <div className="space-y-8">
            <header>
                <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Pagos Recibidos</h2>
                <p className="text-slate-500 mt-1">Suscripciones de tus clientes por país y ciudad.</p>
            </header>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">MRR (filtrado)</p>
                    <p className="text-2xl font-black text-slate-900 mt-1">${totalMRR.toFixed(2)}</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Suscriptores activos</p>
                    <p className="text-2xl font-black text-slate-900 mt-1">{filtered.filter(s => s.status === 'active').length}</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total suscripciones</p>
                    <p className="text-2xl font-black text-slate-900 mt-1">{filtered.length}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center">
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm">
                    <Globe className="w-4 h-4 text-slate-400" />
                    <select
                        value={filterCountry}
                        onChange={e => { setFilterCountry(e.target.value); setFilterCity('all') }}
                        className="text-sm font-semibold text-slate-700 bg-transparent outline-none cursor-pointer"
                    >
                        <option value="all">Todos los países</option>
                        {countries.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <select
                        value={filterCity}
                        onChange={e => setFilterCity(e.target.value)}
                        className="text-sm font-semibold text-slate-700 bg-transparent outline-none cursor-pointer"
                        disabled={cities.length === 0}
                    >
                        <option value="all">Todas las ciudades</option>
                        {cities.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden relative">
                {loading && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex items-center justify-center">
                        <div className="flex gap-1">
                            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                        </div>
                    </div>
                )}
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Suscriptor</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">País / Ciudad</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Plan</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Monto</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Estado</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Detalle</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filtered.map((s) => (
                                <tr key={s.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-8 py-5">
                                        <p className="text-sm font-bold text-slate-900">{s.store_name ?? '—'}</p>
                                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                                            {s.current_period_end ? `Vence: ${new Date(s.current_period_end).toLocaleDateString()}` : '—'}
                                        </p>
                                    </td>
                                    <td className="px-8 py-5">
                                        <p className="text-sm font-semibold text-slate-700">{s.store_country ?? '—'}</p>
                                        {s.store_city && <p className="text-[10px] text-slate-400 font-medium mt-0.5">{s.store_city}</p>}
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className="text-sm font-bold text-slate-700 uppercase">{s.plan_type}</span>
                                        <p className="text-[10px] text-slate-400 font-medium mt-0.5 capitalize">{s.billing_cycle === 'annual' ? 'Anual' : 'Mensual'}</p>
                                    </td>
                                    <td className="px-8 py-5 text-sm font-black text-slate-900">
                                        {getPlanAmount(s.plan_type, s.billing_cycle) === 0
                                            ? <span className="text-slate-400">Gratis</span>
                                            : `$${getPlanAmount(s.plan_type, s.billing_cycle).toFixed(2)}`
                                        }
                                    </td>
                                    <td className="px-8 py-5">
                                        {getStatusBadge(s.status)}
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <Link to={`/sa/tenants/${s.store_id}`} className="p-2 inline-block rounded-lg text-slate-300 hover:text-blue-600 hover:bg-blue-50 transition-all">
                                            <ArrowUpRight className="w-5 h-5" />
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {!loading && filtered.length === 0 && (
                    <div className="p-20 text-center text-slate-400 font-bold italic">No hay suscripciones registradas.</div>
                )}
            </div>
        </div>
    )
}
