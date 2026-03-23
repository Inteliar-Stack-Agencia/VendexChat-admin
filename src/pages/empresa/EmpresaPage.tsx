import { useState, useEffect } from 'react'
import { Download, ShoppingCart, CalendarRange, Loader2, LogOut, Building2, TrendingUp, Package } from 'lucide-react'
import { statsApi } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import { formatPrice, formatDate } from '../../utils/helpers'
import { showToast } from '../../components/common/Toast'
import * as XLSX from 'xlsx'

type RangeOption = '7d' | '30d' | 'all' | 'custom'

interface CompanyOrder {
    order_number: string
    created_at: string
    customer_name: string
    customer_whatsapp: string
    delivery_address: string
    status: string
    total: number
    metadata?: Record<string, unknown>
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
    pending:   { label: 'Pendiente',  color: 'bg-amber-100 text-amber-700' },
    confirmed: { label: 'Confirmado', color: 'bg-blue-100 text-blue-700' },
    paid:      { label: 'Pagado',     color: 'bg-indigo-100 text-indigo-700' },
    preparing: { label: 'Preparando', color: 'bg-purple-100 text-purple-700' },
    delivered: { label: 'Entregado',  color: 'bg-emerald-100 text-emerald-700' },
    completed: { label: 'Completado', color: 'bg-emerald-100 text-emerald-700' },
    cancelled: { label: 'Cancelado',  color: 'bg-rose-100 text-rose-700' },
}

export default function EmpresaPage() {
    const { user, logout } = useAuth()
    const companyName = user?.company_filter || ''

    const today = new Date().toISOString().split('T')[0]
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const [range, setRange] = useState<RangeOption>('30d')
    const [fromDate, setFromDate] = useState(thirtyDaysAgo)
    const [toDate, setToDate] = useState(today)
    const [orders, setOrders] = useState<CompanyOrder[]>([])
    const [loading, setLoading] = useState(true)
    const [exporting, setExporting] = useState(false)

    const getDateRange = () =>
        range === 'custom' ? { from: fromDate, to: toDate } : undefined

    useEffect(() => {
        loadOrders()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [range, fromDate, toDate])

    const loadOrders = async () => {
        if (!companyName) return
        setLoading(true)
        try {
            const data = await statsApi.getMyCompanyOrders(companyName, range, getDateRange())
            setOrders(data as CompanyOrder[])
        } catch {
            showToast('error', 'Error al cargar pedidos')
        } finally {
            setLoading(false)
        }
    }

    const totalAmount = orders.reduce((acc, o) => acc + (o.total || 0), 0)
    const totalOrders = orders.length

    const handleExport = () => {
        if (orders.length === 0) {
            showToast('error', 'No hay pedidos para exportar en el período seleccionado')
            return
        }
        setExporting(true)
        try {
            const data = orders.map(o => ({
                'N° Pedido': o.order_number || '',
                'Fecha': formatDate(o.created_at),
                'Solicitado por': o.customer_name || '',
                'WhatsApp': o.customer_whatsapp || '',
                'Dirección de entrega': o.delivery_address || '',
                'Estado': STATUS_LABEL[o.status]?.label || o.status,
                'Total': o.total || 0,
            }))
            const worksheet = XLSX.utils.json_to_sheet(data)
            const workbook = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Mis Pedidos')
            XLSX.writeFile(workbook, `Pedidos_${companyName.replace(/\s+/g, '_')}_${today}.xlsx`)
            showToast('success', 'Reporte descargado correctamente')
        } catch {
            showToast('error', 'Error al generar el archivo')
        } finally {
            setExporting(false)
        }
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
                <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 rounded-xl">
                            <Building2 className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Portal Empresa</p>
                            <h1 className="text-base font-black text-slate-900 leading-tight">{companyName}</h1>
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        className="flex items-center gap-2 text-xs text-slate-500 hover:text-rose-600 transition-colors font-semibold"
                    >
                        <LogOut className="w-4 h-4" />
                        Salir
                    </button>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
                {/* Filters + Export */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        {(['7d', '30d', 'all', 'custom'] as const).map((r) => (
                            <button
                                key={r}
                                onClick={() => setRange(r)}
                                className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-1 ${range === r ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                {r === '7d' ? '7 Días' : r === '30d' ? '30 Días' : r === 'all' ? 'Todo' : (
                                    <><CalendarRange className="w-3 h-3" /> Fechas</>
                                )}
                            </button>
                        ))}
                    </div>

                    {range === 'custom' && (
                        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
                            <div className="flex flex-col">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Desde</label>
                                <input type="date" value={fromDate} max={toDate} onChange={e => setFromDate(e.target.value)} className="text-xs text-slate-700 border-none outline-none bg-transparent" />
                            </div>
                            <span className="text-slate-300 font-bold">—</span>
                            <div className="flex flex-col">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Hasta</label>
                                <input type="date" value={toDate} min={fromDate} max={today} onChange={e => setToDate(e.target.value)} className="text-xs text-slate-700 border-none outline-none bg-transparent" />
                            </div>
                        </div>
                    )}

                    <button
                        onClick={handleExport}
                        disabled={exporting || loading}
                        className="ml-auto flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black uppercase tracking-widest px-4 py-2 rounded-xl shadow-sm transition-colors"
                    >
                        {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        Exportar Excel
                    </button>
                </div>

                {/* Summary cards */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                                <TrendingUp className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Compras</p>
                                {loading ? (
                                    <div className="h-7 w-28 bg-slate-100 animate-pulse rounded mt-1" />
                                ) : (
                                    <p className="text-xl font-black text-slate-900">{formatPrice(totalAmount)}</p>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                                <Package className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pedidos</p>
                                {loading ? (
                                    <div className="h-7 w-12 bg-slate-100 animate-pulse rounded mt-1" />
                                ) : (
                                    <p className="text-xl font-black text-slate-900">{totalOrders}</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Orders table */}
                <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-50 flex items-center gap-2">
                        <ShoppingCart className="w-4 h-4 text-slate-400" />
                        <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">Mis Pedidos</h2>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                            <ShoppingCart className="w-10 h-10 mb-3 opacity-30" />
                            <p className="text-sm font-semibold">No hay pedidos en este período</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-50">
                                        <th className="text-left px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Pedido</th>
                                        <th className="text-left px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha</th>
                                        <th className="text-left px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Solicitado por</th>
                                        <th className="text-left px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Entrega</th>
                                        <th className="text-left px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado</th>
                                        <th className="text-right px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {orders.map((order) => {
                                        const st = STATUS_LABEL[order.status] || { label: order.status, color: 'bg-slate-100 text-slate-600' }
                                        return (
                                            <tr key={order.order_number} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-5 py-3 font-semibold text-slate-700">{order.order_number || '—'}</td>
                                                <td className="px-5 py-3 text-slate-500 whitespace-nowrap">{formatDate(order.created_at)}</td>
                                                <td className="px-5 py-3 text-slate-700">{order.customer_name}</td>
                                                <td className="px-5 py-3 text-slate-500 max-w-[200px] truncate">{order.delivery_address || '—'}</td>
                                                <td className="px-5 py-3">
                                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${st.color}`}>
                                                        {st.label}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3 text-right font-black text-slate-900">{formatPrice(order.total)}</td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}
