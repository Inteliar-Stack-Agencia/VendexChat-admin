import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Eye, ShoppingCart, Printer, Archive, ArchiveRestore, Trash2 } from 'lucide-react'
import { Card, Badge, EmptyState, Pagination, Button, ConfirmDialog, showToast } from '../../components/common'
import { ordersApi } from '../../services/api'
import { getStoreId } from '../../services/coreApi'
import { supabase } from '../../supabaseClient'
import { Order } from '../../types'
import { formatPrice, formatDate, orderStatusConfig } from '../../utils/helpers'
import { useAuth } from '../../contexts/AuthContext'

type PendingAction = {
  kind: 'archive' | 'delete'
  ids: string[]
  archiveValue?: boolean
} | null

export default function OrdersPage() {
  useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('')
  const [archiveFilter, setArchiveFilter] = useState<'active' | 'archived' | 'all'>('active')
  const [deliveryFilter, setDeliveryFilter] = useState<'all' | 'delivery' | 'pickup'>('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([])
  const [pendingAction, setPendingAction] = useState<PendingAction>(null)
  const [processingAction, setProcessingAction] = useState(false)

  const isArchived = (order: Order) => Boolean((order.metadata as Record<string, unknown> | null)?.archived)


  const getDeliveryType = (order: Order): 'delivery' | 'pickup' => {
    const metadata = (order.metadata || {}) as Record<string, unknown>
    const metadataDelivery = metadata.delivery_type
    if (metadataDelivery === 'delivery' || metadataDelivery === 'pickup') {
      return metadataDelivery
    }
    return order.customer_address ? 'delivery' : 'pickup'
  }

  const loadOrders = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string | number> = { page, limit: 20 }
      if (statusFilter !== 'all') params.status = statusFilter

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
      showToast('error', 'Error cargando pedidos')
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, dateFilter])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  // Realtime: recargar pedidos cuando llega uno nuevo desde la tienda
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  useEffect(() => {
    let active = true
    getStoreId().then((storeId) => {
      if (!active) return
      const channel = supabase
        .channel(`orders-store-${storeId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `store_id=eq.${storeId}`,
        }, () => {
          loadOrders()
          showToast('success', '🛒 ¡Nuevo pedido recibido!')
        })
        .subscribe()
      channelRef.current = channel
    }).catch(() => { /* sin sesión activa, sin suscripción */ })

    return () => {
      active = false
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [loadOrders])

  const filteredOrders = useMemo(() => {
    const archiveScoped = archiveFilter === 'all'
      ? orders
      : archiveFilter === 'archived'
        ? orders.filter(isArchived)
        : orders.filter(order => !isArchived(order))

    if (deliveryFilter === 'all') return archiveScoped
    return archiveScoped.filter(order => getDeliveryType(order) === deliveryFilter)
  }, [orders, archiveFilter, deliveryFilter])

  useEffect(() => {
    setSelectedOrderIds([])
  }, [orders, archiveFilter, deliveryFilter, page])

  const allVisibleSelected = filteredOrders.length > 0 && filteredOrders.every(order => selectedOrderIds.includes(order.id))

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedOrderIds([])
      return
    }
    setSelectedOrderIds(filteredOrders.map(order => order.id))
  }

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrderIds(prev => prev.includes(orderId)
      ? prev.filter(id => id !== orderId)
      : [...prev, orderId])
  }

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
    win.document.write(`<!DOCTYPE html><html><head><title>Pedido #${order.order_number || order.id.slice(0, 8)}</title>
      <style>body{font-family:sans-serif;font-size:13px;padding:24px;color:#111}h2{margin:0 0 4px}hr{border:none;border-top:1px solid #ddd;margin:12px 0}table{width:100%;border-collapse:collapse}th{text-align:left;padding:4px 8px;border-bottom:2px solid #ddd;font-size:11px;color:#555}td{font-size:13px}tfoot td{font-weight:bold;padding-top:6px}</style>
    </head><body>
      <h2>Pedido #${order.order_number || order.id.slice(0, 8)}</h2>
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

  const openArchiveAction = (ids: string[], archiveValue: boolean) => {
    if (ids.length === 0) return
    setPendingAction({ kind: 'archive', ids, archiveValue })
  }

  const openDeleteAction = (ids: string[]) => {
    if (ids.length === 0) return
    setPendingAction({ kind: 'delete', ids })
  }

  const runPendingAction = async () => {
    if (!pendingAction) return
    setProcessingAction(true)
    try {
      if (pendingAction.kind === 'archive') {
        for (const id of pendingAction.ids) {
          const order = orders.find(o => o.id === id)
          const metadata = (order?.metadata || {}) as Record<string, unknown>
          await ordersApi.updateMetadata(id, {
            ...metadata,
            archived: Boolean(pendingAction.archiveValue),
            archived_at: pendingAction.archiveValue ? new Date().toISOString() : null,
          })
        }
        showToast('success', pendingAction.archiveValue ? 'Pedidos archivados' : 'Pedidos desarchivados')
      } else {
        await Promise.all(pendingAction.ids.map(id => ordersApi.remove(id)))
        showToast('success', 'Pedidos eliminados definitivamente')
      }

      setPendingAction(null)
      setSelectedOrderIds([])
      await loadOrders()
    } catch (err) {
      console.error(err)
      showToast('error', 'No se pudo completar la acción')
    } finally {
      setProcessingAction(false)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Pedidos</h1>

      <Card>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
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

            <select
              value={archiveFilter}
              onChange={(e) => setArchiveFilter(e.target.value as 'active' | 'archived' | 'all')}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="active">Activos</option>
              <option value="archived">Archivados</option>
              <option value="all">Todos</option>
            </select>

            <div className="flex items-center gap-1 p-1 rounded-lg border border-gray-200 bg-gray-50">
              <button
                type="button"
                onClick={() => setDeliveryFilter('all')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${deliveryFilter === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setDeliveryFilter('delivery')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${deliveryFilter === 'delivery' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Envío a domicilio
              </button>
              <button
                type="button"
                onClick={() => setDeliveryFilter('pickup')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${deliveryFilter === 'pickup' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Retiro en local
              </button>
            </div>
          </div>

          <p className="text-xs text-gray-500">Archivados temporales se guardan en metadata.archived.</p>
        </div>
      </Card>

      {selectedOrderIds.length > 0 && (
        <Card>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-sm font-medium text-gray-700">{selectedOrderIds.length} pedidos seleccionados</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => openArchiveAction(selectedOrderIds, true)}>
                <Archive className="w-5 h-5" /> Archivar seleccionados
              </Button>
              <Button variant="outline" onClick={() => openArchiveAction(selectedOrderIds, false)}>
                <ArchiveRestore className="w-5 h-5" /> Desarchivar
              </Button>
              <Button variant="danger" onClick={() => openDeleteAction(selectedOrderIds)}>
                <Trash2 className="w-5 h-5" /> Eliminar definitivo
              </Button>
            </div>
          </div>
        </Card>
      )}

      {loading && orders.length === 0 ? (
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3" />
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
                    <td className="px-4 py-4"><div className="h-4 w-4 bg-slate-100 rounded" /></td>
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
      ) : filteredOrders.length === 0 ? (
        <EmptyState
          icon={<ShoppingCart className="w-16 h-16" />}
          title="No hay pedidos"
          description={archiveFilter === 'archived'
            ? 'No hay pedidos archivados en esta vista.'
            : 'Cuando tus clientes hagan pedidos, aparecerán aquí'}
        />
      ) : (
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleSelectAllVisible}
                      className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      title="Seleccionar visibles"
                    />
                  </th>
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
                {filteredOrders.map((order) => {
                  const statusConf = orderStatusConfig[order.status]
                  const archived = isArchived(order)
                  return (
                    <tr key={order.id} className={`hover:bg-gray-50 ${archived ? 'opacity-75' : ''}`}>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedOrderIds.includes(order.id)}
                          onChange={() => toggleOrderSelection(order.id)}
                          className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">#{order.order_number || order.id.slice(0, 8)}</td>
                      <td className="px-4 py-3 text-gray-900">
                        <div className="flex flex-col">
                          <span>{order.customer_name}</span>
                          {(() => {
                            const company = ((order.metadata || {}) as Record<string, unknown>).company_name as string | undefined
                            return company ? (
                              <span className="text-[10px] text-blue-600 font-semibold flex items-center gap-1 mt-0.5">
                                🏢 {company}
                              </span>
                            ) : null
                          })()}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{order.customer_whatsapp}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{formatPrice(order.total)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Badge color={statusConf?.color} bg={statusConf?.bg}>
                            {statusConf?.label || order.status}
                          </Badge>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600">{getDeliveryType(order) === 'delivery' ? 'Delivery' : 'Retiro'}</span>
                          {archived && <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">Archivado</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{formatDate(order.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => openArchiveAction([order.id], !archived)}
                            className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-800 border border-slate-200"
                            title={archived ? 'Desarchivar pedido' : 'Archivar pedido'}
                          >
                            {archived ? <ArchiveRestore className="w-5 h-5" /> : <Archive className="w-5 h-5" />}
                          </button>
                          <button
                            onClick={() => openDeleteAction([order.id])}
                            className="p-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 border border-rose-100"
                            title="Eliminar definitivamente"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handlePrint(order.id)}
                            className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-800 border border-slate-200"
                            title="Imprimir pedido"
                          >
                            <Printer className="w-5 h-5" />
                          </button>
                          <Link
                            to={`/orders/${order.id}`}
                            className="p-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 hover:text-indigo-700 border border-indigo-100"
                          >
                            <Eye className="w-5 h-5" />
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

      <ConfirmDialog
        isOpen={!!pendingAction}
        onClose={() => setPendingAction(null)}
        onConfirm={runPendingAction}
        loading={processingAction}
        title={pendingAction?.kind === 'delete' ? 'Eliminar pedidos definitivamente' : (pendingAction?.archiveValue ? 'Archivar pedidos' : 'Desarchivar pedidos')}
        message={pendingAction?.kind === 'delete'
          ? `Se eliminarán ${pendingAction?.ids.length ?? 0} pedido(s) de forma permanente. Esta acción no se puede deshacer.`
          : pendingAction?.archiveValue
            ? `Se archivarán ${pendingAction?.ids.length ?? 0} pedido(s). Quedarán ocultos en la vista Activos y visibles en Archivados.`
            : `Se desarchivarán ${pendingAction?.ids.length ?? 0} pedido(s) y volverán a la vista Activos.`}
        confirmText={pendingAction?.kind === 'delete' ? 'Eliminar' : 'Confirmar'}
        confirmVariant={pendingAction?.kind === 'delete' ? 'danger' : 'primary'}
      />
    </div>
  )
}
