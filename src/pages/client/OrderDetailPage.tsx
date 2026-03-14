import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, MessageCircle, Printer, ClipboardCheck } from 'lucide-react'
import { Card, Badge, Button, LoadingSpinner, Select } from '../../components/common'
import { showToast } from '../../components/common/Toast'
import { ordersApi } from '../../services/api'
import { Order, OrderStatus, Tenant } from '../../types'
import { formatPrice, formatDate, orderStatusConfig, whatsappLink } from '../../utils/helpers'
import { tenantApi } from '../../services/api'

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [order, setOrder] = useState<Order | null>(null)
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [loading, setLoading] = useState(true)
  const [newStatus, setNewStatus] = useState<string>('')
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [deliveryType, setDeliveryType] = useState<'delivery' | 'pickup'>('pickup')
  const [fulfillmentDone, setFulfillmentDone] = useState(false)
  const [paymentDone, setPaymentDone] = useState(false)
  const [savingChecklist, setSavingChecklist] = useState(false)

  useEffect(() => {
    if (id) {
      setLoading(true)
      Promise.all([
        ordersApi.get(id),
        tenantApi.getMe()
      ])
        .then(([orderData, tenantData]) => {
          setOrder(orderData)
          setTenant(tenantData)
          setNewStatus(orderData.status)
          const metadata = (orderData.metadata || {}) as Record<string, unknown>
          const metaDeliveryType = metadata.delivery_type === 'delivery' || metadata.delivery_type === 'pickup'
            ? (metadata.delivery_type as 'delivery' | 'pickup')
            : undefined
          const inferredDeliveryType = metaDeliveryType || (orderData.customer_address ? 'delivery' : 'pickup')
          setDeliveryType(inferredDeliveryType)
          setFulfillmentDone(Boolean(metadata.fulfillment_done) || orderData.status === 'completed')
          setPaymentDone((metadata.payment_status as string | undefined) === 'paid')
        })
        .catch((err) => {
          console.error(err)
          showToast('error', 'Error al cargar los datos')
          navigate('/orders')
        })
        .finally(() => setLoading(false))
    }
  }, [id, navigate])

  const handleStatusUpdate = async () => {
    if (!order || !newStatus || newStatus === order.status) return
    setUpdatingStatus(true)
    try {
      const updated = await ordersApi.updateStatus(order.id, newStatus as OrderStatus)
      setOrder(updated)
      showToast('success', 'Estado actualizado')
    } catch {
      showToast('error', 'Error al actualizar el estado')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleChecklistSave = async () => {
    if (!order) return
    setSavingChecklist(true)
    try {
      const mergedMetadata = {
        ...(order.metadata || {}),
        delivery_type: deliveryType,
        fulfillment_done: fulfillmentDone,
        fulfillment_status: fulfillmentDone ? 'completed' : 'pending',
        payment_status: paymentDone ? 'paid' : 'pending',
      }
      const updatedMetadataOrder = await ordersApi.updateMetadata(order.id, mergedMetadata)

      // Si se marca como completado en checklist, sincronizamos automáticamente el estado del pedido
      if (fulfillmentDone && updatedMetadataOrder.status !== 'completed') {
        const updatedStatusOrder = await ordersApi.updateStatus(updatedMetadataOrder.id, 'completed')
        setOrder(updatedStatusOrder)
        setNewStatus('completed')
        showToast('success', 'Checklist guardado y estado actualizado a Completado')
        return
      }

      setOrder(updatedMetadataOrder)
      if (!fulfillmentDone && newStatus === 'completed') {
        setNewStatus(updatedMetadataOrder.status)
      }
      showToast('success', 'Checklist guardado')
    } catch {
      showToast('error', 'No se pudo guardar el checklist')
    } finally {
      setSavingChecklist(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading) return <LoadingSpinner text="Cargando pedido..." />
  if (!order) return null

  const statusConf = orderStatusConfig[order.status]
  const printerSettings = ((tenant?.metadata?.printer ?? {}) as { width?: string; header?: string; footer?: string; show_order_number?: boolean })

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Estilos para impresión de comanda térmica */}
      <style>
        {`
        @media print {
          body * {
            visibility: hidden;
          }
          #thermal-ticket, #thermal-ticket * {
            visibility: visible;
          }
          #thermal-ticket {
            position: absolute;
            left: 0;
            top: 0;
            width: ${printerSettings.width || '80mm'};
            padding: 0;
            margin: 0;
          }
        }
        `}
      </style>

      {/* Ticket Térmico (Invisible en pantalla) */}
      <div id="thermal-ticket" className="hidden print:block font-mono text-[11px] leading-tight text-black p-4 bg-white">
        <div className="text-center border-b border-dashed border-gray-400 pb-2 mb-2">
          <p className="font-bold text-sm uppercase">{tenant?.name}</p>
          <p>{formatDate(order.created_at)}</p>
        </div>

        {printerSettings.header && (
          <div className="text-center mb-2 italic">
            {printerSettings.header}
          </div>
        )}

        {printerSettings.show_order_number !== false && (
          <div className="text-center py-2 border-b border-dashed border-gray-400 mb-2">
            <p className="text-[10px] uppercase font-bold">Pedido</p>
            <p className="text-2xl font-black">#{order.order_number}</p>
          </div>
        )}

        <div className="mb-2">
          <p className="font-bold uppercase mb-1">Cliente:</p>
          <p>{order.customer_name}</p>
          <p>{order.customer_whatsapp}</p>
          {(order.metadata?.company_name as string | undefined) && <p>Empresa: {order.metadata?.company_name as string}</p>}
        </div>

        <div className="mb-2 border-t border-dashed border-gray-400 pt-2">
          <p className="font-bold uppercase mb-1">Detalles:</p>
          <p>Tipo: {order.customer_address ? 'Envío' : 'Retiro'}</p>
          {order.customer_address && <p>DIR: {order.customer_address}</p>}
          <p>Pago: {(order.metadata?.payment_method as string | undefined) || 'Consultar'}</p>
        </div>

        <div className="border-t border-dashed border-gray-400 py-2 mb-2">
          {order.items?.map((item, i) => (
            <div key={i} className="flex justify-between mb-1">
              <span>{item.quantity}x {item.product_name}</span>
              <span>{formatPrice(item.subtotal)}</span>
            </div>
          ))}
        </div>

        <div className="border-t border-dashed border-gray-400 pt-1 font-bold">
          {order.delivery_cost > 0 && (
            <div className="flex justify-between">
              <span>Delivery</span>
              <span>{formatPrice(order.delivery_cost)}</span>
            </div>
          )}
          <div className="flex justify-between text-base mt-1">
            <span>TOTAL</span>
            <span>{formatPrice(order.total)}</span>
          </div>
        </div>

        {printerSettings.footer && (
          <div className="text-center mt-4 border-t border-dashed border-gray-400 pt-2">
            {printerSettings.footer}
          </div>
        )}
      </div>

      {/* Contenido Normal (Screen) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/orders')} className="p-2 rounded-lg hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pedido #{order.order_number || order.id.slice(0, 8)}</h1>
            <p className="text-sm text-gray-500">{formatDate(order.created_at)}</p>
          </div>
        </div>
        <Badge color={statusConf?.color} bg={statusConf?.bg}>
          {statusConf?.label || order.status}
        </Badge>
      </div>

      {/* Info del cliente */}
      <Card>
        <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Información del cliente</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-500">Nombre:</span>
            <span className="ml-2 font-medium text-gray-900">{order.customer_name}</span>
          </div>
          {(order.metadata?.company_name as string | undefined) && (
            <div>
              <span className="text-gray-500">Empresa:</span>
              <span className="ml-2 font-medium text-gray-900">{order.metadata?.company_name as string}</span>
            </div>
          )}
          <div>
            <span className="text-gray-500">WhatsApp:</span>
            <a
              href={whatsappLink(order.customer_whatsapp)}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 text-emerald-600 hover:underline font-medium"
            >
              {order.customer_whatsapp}
            </a>
          </div>
          {order.customer_address && (
            <div className="sm:col-span-2">
              <span className="text-gray-500">Dirección:</span>
              <span className="ml-2 text-gray-900">{order.customer_address}</span>
            </div>
          )}
          {order.customer_notes && (
            <div className="sm:col-span-2">
              <span className="text-gray-500">Notas:</span>
              <span className="ml-2 text-gray-900">{order.customer_notes}</span>
            </div>
          )}
        </div>
      </Card>

      {/* Productos del pedido */}
      <Card padding={false}>
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-500 uppercase">Productos</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-2 font-medium text-gray-500">Producto</th>
              <th className="text-center px-4 py-2 font-medium text-gray-500">Cant.</th>
              <th className="text-right px-4 py-2 font-medium text-gray-500">P. Unit.</th>
              <th className="text-right px-4 py-2 font-medium text-gray-500">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {order.items?.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3 text-gray-900">{item.product_name}</td>
                <td className="px-4 py-3 text-center text-gray-600">{item.quantity}</td>
                <td className="px-4 py-3 text-right text-gray-600">{formatPrice(item.unit_price)}</td>
                <td className="px-4 py-3 text-right font-medium text-gray-900">{formatPrice(item.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totales */}
        <div className="border-t border-gray-200 p-4 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Subtotal</span>
            <span className="text-gray-900">{formatPrice(order.subtotal)}</span>
          </div>
          {order.delivery_cost > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">Delivery</span>
              <span className="text-gray-900">{formatPrice(order.delivery_cost)}</span>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t border-gray-200 font-semibold text-base">
            <span className="text-gray-900">Total</span>
            <span className="text-emerald-600">{formatPrice(order.total)}</span>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Guía rápida de estados</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="p-3 rounded-xl border border-amber-100 bg-amber-50">
            <p className="font-semibold text-amber-800 mb-1">Pendiente</p>
            <p className="text-amber-700">Pedido recibido, todavía sin validar disponibilidad/pago.</p>
          </div>
          <div className="p-3 rounded-xl border border-blue-100 bg-blue-50">
            <p className="font-semibold text-blue-800 mb-1">Confirmado</p>
            <p className="text-blue-700">Pedido aceptado por la tienda y en preparación/logística.</p>
          </div>
          <div className="p-3 rounded-xl border border-emerald-100 bg-emerald-50">
            <p className="font-semibold text-emerald-800 mb-1">Completado</p>
            <p className="text-emerald-700">Pedido entregado o retirado por cliente y finalizado.</p>
          </div>
          <div className="p-3 rounded-xl border border-rose-100 bg-rose-50">
            <p className="font-semibold text-rose-800 mb-1">Cancelado</p>
            <p className="text-rose-700">Pedido anulado por tienda o cliente.</p>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-2 mb-3">
          <ClipboardCheck className="w-4 h-4 text-indigo-600" />
          <h2 className="text-sm font-semibold text-gray-500 uppercase">Checklist operativo</h2>
        </div>

        <div className="space-y-3 text-sm">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Tipo de entrega</label>
            <Select
              value={deliveryType}
              onChange={(e) => setDeliveryType(e.target.value as 'delivery' | 'pickup')}
              options={[
                { value: 'pickup', label: 'Retiro en tienda' },
                { value: 'delivery', label: 'Envío a domicilio' },
              ]}
            />
          </div>

          <label className="flex items-center gap-2 p-3 rounded-lg border border-gray-200 bg-gray-50">
            <input
              type="checkbox"
              checked={fulfillmentDone}
              onChange={(e) => {
                const checked = e.target.checked
                setFulfillmentDone(checked)
                if (checked) setNewStatus('completed')
              }}
              className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-gray-700">Pedido completado ({deliveryType === 'delivery' ? 'entregado' : 'retirado'})</span>
          </label>

          <label className="flex items-center gap-2 p-3 rounded-lg border border-gray-200 bg-gray-50">
            <input
              type="checkbox"
              checked={paymentDone}
              onChange={(e) => setPaymentDone(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-gray-700">Pago confirmado</span>
          </label>
        </div>

        <div className="mt-4 flex justify-end">
          <Button onClick={handleChecklistSave} loading={savingChecklist}>Guardar checklist</Button>
        </div>
      </Card>

      {/* Cambiar estado */}
      <Card>
        <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Actualizar estado</h2>
        <div className="flex gap-3">
          <Select
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            options={[
              { value: 'pending', label: 'Pendiente' },
              { value: 'confirmed', label: 'Confirmado' },
              { value: 'completed', label: 'Completado' },
              { value: 'cancelled', label: 'Cancelado' },
            ]}
            className="flex-1"
          />
          <Button
            onClick={handleStatusUpdate}
            loading={updatingStatus}
            disabled={newStatus === order.status}
          >
            Actualizar
          </Button>
        </div>
      </Card>

      {/* Acciones */}
      <div className="flex flex-wrap gap-3">
        <a
          href={whatsappLink(order.customer_whatsapp, `Hola ${order.customer_name}, sobre tu pedido #${order.order_number}...`)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          Abrir en WhatsApp
        </a>
        <Button variant="secondary" onClick={handlePrint}>
          <Printer className="w-4 h-4" />
          Imprimir pedido
        </Button>
      </div>
    </div>
  )
}
