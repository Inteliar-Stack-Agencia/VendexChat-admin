import { useState, useEffect, useCallback } from 'react'
import { Landmark, Plus, ChevronLeft, ChevronRight, RefreshCw, Trash2, X, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button, Card } from '../../components/common'
import FeatureGuard from '../../components/FeatureGuard'
import { showToast } from '../../components/common/Toast'
import { cashApi, type CashSession, type CashSessionForm } from '../../services/cashApi'
import { formatPrice } from '../../utils/helpers'

const today = new Date().toISOString().split('T')[0]

const PM_LABELS: Record<string, string> = {
  efectivo: 'Efectivo',
  qr: 'QR / MercadoPago',
  transferencia: 'Transferencia',
  tarjeta: 'Tarjeta',
  other: 'Otros',
}

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function getDiffColor(diff: number) {
  if (diff === 0) return 'text-gray-500'
  return diff > 0 ? 'text-green-600' : 'text-red-600'
}

// ─── Cash Form Modal ──────────────────────────────────────────────────────────

interface CashFormProps {
  date: string
  session: CashSession | null
  onSave: (form: CashSessionForm) => Promise<void>
  onClose: () => void
}

function CashForm({ date, session, onSave, onClose }: CashFormProps) {
  const [saving, setSaving] = useState(false)
  const [loadingPOS, setLoadingPOS] = useState(false)
  const [form, setForm] = useState<CashSessionForm>({
    date,
    opening_cash: session?.opening_cash ?? 0,
    sales_efectivo: session?.sales_efectivo ?? 0,
    sales_qr: session?.sales_qr ?? 0,
    sales_transferencia: session?.sales_transferencia ?? 0,
    sales_tarjeta: session?.sales_tarjeta ?? 0,
    sales_other: session?.sales_other ?? 0,
    discounts: session?.discounts ?? 0,
    cash_out: session?.cash_out ?? 0,
    cash_out_notes: session?.cash_out_notes ?? '',
    closing_cash: session?.closing_cash ?? null,
    notes: session?.notes ?? '',
  })

  const set = (field: keyof CashSessionForm, val: unknown) =>
    setForm(prev => ({ ...prev, [field]: val }))

  const loadFromPOS = async () => {
    setLoadingPOS(true)
    try {
      const totals = await cashApi.getSalesByPaymentMethod(date)
      setForm(prev => ({
        ...prev,
        sales_efectivo: totals.efectivo,
        sales_qr: totals.qr,
        sales_transferencia: totals.transferencia,
        sales_tarjeta: totals.tarjeta,
        sales_other: totals.other,
        discounts: totals.discounts,
      }))
      showToast('success', 'Ventas del POS cargadas')
    } catch {
      showToast('error', 'Error al cargar ventas del POS')
    } finally {
      setLoadingPOS(false)
    }
  }

  const totalSales = form.sales_efectivo + form.sales_qr + form.sales_transferencia + form.sales_tarjeta + form.sales_other
  const expectedCash = form.opening_cash + form.sales_efectivo - form.cash_out
  const diff = form.closing_cash != null ? form.closing_cash - expectedCash : null

  const handleSubmit = async () => {
    setSaving(true)
    try {
      await onSave(form)
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const numInput = (label: string, field: keyof CashSessionForm, color = 'text-gray-700') => (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
        <input
          type="number" min="0" step="0.01"
          value={form[field] as number ?? ''}
          onChange={e => set(field, parseFloat(e.target.value) || 0)}
          className={`w-full border border-gray-200 rounded-lg pl-7 pr-3 py-2 text-sm font-bold ${color} focus:outline-none focus:ring-2 focus:ring-emerald-400`}
        />
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="font-bold text-gray-900">
              {session ? 'Editar cierre' : 'Nuevo cierre de caja'}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">{date}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-500" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Opening */}
          <div>
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Apertura</p>
            {numInput('Efectivo inicial en caja', 'opening_cash', 'text-teal-700')}
          </div>

          {/* Sales */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Ventas del día</p>
              <button
                type="button"
                onClick={loadFromPOS}
                disabled={loadingPOS}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${loadingPOS ? 'animate-spin' : ''}`} />
                Cargar desde POS
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {numInput('Efectivo', 'sales_efectivo', 'text-green-700')}
              {numInput('QR / MercadoPago', 'sales_qr', 'text-blue-700')}
              {numInput('Transferencia', 'sales_transferencia', 'text-purple-700')}
              {numInput('Tarjeta', 'sales_tarjeta', 'text-orange-700')}
              {numInput('Otros', 'sales_other')}
              {numInput('Descuentos aplicados', 'discounts', 'text-red-500')}
            </div>
            <div className="mt-2 bg-gray-50 rounded-lg px-3 py-2 flex justify-between">
              <span className="text-xs font-semibold text-gray-500">Total ventas</span>
              <span className="text-sm font-black text-gray-800">{formatPrice(totalSales)}</span>
            </div>
          </div>

          {/* Cash out */}
          <div>
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Egresos de caja</p>
            {numInput('Retiros / gastos pagados en efectivo', 'cash_out', 'text-red-600')}
            <div className="mt-2">
              <label className="block text-xs font-semibold text-gray-500 mb-1">Detalle de retiros (opcional)</label>
              <input
                type="text"
                placeholder="Ej: Mercadería, sueldo, etc."
                value={form.cash_out_notes ?? ''}
                onChange={e => set('cash_out_notes', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
          </div>

          {/* Closing */}
          <div>
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Cierre</p>
            <div className="bg-gray-50 rounded-xl p-3 mb-3 flex justify-between items-center">
              <span className="text-xs font-semibold text-gray-500">Efectivo esperado en caja</span>
              <span className="text-sm font-black text-teal-700">{formatPrice(expectedCash)}</span>
            </div>
            {numInput('Efectivo contado físicamente', 'closing_cash', 'text-teal-700')}
            {diff !== null && (
              <div className={`mt-2 rounded-lg px-3 py-2 flex items-center justify-between ${Math.abs(diff) < 0.01 ? 'bg-green-50' : 'bg-red-50'}`}>
                <span className={`text-xs font-semibold flex items-center gap-1 ${getDiffColor(diff)}`}>
                  {Math.abs(diff) < 0.01
                    ? <><CheckCircle2 className="w-3.5 h-3.5" /> Caja cuadrada</>
                    : <><AlertCircle className="w-3.5 h-3.5" /> {diff > 0 ? 'Sobrante' : 'Faltante'}</>
                  }
                </span>
                <span className={`text-sm font-black ${getDiffColor(diff)}`}>{diff >= 0 ? '+' : ''}{formatPrice(diff)}</span>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Notas (opcional)</label>
            <textarea
              rows={2}
              placeholder="Observaciones del día..."
              value={form.notes ?? ''}
              onChange={e => set('notes', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
        </div>

        <div className="flex gap-3 p-5 border-t border-gray-100 shrink-0">
          <Button variant="secondary" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button onClick={handleSubmit} loading={saving} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white">
            Guardar cierre
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CashRegisterPage() {
  const [sessions, setSessions] = useState<CashSession[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editSession, setEditSession] = useState<CashSession | null>(null)
  const [formDate, setFormDate] = useState(today)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Month navigation
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date()
    return { year: d.getFullYear(), month: d.getMonth() }
  })

  const monthStart = `${viewDate.year}-${String(viewDate.month + 1).padStart(2, '0')}-01`
  const monthEnd = new Date(viewDate.year, viewDate.month + 1, 0).toISOString().split('T')[0]

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await cashApi.list({ from: monthStart, to: monthEnd })
      setSessions(data)
    } catch {
      showToast('error', 'Error al cargar cierres de caja')
    } finally {
      setLoading(false)
    }
  }, [monthStart, monthEnd])

  useEffect(() => { load() }, [load])

  const openNew = () => {
    setEditSession(null)
    setFormDate(today)
    setShowForm(true)
  }

  const openEdit = (s: CashSession) => {
    setEditSession(s)
    setFormDate(s.date)
    setShowForm(true)
  }

  const handleSave = async (form: CashSessionForm) => {
    await cashApi.upsert(form)
    showToast('success', 'Cierre guardado')
    setShowForm(false)
    load()
  }

  const handleDelete = async (s: CashSession) => {
    if (!confirm(`¿Eliminar el cierre del ${s.date}?`)) return
    setDeleting(s.id)
    try {
      await cashApi.delete(s.id)
      showToast('success', 'Eliminado')
      load()
    } catch {
      showToast('error', 'Error al eliminar')
    } finally {
      setDeleting(null)
    }
  }

  const prevMonth = () => setViewDate(d => {
    const m = d.month === 0 ? 11 : d.month - 1
    const y = d.month === 0 ? d.year - 1 : d.year
    return { year: y, month: m }
  })
  const nextMonth = () => setViewDate(d => {
    const m = d.month === 11 ? 0 : d.month + 1
    const y = d.month === 11 ? d.year + 1 : d.year
    return { year: y, month: m }
  })

  // Monthly summary
  const totalSales = sessions.reduce((s, c) =>
    s + c.sales_efectivo + c.sales_qr + c.sales_transferencia + c.sales_tarjeta + c.sales_other, 0)
  const totalEfectivo = sessions.reduce((s, c) => s + c.sales_efectivo, 0)
  const totalQR = sessions.reduce((s, c) => s + c.sales_qr, 0)
  const totalTransf = sessions.reduce((s, c) => s + c.sales_transferencia, 0)
  const totalCashOut = sessions.reduce((s, c) => s + c.cash_out, 0)
  const totalDiffs = sessions
    .filter(c => c.closing_cash != null)
    .reduce((s, c) => {
      const expected = c.opening_cash + c.sales_efectivo - c.cash_out
      return s + (c.closing_cash! - expected)
    }, 0)

  return (
    <FeatureGuard feature="expenses" minPlan="pro">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
              <Landmark className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900">Caja</h1>
              <p className="text-sm text-gray-400">Apertura y cierre diario · control de efectivo</p>
            </div>
          </div>
          <Button onClick={openNew} className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2">
            <Plus className="w-4 h-4" /> Nuevo cierre
          </Button>
        </div>

        {/* Month nav */}
        <div className="flex items-center justify-between">
          <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronLeft className="w-5 h-5 text-gray-500" />
          </button>
          <span className="text-sm font-bold text-gray-700">
            {MONTHS[viewDate.month]} {viewDate.year}
          </span>
          <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronRight className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Summary banners */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="text-center py-3">
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total ventas</p>
            <p className="text-lg font-black text-gray-800">{formatPrice(totalSales)}</p>
          </Card>
          <Card className="text-center py-3">
            <p className="text-[9px] font-bold text-green-500 uppercase tracking-widest mb-1">Efectivo</p>
            <p className="text-lg font-black text-green-700">{formatPrice(totalEfectivo)}</p>
          </Card>
          <Card className="text-center py-3">
            <p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest mb-1">QR / MP</p>
            <p className="text-lg font-black text-blue-700">{formatPrice(totalQR)}</p>
          </Card>
          <Card className="text-center py-3">
            <p className="text-[9px] font-bold text-purple-500 uppercase tracking-widest mb-1">Transferencia</p>
            <p className="text-lg font-black text-purple-700">{formatPrice(totalTransf)}</p>
          </Card>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Card className="text-center py-3">
            <p className="text-[9px] font-bold text-red-400 uppercase tracking-widest mb-1">Retiros / gastos</p>
            <p className="text-lg font-black text-red-600">{formatPrice(totalCashOut)}</p>
          </Card>
          <Card className={`text-center py-3 ${Math.abs(totalDiffs) < 1 ? '' : totalDiffs > 0 ? 'bg-green-50' : 'bg-red-50'}`}>
            <p className={`text-[9px] font-bold uppercase tracking-widest mb-1 ${Math.abs(totalDiffs) < 1 ? 'text-gray-400' : totalDiffs > 0 ? 'text-green-600' : 'text-red-500'}`}>
              Diferencia acumulada
            </p>
            <p className={`text-lg font-black ${getDiffColor(totalDiffs)}`}>
              {totalDiffs >= 0 ? '+' : ''}{formatPrice(totalDiffs)}
            </p>
          </Card>
        </div>

        {/* Sessions list */}
        {loading ? (
          <div className="flex justify-center py-12">
            <RefreshCw className="w-6 h-6 text-gray-300 animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <Card className="text-center py-12 text-gray-400">
            <Landmark className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-semibold">Sin cierres este mes</p>
            <p className="text-xs mt-1">Hacé clic en "Nuevo cierre" para registrar el primer día</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {sessions.map(s => {
              const totalDay = s.sales_efectivo + s.sales_qr + s.sales_transferencia + s.sales_tarjeta + s.sales_other
              const expected = s.opening_cash + s.sales_efectivo - s.cash_out
              const diff = s.closing_cash != null ? s.closing_cash - expected : null
              const [, mm, dd] = s.date.split('-')
              return (
                <div
                  key={s.id}
                  onClick={() => openEdit(s)}
                  className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 px-4 py-3 hover:border-emerald-200 hover:shadow-sm cursor-pointer transition-all"
                >
                  {/* Date badge */}
                  <div className="w-10 text-center shrink-0">
                    <div className="text-[10px] font-bold text-gray-400 uppercase">{MONTHS[parseInt(mm) - 1].slice(0, 3)}</div>
                    <div className="text-xl font-black text-gray-800 leading-none">{dd}</div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs">
                      <span className="text-gray-800 font-semibold">Total {formatPrice(totalDay)}</span>
                      {s.sales_efectivo > 0 && <span className="text-green-600">Ef. {formatPrice(s.sales_efectivo)}</span>}
                      {s.sales_qr > 0 && <span className="text-blue-600">QR {formatPrice(s.sales_qr)}</span>}
                      {s.sales_transferencia > 0 && <span className="text-purple-600">Tr. {formatPrice(s.sales_transferencia)}</span>}
                      {s.cash_out > 0 && <span className="text-red-500">Ret. {formatPrice(s.cash_out)}</span>}
                    </div>
                    {diff !== null && (
                      <div className={`text-xs font-semibold mt-0.5 flex items-center gap-1 ${getDiffColor(diff)}`}>
                        {Math.abs(diff) < 0.01
                          ? <><CheckCircle2 className="w-3 h-3" /> Caja cuadrada</>
                          : <><AlertCircle className="w-3 h-3" /> {diff > 0 ? `Sobrante ${formatPrice(diff)}` : `Faltante ${formatPrice(Math.abs(diff))}`}</>
                        }
                      </div>
                    )}
                    {s.notes && <p className="text-[11px] text-gray-400 mt-0.5 truncate">{s.notes}</p>}
                  </div>

                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(s) }}
                    disabled={deleting === s.id}
                    className="p-1.5 text-gray-300 hover:text-red-500 shrink-0 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* Payment method breakdown */}
        {sessions.length > 0 && (
          <Card>
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Desglose por método de pago</h3>
            <div className="space-y-2">
              {[
                { label: PM_LABELS.efectivo, value: totalEfectivo, color: 'bg-green-500' },
                { label: PM_LABELS.qr, value: totalQR, color: 'bg-blue-500' },
                { label: PM_LABELS.transferencia, value: totalTransf, color: 'bg-purple-500' },
                { label: PM_LABELS.tarjeta, value: sessions.reduce((s, c) => s + c.sales_tarjeta, 0), color: 'bg-orange-400' },
              ].filter(r => r.value > 0).map(row => (
                <div key={row.label} className="flex items-center gap-3">
                  <span className="text-xs text-gray-600 w-36 shrink-0">{row.label}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div
                      className={`${row.color} h-2 rounded-full`}
                      style={{ width: `${totalSales > 0 ? (row.value / totalSales) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-gray-700 w-24 text-right">{formatPrice(row.value)}</span>
                  <span className="text-[10px] text-gray-400 w-10 text-right">
                    {totalSales > 0 ? `${Math.round((row.value / totalSales) * 100)}%` : '—'}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {showForm && (
        <CashForm
          date={formDate}
          session={editSession}
          onSave={handleSave}
          onClose={() => setShowForm(false)}
        />
      )}
    </FeatureGuard>
  )
}
