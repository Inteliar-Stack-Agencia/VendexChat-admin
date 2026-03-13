import { useState, useEffect } from 'react'
import {
    BarChart3,
    Download,
    ShoppingCart,
    Users,
    Package,
    MapPin,
    TrendingUp,
    FileSpreadsheet,
    Loader2,
    CalendarRange,
    CalendarDays,
    Building2
} from 'lucide-react'
import { Card, Button } from '../../components/common'
import { statsApi } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import { formatPrice, formatDate } from '../../utils/helpers'
import * as XLSX from 'xlsx'
import { showToast } from '../../components/common/Toast'

type RangeOption = '7d' | '30d' | 'all' | 'custom'

export default function StatsPage() {
    const { selectedStoreId } = useAuth()
    const [loading, setLoading] = useState(true)
    const [overview, setOverview] = useState<{
        totalSales: number;
        totalOrders: number;
        avgTicket: number;
        orders: { total: number | null; created_at: string | null; status: string | null }[];
    } | null>(null)
    const [exporting, setExporting] = useState<string | null>(null)
    const [range, setRange] = useState<RangeOption>('30d')

    const today = new Date().toISOString().split('T')[0]
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const [fromDate, setFromDate] = useState(thirtyDaysAgo)
    const [toDate, setToDate] = useState(today)

    useEffect(() => {
        loadOverview()
    }, [range, selectedStoreId, fromDate, toDate])

    const getDateRange = () =>
        range === 'custom' ? { from: fromDate, to: toDate } : undefined

    const loadOverview = async () => {
        setLoading(true)
        try {
            const data = await statsApi.getOverview(range, getDateRange())
            setOverview(data)
        } catch (err) {
            console.error('Error al cargar estadísticas:', err)
            showToast('error', 'Error al cargar estadísticas')
        } finally {
            setLoading(false)
        }
    }

    const exportToExcel = (data: Record<string, unknown>[], fileName: string) => {
        try {
            if (data.length === 0) {
                showToast('error', 'No hay datos para exportar en el período seleccionado')
                return
            }
            const worksheet = XLSX.utils.json_to_sheet(data)
            const workbook = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Reporte')
            XLSX.writeFile(workbook, `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`)
            showToast('success', 'Reporte descargado correctamente')
        } catch (err) {
            console.error('Error al exportar:', err)
            showToast('error', 'Error al generar el archivo Excel')
        }
    }

    const handleExportOrders = async () => {
        setExporting('orders')
        try {
            const res = await statsApi.getOrdersByDay(range, getDateRange())
            const data = res.map((o: { order_number?: string; created_at: string; status: string; total: number; customer_name: string; metadata?: Record<string, unknown> }) => ({
                'N° Pedido': o.order_number || '',
                'Fecha': formatDate(o.created_at || ''),
                'Cliente': o.customer_name || '',
                'Empresa': (o.metadata?.company_name as string) || '',
                'Estado': o.status || '',
                'Total': o.total || 0
            }))
            exportToExcel(data, 'Reporte_Pedidos')
        } catch {
            showToast('error', 'Error al obtener datos de pedidos')
        } finally {
            setExporting(null)
        }
    }

    const handleExportByDay = async () => {
        setExporting('byDay')
        try {
            const data = await statsApi.getOrdersByDay(range, getDateRange())
            const dayMap: Record<string, { 'Fecha': string; 'Cant. Pedidos': number; 'Total del Día': number }> = {}
            data.forEach((o: { created_at: string; total: number }) => {
                const day = formatDate(o.created_at)
                if (!dayMap[day]) {
                    dayMap[day] = { 'Fecha': day, 'Cant. Pedidos': 0, 'Total del Día': 0 }
                }
                dayMap[day]['Cant. Pedidos'] += 1
                dayMap[day]['Total del Día'] += o.total || 0
            })
            const sorted = Object.values(dayMap).sort((a, b) =>
                new Date(b['Fecha']).getTime() - new Date(a['Fecha']).getTime()
            )
            exportToExcel(sorted, 'Reporte_Pedidos_Por_Dia')
        } catch {
            showToast('error', 'Error al obtener datos por día')
        } finally {
            setExporting(null)
        }
    }

    const handleExportByCompany = async () => {
        setExporting('company')
        try {
            const data = await statsApi.getOrdersByCompany(range, getDateRange())
            const companyMap: Record<string, { 'Empresa': string; 'Cant. Pedidos': number; 'Total Compras': number }> = {}
            data.forEach((o: { metadata?: Record<string, unknown>; customer_name: string; total: number }) => {
                const company = (o.metadata?.company_name as string) || '(Sin empresa)'
                if (!companyMap[company]) {
                    companyMap[company] = { 'Empresa': company, 'Cant. Pedidos': 0, 'Total Compras': 0 }
                }
                companyMap[company]['Cant. Pedidos'] += 1
                companyMap[company]['Total Compras'] += o.total || 0
            })
            const sorted = Object.values(companyMap).sort((a, b) => b['Total Compras'] - a['Total Compras'])
            exportToExcel(sorted, 'Reporte_Por_Empresa')
        } catch {
            showToast('error', 'Error al obtener datos por empresa')
        } finally {
            setExporting(null)
        }
    }

    const handleExportByZone = async () => {
        setExporting('zones')
        try {
            const data = await statsApi.getOrdersByZone(range, getDateRange())
            const formatted = data.map((o: { created_at: string; delivery_address: string; total: number; status: string }) => ({
                'Fecha': formatDate(o.created_at),
                'Zona/Dirección': o.delivery_address,
                'Total': o.total,
                'Estado': o.status
            }))
            exportToExcel(formatted, 'Reporte_Ventas_Por_Zona')
        } catch {
            showToast('error', 'Error al obtener datos por zona')
        } finally {
            setExporting(null)
        }
    }

    const handleExportProducts = async () => {
        setExporting('products')
        try {
            const data = await statsApi.getTopProducts(range, getDateRange())
            const productMap: Record<string, { 'Producto': string; 'Cantidad Vendida': number; 'Total Recaudado': number }> = {}
            data.forEach((item: { products?: { name: string }[] | { name: string } | null; quantity: number | null; price?: number | null }) => {
                const prod = item.products
                const name = (Array.isArray(prod) ? prod[0]?.name : prod?.name) || 'Desconocido'
                if (!productMap[name]) {
                    productMap[name] = { 'Producto': name, 'Cantidad Vendida': 0, 'Total Recaudado': 0 }
                }
                productMap[name]['Cantidad Vendida'] += item.quantity || 0
                productMap[name]['Total Recaudado'] += ((item.quantity || 0) * (item.price || 0)) || 0
            })
            exportToExcel(Object.values(productMap).sort((a, b) => b['Cantidad Vendida'] - a['Cantidad Vendida']), 'Reporte_Top_Productos')
        } catch {
            showToast('error', 'Error al obtener datos de productos')
        } finally {
            setExporting(null)
        }
    }

    const handleExportCustomers = async () => {
        setExporting('customers')
        try {
            const data = await statsApi.getTopCustomers(range, getDateRange())
            const customerMap: Record<string, { 'Cliente': string; 'WhatsApp': string; 'Cant. Pedidos': number; 'Total Compras': number }> = {}
            data.forEach((o: { customer_whatsapp: string; customer_name: string; total: number }) => {
                const key = o.customer_whatsapp || o.customer_name
                if (!customerMap[key]) {
                    customerMap[key] = {
                        'Cliente': o.customer_name,
                        'WhatsApp': o.customer_whatsapp,
                        'Cant. Pedidos': 0,
                        'Total Compras': 0
                    }
                }
                customerMap[key]['Cant. Pedidos'] += 1
                customerMap[key]['Total Compras'] += o.total || 0
            })
            exportToExcel(Object.values(customerMap).sort((a, b) => b['Total Compras'] - a['Total Compras']), 'Reporte_Clientes')
        } catch {
            showToast('error', 'Error al obtener datos de clientes')
        } finally {
            setExporting(null)
        }
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Estadísticas</h1>
                    <p className="text-slate-500 text-sm">Analizá el rendimiento de tu negocio y descargá reportes.</p>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    {/* Range quick buttons */}
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        {(['7d', '30d', 'all', 'custom'] as const).map((r) => (
                            <button
                                key={r}
                                onClick={() => setRange(r)}
                                className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-1 ${range === r ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                {r === '7d' ? '7 Días' : r === '30d' ? '30 Días' : r === 'all' ? 'Todo' : (
                                    <><CalendarRange className="w-3 h-3" /> Fechas</>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Custom date inputs */}
                    {range === 'custom' && (
                        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
                            <div className="flex flex-col">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Desde</label>
                                <input
                                    type="date"
                                    value={fromDate}
                                    max={toDate}
                                    onChange={e => setFromDate(e.target.value)}
                                    className="text-xs text-slate-700 border-none outline-none bg-transparent"
                                />
                            </div>
                            <span className="text-slate-300 font-bold">—</span>
                            <div className="flex flex-col">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Hasta</label>
                                <input
                                    type="date"
                                    value={toDate}
                                    min={fromDate}
                                    max={today}
                                    onChange={e => setToDate(e.target.value)}
                                    className="text-xs text-slate-700 border-none outline-none bg-transparent"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6 border-indigo-50 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total Ventas</p>
                            {loading ? (
                                <div className="h-8 w-32 bg-slate-100 animate-pulse rounded mt-1" />
                            ) : (
                                <p className="text-2xl font-black text-slate-900">{formatPrice(overview?.totalSales || 0)}</p>
                            )}
                        </div>
                    </div>
                </Card>

                <Card className="p-6 border-indigo-50 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                            <ShoppingCart className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Cant. Pedidos</p>
                            {loading ? (
                                <div className="h-8 w-16 bg-slate-100 animate-pulse rounded mt-1" />
                            ) : (
                                <p className="text-2xl font-black text-slate-900">{overview?.totalOrders || 0}</p>
                            )}
                        </div>
                    </div>
                </Card>

                <Card className="p-6 border-indigo-50 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                            <BarChart3 className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Ticket Promedio</p>
                            {loading ? (
                                <div className="h-8 w-24 bg-slate-100 animate-pulse rounded mt-1" />
                            ) : (
                                <p className="text-2xl font-black text-slate-900">{formatPrice(overview?.avgTicket || 0)}</p>
                            )}
                        </div>
                    </div>
                </Card>
            </div>

            {/* Reports Section */}
            <div className="space-y-4">
                <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
                    Descarga de Reportes (Excel)
                </h2>
                <p className="text-xs text-slate-400 -mt-2">
                    Los reportes se exportan con el filtro de período seleccionado arriba.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ReportCard
                        title="Listado de Pedidos"
                        description="Historial completo de pedidos con fecha, estado y montos totales."
                        icon={ShoppingCart}
                        onDownload={handleExportOrders}
                        loading={exporting === 'orders'}
                    />
                    <ReportCard
                        title="Ventas por Zona"
                        description="Analizá tus ventas agrupadas por dirección o zona de entrega."
                        icon={MapPin}
                        onDownload={handleExportByZone}
                        loading={exporting === 'zones'}
                    />
                    <ReportCard
                        title="Ranking de Productos"
                        description="Ranking de los productos más vendidos y recaudación por producto."
                        icon={Package}
                        onDownload={handleExportProducts}
                        loading={exporting === 'products'}
                    />
                    <ReportCard
                        title="Ranking de Clientes"
                        description="Conocé a tus mejores clientes basados en frecuencia y volumen de compra."
                        icon={Users}
                        onDownload={handleExportCustomers}
                        loading={exporting === 'customers'}
                    />
                    <ReportCard
                        title="Pedidos por Día"
                        description="Resumen de pedidos y ventas agrupados por día. Ideal para ver picos de demanda."
                        icon={CalendarDays}
                        onDownload={handleExportByDay}
                        loading={exporting === 'byDay'}
                    />
                    <ReportCard
                        title="Pedidos por Empresa"
                        description="Agrupá los pedidos por empresa/razón social. Requiere que el campo empresa esté completado en el pedido."
                        icon={Building2}
                        onDownload={handleExportByCompany}
                        loading={exporting === 'company'}
                    />
                </div>
            </div>
        </div>
    )
}

interface ReportCardProps {
    title: string;
    description: string;
    icon: React.ElementType;
    onDownload: () => void;
    loading: boolean;
}

function ReportCard({ title, description, icon: Icon, onDownload, loading }: ReportCardProps) {
    return (
        <Card className="group hover:border-emerald-200 transition-all duration-300">
            <div className="flex items-start justify-between">
                <div className="flex gap-4">
                    <div className="p-3 bg-slate-50 text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 rounded-xl transition-colors">
                        <Icon className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-black text-slate-900 uppercase tracking-tight text-sm mb-1">{title}</h3>
                        <p className="text-xs text-slate-500 max-w-xs">{description}</p>
                    </div>
                </div>

                <Button
                    variant="secondary"
                    size="sm"
                    onClick={onDownload}
                    disabled={loading}
                    className="bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                >
                    {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <>
                            <Download className="w-4 h-4 mr-2" />
                            Excel
                        </>
                    )}
                </Button>
            </div>
        </Card>
    )
}
