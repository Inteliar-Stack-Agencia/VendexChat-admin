import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Printer } from 'lucide-react'
import { tenantApi } from '../../../services/tenantApi'
import { supabase } from '../../../supabaseClient'
import { showToast } from '../../../components/common/Toast'
import { formatPrice } from '../../../utils/helpers'
import type { CashSession } from '../../../services/cashApi'

const PM_ROWS: { label: string; field: keyof CashSession }[] = [
  { label: 'Efectivo', field: 'sales_efectivo' },
  { label: 'QR / MercadoPago', field: 'sales_qr' },
  { label: 'Transferencia', field: 'sales_transferencia' },
  { label: 'Tarjeta', field: 'sales_tarjeta' },
  { label: 'Otros', field: 'sales_other' },
]

function formatDateLong(date: string) {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
}

// Folio corto y estable a partir del id del cierre, para que el documento sea
// identificable y rastreable en el sistema (ej. si el seguro pide verificarlo).
function folioFromId(id: string) {
  return id.replace(/-/g, '').slice(0, 8).toUpperCase()
}

interface CashReportPrintProps {
  session: CashSession
  onClose: () => void
}

// Arqueo de caja imprimible (estilo Z/X) para enviar a terceros (ej. seguro).
// Se arma como vista aparte en vez de PDF generado: "Guardar como PDF" del diálogo
// de impresión del navegador ya resuelve eso sin sumar una librería de PDF.
export default function CashReportPrint({ session, onClose }: CashReportPrintProps) {
  const [storeName, setStoreName] = useState('')
  const [storeAddress, setStoreAddress] = useState('')
  const [storeContact, setStoreContact] = useState('')
  const [generatedByEmail, setGeneratedByEmail] = useState('')

  useEffect(() => {
    tenantApi.getMe()
      .then(t => {
        setStoreName(t.name)
        setStoreAddress(t.address || '')
        setStoreContact([t.email, t.whatsapp].filter(Boolean).join(' · '))
      })
      .catch(() => showToast('error', 'No se pudo cargar el nombre de la tienda'))
    supabase.auth.getUser()
      .then(({ data }) => setGeneratedByEmail(data.user?.email || ''))
      .catch(() => {})
  }, [])

  const totalSales = session.sales_efectivo + session.sales_qr + session.sales_transferencia + session.sales_tarjeta + session.sales_other
  const expectedCash = session.opening_cash + session.sales_efectivo - session.cash_out
  const diff = session.closing_cash != null ? session.closing_cash - expectedCash : null
  const generatedAt = new Date().toLocaleString('es-AR')
  const savedAt = new Date(session.updated_at).toLocaleString('es-AR')
  const folio = folioFromId(session.id)

  return createPortal(
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 print:p-0 print:bg-white">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto print:rounded-none print:shadow-none print:max-h-none print:max-w-none">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 print:hidden">
          <h2 className="font-bold text-gray-900">Reporte de arqueo de caja</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold"
            >
              <Printer className="w-4 h-4" /> Descargar / Imprimir
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-8 print:p-6">
          <div className="flex items-center justify-between text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-4">
            <span>Generado con VendexChat</span>
            <span>N° {folio}</span>
          </div>

          <div className="text-center mb-6">
            <h1 className="text-lg font-black text-gray-900">{storeName || 'Tienda'}</h1>
            {storeAddress && <p className="text-xs text-gray-500">{storeAddress}</p>}
            {storeContact && <p className="text-xs text-gray-400">{storeContact}</p>}
            <p className="text-sm font-bold text-gray-700 mt-3">ARQUEO DE CAJA</p>
            <p className="text-base font-black text-gray-900 capitalize">{formatDateLong(session.date)}</p>
          </div>

          <table className="w-full text-sm mb-4">
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-1.5 text-gray-500">Apertura (efectivo inicial)</td>
                <td className="py-1.5 text-right font-semibold text-gray-800">{formatPrice(session.opening_cash)}</td>
              </tr>
            </tbody>
          </table>

          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Ventas por medio de pago</p>
          <table className="w-full text-sm mb-2">
            <tbody>
              {PM_ROWS.filter(r => (session[r.field] as number) > 0).map(r => (
                <tr key={r.field} className="border-b border-gray-50">
                  <td className="py-1.5 text-gray-600">{r.label}</td>
                  <td className="py-1.5 text-right text-gray-800">{formatPrice(session[r.field] as number)}</td>
                </tr>
              ))}
              {session.discounts > 0 && (
                <tr className="border-b border-gray-50">
                  <td className="py-1.5 text-gray-600">Descuentos aplicados</td>
                  <td className="py-1.5 text-right text-red-600">-{formatPrice(session.discounts)}</td>
                </tr>
              )}
              <tr className="border-t-2 border-gray-200">
                <td className="py-2 font-bold text-gray-900">Total ventas del día</td>
                <td className="py-2 text-right font-black text-gray-900">{formatPrice(totalSales)}</td>
              </tr>
            </tbody>
          </table>

          {session.cash_out > 0 && (
            <table className="w-full text-sm mb-4">
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-1.5 text-gray-600">
                    Retiros / gastos en efectivo
                    {session.cash_out_notes && <span className="text-gray-400"> ({session.cash_out_notes})</span>}
                  </td>
                  <td className="py-1.5 text-right text-red-600">-{formatPrice(session.cash_out)}</td>
                </tr>
              </tbody>
            </table>
          )}

          <table className="w-full text-sm mb-4">
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-1.5 text-gray-500">Efectivo esperado en caja</td>
                <td className="py-1.5 text-right font-semibold text-gray-800">{formatPrice(expectedCash)}</td>
              </tr>
              {session.closing_cash != null && (
                <tr className="border-b border-gray-100">
                  <td className="py-1.5 text-gray-500">Efectivo contado físicamente</td>
                  <td className="py-1.5 text-right font-semibold text-gray-800">{formatPrice(session.closing_cash)}</td>
                </tr>
              )}
              {diff !== null && (
                <tr>
                  <td className="py-2 font-bold text-gray-900">
                    {Math.abs(diff) < 0.01 ? 'Caja cuadrada' : diff > 0 ? 'Sobrante' : 'Faltante'}
                  </td>
                  <td className={`py-2 text-right font-black ${Math.abs(diff) < 0.01 ? 'text-gray-700' : diff > 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {diff >= 0 ? '+' : ''}{formatPrice(diff)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {session.notes && (
            <div className="mb-4">
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Observaciones</p>
              <p className="text-sm text-gray-700">{session.notes}</p>
            </div>
          )}

          <div className="mt-8 pt-3 border-t border-gray-100 text-[10px] text-gray-400 space-y-0.5">
            <p>Cierre de caja guardado en el sistema el {savedAt}.</p>
            <p>Reporte generado el {generatedAt}{generatedByEmail && ` por ${generatedByEmail}`}.</p>
            <p>Documento N° {folio} · VendexChat · vendexchat.app</p>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
