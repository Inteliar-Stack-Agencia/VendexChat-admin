import { useState, useEffect } from 'react'
import {
    BarChart3,
    Download,
    ShoppingCart,
    Users,
    Package,
    MapPin,
    TrendingUp,
    Calendar,
    ArrowRight,
    FileSpreadsheet,
    Loader2
} from 'lucide-react'
import { Card, LoadingSpinner, Button } from '../../components/common'
import { statsApi } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import { formatPrice, formatDate } from '../../utils/helpers'
import * as XLSX from 'xlsx'
import { showToast } from '../../components/common/Toast'

export default function StatsPage() {
    const { selectedStoreId } = useAuth()
    const [loading, setLoading] = useState(true)
    const [overview, setOverview] = useState<any>(null)
    const [exporting, setExporting] = useState<string | null>(null)
    const [range, setRange] = useState<'7d' | '30d' | 'all'>('30d')

    useEffect(() => {
        loadOverview()
    }, [range, selectedStoreId])

    const loadOverview = async () => {
        setLoading(true)
        try {
            const data = await statsApi.getOverview(range)
            setOverview(data)
        } catch (err) {
            console.error('Error al cargar estadísticas:', err)
            showToast('error', 'Error al cargar estadísticas')
        } finally {
            setLoading(false)
        }
    }

    const exportToExcel = (data: any[], fileName: string) => {
        try {
            if (data.length === 0) {
                showToast('error', 'No hay datos para exportar')
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
            const res = await statsApi.getOverview('all')
            const data = res.orders.map((o: any) => ({
                'ID Pedido': o.id.slice(0, 8),
                'Fecha': formatDate(o.created_at),
                'Estado': o.status,
                'Total': o.total
            }))
            exportToExcel(data, 'Reporte_Pedidos')
        } catch (err) {
            showToast('error', 'Error al obtener datos de pedidos')
        } finally {
            setExporting(null)
        }
    }

    const handleExportByZone = async () => {
        setExporting('zones')
        try {
            const data = await statsApi.getOrdersByZone()
            const formatted = data.map((o: any) => ({
                'Fecha': formatDate(o.created_at),
                'Zona/Dirección': o.delivery_address,
                'Total': o.total,
                'Estado': o.status
            }))
            exportToExcel(formatted, 'Reporte_Ventas_Por_Zona')
        } catch (err) {
            showToast('error', 'Error al obtener datos por zona')
        } finally {
            setExporting(null)
        }
    }

    const handleExportProducts = async () => {
        setExporting('products')
        try {
            const data = await statsApi.getTopProducts()
            // Agrupar por producto
            const productMap: Record<string, any> = {}
            data.forEach((item: any) => {
                const name = item.products?.name || 'Desconocido'
                if (!productMap[name]) {
                    productMap[name] = { 'Producto': name, 'Cantidad Vendida': 0, 'Total Recaudado': 0 }
                }
                productMap[name]['Cantidad Vendida'] += item.quantity || 0
                productMap[name]['Total Recaudado'] += (item.quantity * item.unit_price) || 0
            })
            exportToExcel(Object.values(productMap), 'Reporte_Top_Productos')
        } catch (err) {
            showToast('error', 'Error al obtener datos de productos')
        } finally {
            setExporting(null)
        }
    }

    const handleExportCustomers = async () => {
        setExporting('customers')
        try {
            const data = await statsApi.getTopCustomers()
            // Agrupar por cliente
            const customerMap: Record<string, any> = {}
            data.forEach((o: any) => {
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
            exportToExcel(Object.values(customerMap).sort((a: any, b: any) => b['Total Compras'] - a['Total Compras']), 'Reporte_Clientes')
        } catch (err) {
            showToast('error', 'Error al obtener datos de clientes')
        } finally {
            setExporting(null)
        }
    }

    if (loading && !overview) return <LoadingSpinner text="Analizando datos..." />

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Estadísticas</h1>
                    <p className="text-slate-500 text-sm">Analizá el rendimiento de tu negocio y descargá reportes.</p>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-xl">
                    {(['7d', '30d', 'all'] as const).map((r) => (
                        <button
                            key={r}
                            onClick={() => setRange(r)}
                            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${range === r ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            {r === '7d' ? '7 Días' : r === '30d' ? '30 Días' : 'Todo'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6 border-indigo-50 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total Ventas</p>
                            <p className="text-2xl font-black text-slate-900">{formatPrice(overview?.totalSales || 0)}</p>
                        </div>
                    </div>
                </Card>

                <Card className="p-6 border-indigo-50 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                            <ShoppingCart className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Cant. Pedidos</p>
                            <p className="text-2xl font-black text-slate-900">{overview?.totalOrders || 0}</p>
                        </div>
                    </div>
                </Card>

                <Card className="p-6 border-indigo-50 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                            <BarChart3 className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Ticket Promedio</p>
                            <p className="text-2xl font-black text-slate-900">{formatPrice(overview?.avgTicket || 0)}</p>
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
                </div>
            </div>
        </div>
    )
}

function ReportCard({ title, description, icon: Icon, onDownload, loading }: any) {
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
