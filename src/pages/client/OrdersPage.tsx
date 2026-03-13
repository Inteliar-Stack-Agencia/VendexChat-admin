import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Eye, ShoppingCart, Printer } from 'lucide-react'
import { Card, Badge, LoadingSpinner, EmptyState, Pagination } from '../../components/common'
import { ordersApi } from '../../services/api'
import { Order } from '../../types'
import { formatPrice, formatDate, orderStatusConfig } from '../../utils/helpers'
import { useAuth } from '../../contexts/AuthContext'

export default function OrdersPage() {
  const { selectedStoreId } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const loadOrders = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string | number> = { page, limit: 20 }
      if (statusFilter !== 'all') params.status = statusFilter

      // Filtros de fecha
      const now = new Date()
      if (dateFilter === 'today') {
        params.date_from = now.toISOString().split('T')[0]
        params.date_to = now.toISOString().split('T')[0]
      } else if (dateFilter === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        params.date_from = weekAgo.toISOString().split('T')[0]
      } else if (dateFilter === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        params.date_from = monthAgo.toISOString().split('T')[0]
      }

      const res = await ordersApi.list(params as Parameters<typeof ordersApi.list>[0])
      setOrders(res.data)
      setTotalPages(res.total_pages)
    } catch (err) {
      console.error('Error cargando pedidos:', err)
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, dateFilter, selectedStoreId])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  const handlePrint = async (orderId: string) => {
    const order = await ordersApi.get(orderId)
    const statusConf = orderStatusConfig[order.status]
    const itemsHtml = (order.items || []).map(item =>
      `<tr>
        <td style="padding:4px 8px;border-bottom:1px solid #eee">${item.product_name}</td>
        <td style="padding:4px 8px;border-bottom:1px solid #eee;text-align:center">${item.quantity}</td>
        <td style="padding:4px 8px;border-bottom:1px solid #eee;text-align:right">${formatPrice(item.unit_price)}</td>
        <td style="padding:4px 8px;border-bottom:1px solid #eee;text-align:right">${formatPrice(item.subtotal)}</td>
      </tr>`
    ).join('')
    const win = window.open('', '_blank', 'width=420,height=600')
    if (!win) return
    win.document.write(`<!DOCTYPE html><html><head><title>Pedido #${order.order_number || order.id.slice(0,8)}</title>
      <style>body{font-family:sans-serif;font-size:13px;padding:24px;color:#111}h2{margin:0 0 4px}hr{border:none;border-top:1px solid #ddd;margin:12px 0}table{width:100%;border-collapse:collapse}th{text-align:left;padding:4px 8px;border-bottom:2px solid #ddd;font-size:11px;color:#555}td{font-size:13px}tfoot td{font-weight:bold;padding-top:6px}</style>
    </head><body>
      <h2>Pedido #${order.order_number || order.id.slice(0,8)}</h2>
      <p style="margin:0;color:#555">${formatDate(order.created_at)} &nbsp;|&nbsp; Estado: <strong>${statusConf?.label || order.status}</strong></p>
      <hr/>
      <p style="margin:4px 0"><strong>Cliente:</strong> ${order.customer_name}</p>
      <p style="margin:4px 0"><strong>WhatsApp:</strong> ${order.customer_whatsapp}</p>
      ${order.customer_address ? `<p style="margin:4px 0"><strong>Dirección:</strong> ${order.customer_address}</p>` : ''}
      ${order.customer_notes ? `<p style="margin:4px 0"><strong>Nota:</strong> ${order.customer_notes}</p>` : ''}
      <hr/>
      <table>
        <thead><tr><th>Producto</th><th style="text-align:center">Cant.</th><th style="text-align:right">Precio</th><th style="text-align:right">Subtotal</th></tr></thead>
        <tbody>${itemsHtml}</tbody>
        <tfoot>
          <tr><td colspan="3" style="text-align:right;padding:4px 8px">Subtotal</td><td style="text-align:right;padding:4px 8px">${formatPrice(order.subtotal)}</td></tr>
          ${order.delivery_cost > 0 ? `<tr><td colspan="3" style="text-align:right;padding:4px 8px">Envío</td><td style="text-align:right;padding:4px 8px">${formatPrice(order.delivery_cost)}</td></tr>` : ''}
          <tr><td colspan="3" style="text-align:right;padding:4px 8px;font-size:15px">TOTAL</td><td style="text-align:right;padding:4px 8px;font-size:15px">${formatPrice(order.total)}</td></tr>
        </tfoot>
      </table>
    </body></html>`)
    win.document.close()
    win.focus()
    win.print()
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Pedidos</h1>

      {/* Filtros */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">Todos los estados</option>
            <option value="pending">Pendientes</option>
            <option value="confirmed">Confirmados</option>
            <option value="completed">Completados</option>
            <option value="cancelled">Cancelados</option>
          </select>

          <select
            value={dateFilter}
            onChange={(e) => { setDateFilter(e.target.value); setPage(1) }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Todas las fechas</option>
            <option value="today">Hoy</option>
            <option value="week">Esta semana</option>
            <option value="month">Este mes</option>
          </select>
        </div>
      </Card>

      {/* Tabla */}
      {/* Tabla con Skeleton o Datos */}
      {loading && orders.length === 0 ? (
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Nº Pedido</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Cliente</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 hidden sm:table-cell">WhatsApp</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Total</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Estado</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 hidden sm:table-cell">Fecha</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-4"><div className="h-4 w-16 bg-slate-100 rounded" /></td>
                    <td className="px-4 py-4"><div className="h-4 w-32 bg-slate-100 rounded" /></td>
                    <td className="px-4 py-4 hidden sm:table-cell"><div className="h-4 w-24 bg-slate-100 rounded" /></td>
                    <td className="px-4 py-4"><div className="h-4 w-20 bg-slate-100 rounded" /></td>
                    <td className="px-4 py-4"><div className="h-6 w-24 bg-slate-100 rounded-full" /></td>
                    <td className="px-4 py-4 hidden sm:table-cell"><div className="h-4 w-24 bg-slate-100 rounded" /></td>
                    <td className="px-4 py-4"><div className="h-8 w-8 bg-slate-50 rounded ml-auto" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : orders.length === 0 ? (
        <EmptyState
          icon={<ShoppingCart className="w-16 h-16" />}
          title="No hay pedidos"
          description="Cuando tus clientes hagan pedidos, aparecerán aquí"
        />
      ) : (
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Nº Pedido</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Cliente</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 hidden sm:table-cell">WhatsApp</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Total</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Estado</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 hidden sm:table-cell">Fecha</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((order) => {
                  const statusConf = orderStatusConfig[order.status]
                  return (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">#{order.order_number || order.id.slice(0, 8)}</td>
                      <td className="px-4 py-3 text-gray-900">{order.customer_name}</td>
                      <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{order.customer_whatsapp}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{formatPrice(order.total)}</td>
                      <td className="px-4 py-3">
                        <Badge color={statusConf?.color} bg={statusConf?.bg}>
                          {statusConf?.label || order.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{formatDate(order.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => handlePrint(order.id)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700"
                            title="Imprimir pedido"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <Link
                            to={`/orders/${order.id}`}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </Card>
      )}
    </div>
  )
}
