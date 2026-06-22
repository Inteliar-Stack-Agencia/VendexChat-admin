import { useState, useEffect, useCallback } from 'react'
import {
  PackageCheck, Plus, Trash2, X, Loader2, RefreshCw,
  TrendingUp, TrendingDown, ChevronDown, ChevronUp, CalendarDays,
} from 'lucide-react'
import { Card, Button } from '../../components/common'
import FeatureGuard from '../../components/FeatureGuard'
import { inventoryApi, type InventoryEntry, type InventoryDayInput } from '../../services/inventoryApi'
import { formatPrice } from '../../utils/helpers'
import { showToast } from '../../components/common/Toast'

const today = new Date().toISOString().split('T')[0]

const DEFAULT_LINES = ['Viandas', 'Panchos', 'Café', 'Bebidas']

const PM_LABEL: Record<string, string> = {
  efectivo: 'Efectivo',
  mercadopago: 'Mercado Pago',
  transferencia: 'Transferencia',
  tarjeta: 'Tarjeta',
}

// ─── Day Input Form ──────────────────────────────────────────────────────────

interface DayFormProps {
  onSave: (date: string, inputs: InventoryDayInput[]) => Promise<void>
  onClose: () => void
}

function DayInputForm({ onSave, onClose }: DayFormProps) {
  const [saving, setSaving] = useState(false)
  const [date, setDate] = useState(today)
  const [rows, setRows] = useState<InventoryDayInput[]>(
    DEFAULT_LINES.map((line) => ({ product_line: line, cost: 0 }))
  )

  const updateRow = (i: number, field: keyof InventoryDayInput, value: string | number) => {
    setRows((prev) => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r))
  }

  const addRow = () => setRows((prev) => [...prev, { product_line: '', cost: 0 }])
  const removeRow = (i: number) => setRows((prev) => prev.filter((_, idx) => idx !== i))

  const total = rows.reduce((s, r) => s + (Number(r.cost) || 0), 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const valid = rows.filter((r) => r.product_line.trim() && Number(r.cost) > 0)
    if (valid.length === 0) {
      showToast('error', 'Ingresá al menos un rubro con costo')
      return
    }
    setSaving(true)
    try {
      await onSave(date, valid)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="font-bold text-gray-900">Registrar Insumos del Día</h2>
            <p className="text-xs text-gray-400 mt-0.5">Se crean gastos automáticamente en Materia Prima</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Fecha</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Rubros</label>
                <button
                  type="button"
                  onClick={addRow}
                  className="flex items-center gap-1 text-xs text-teal-600 font-semibold hover:text-teal-700"
                >
                  <Plus className="w-3 h-3" /> Agregar rubro
                </button>
              </div>

              <div className="space-y-2">
                {rows.map((row, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder="Rubro (ej: Viandas)"
                      value={row.product_line}
                      onChange={(e) => updateRow(i, 'product_line', e.target.value)}
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
                    />
                    <div className="relative w-36 shrink-0">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0"
                        value={row.cost || ''}
                        onChange={(e) => updateRow(i, 'cost', parseFloat(e.target.value) || 0)}
                        className="w-full border border-gray-200 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeRow(i)}
                      className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-teal-50 rounded-xl p-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-teal-700">Total insumos</span>
              <span className="text-lg font-black text-teal-700">{formatPrice(total)}</span>
            </div>
          </div>

          <div className="flex gap-3 p-6 border-t border-gray-100 shrink-0">
            <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="flex-1 bg-teal-600 hover:bg-teal-700 text-white" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Registrar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Day Summary Card ─────────────────────────────────────────────────────────

interface DaySummaryProps {
  date: string
}

function DaySummaryCard({ date }: DaySummaryProps) {
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof inventoryApi.getDaySummary>> | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    inventoryApi.getDaySummary(date).then(setSummary).catch(console.error).finally(() => setLoading(false))
  }, [date])

  if (loading) return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 flex justify-center">
      <RefreshCw className="w-5 h-5 text-gray-300 animate-spin" />
    </div>
  )

  if (!summary) return null

  const marginColor = summary.margin >= 0 ? 'text-emerald-600' : 'text-red-500'

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-teal-50 rounded-xl flex items-center justify-center">
            <CalendarDays className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-gray-800">
              {new Date(date + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <p className="text-xs text-gray-400">{summary.orderCount} ventas · {summary.entries.length} rubros cargados</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">Margen</p>
            <p className={`text-base font-black ${marginColor}`}>{formatPrice(summary.margin)}</p>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-5 py-4 space-y-4">
          {/* Revenue vs Cost */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-emerald-50 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Ingresos</p>
              </div>
              <p className="text-xl font-black text-emerald-700">{formatPrice(summary.totalRevenue)}</p>
            </div>
            <div className="bg-red-50 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Insumos</p>
              </div>
              <p className="text-xl font-black text-red-600">{formatPrice(summary.totalInputCost)}</p>
            </div>
          </div>

          {/* By payment method */}
          {summary.totalRevenue > 0 && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Ingresos por método</p>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(summary.byPayment).filter(([, v]) => v > 0).map(([key, val]) => (
                  <div key={key} className="flex justify-between items-center bg-gray-50 rounded-lg px-3 py-2">
                    <span className="text-xs text-gray-600 font-medium">{PM_LABEL[key] || key}</span>
                    <span className="text-xs font-black text-gray-800">{formatPrice(val)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Input lines */}
          {summary.entries.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Insumos cargados</p>
              <div className="space-y-1.5">
                {summary.entries.map((e, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">{e.product_line}</span>
                    <span className="text-sm font-semibold text-gray-800">{formatPrice(Number(e.cost))}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function InventoryPage() {
  const [entries, setEntries] = useState<InventoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Unique dates with entries
  const [days, setDays] = useState<string[]>([])

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await inventoryApi.listEntries({ from: thirtyDaysAgo })
      setEntries(data)
      const uniqueDays = [...new Set(data.map((e) => e.date))].sort((a, b) => b.localeCompare(a))
      setDays(uniqueDays)
    } catch {
      showToast('error', 'Error al cargar inventario')
    } finally {
      setLoading(false)
    }
  }, [thirtyDaysAgo])

  useEffect(() => { load() }, [load])

  const handleSave = async (date: string, inputs: InventoryDayInput[]) => {
    await inventoryApi.registerDayInputs(date, inputs)
    showToast('success', 'Insumos registrados y gastos creados automáticamente')
    setShowForm(false)
    load()
  }

  const handleDelete = async (entry: InventoryEntry) => {
    if (!confirm(`¿Eliminar "${entry.product_line}"? También se eliminará el gasto asociado.`)) return
    setDeletingId(entry.id)
    try {
      await inventoryApi.deleteEntry(entry.id, entry.expense_id)
      showToast('success', 'Registro eliminado')
      load()
    } catch {
      showToast('error', 'Error al eliminar')
    } finally {
      setDeletingId(null)
    }
  }

  // Today's entries
  const todayEntries = entries.filter((e) => e.date === today)
  const todayCost = todayEntries.reduce((s, e) => s + Number(e.cost), 0)

  return (
    <FeatureGuard feature="pnl" minPlan="vip">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center">
              <PackageCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900">Inventario</h1>
              <p className="text-sm text-gray-400">Control diario de insumos y cierre</p>
            </div>
          </div>
          <Button
            onClick={() => setShowForm(true)}
            className="bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Cargar insumos
          </Button>
        </div>

        {/* Today summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="flex items-center gap-4">
            <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center shrink-0">
              <TrendingDown className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Insumos hoy</p>
              <p className="text-2xl font-black text-gray-900">{formatPrice(todayCost)}</p>
              <p className="text-xs text-gray-400">{todayEntries.length} rubro{todayEntries.length !== 1 ? 's' : ''} cargado{todayEntries.length !== 1 ? 's' : ''}</p>
            </div>
          </Card>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-4 cursor-pointer hover:bg-gray-50 transition-colors bg-white rounded-2xl p-4 border border-gray-100 w-full text-left">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center shrink-0">
              <Plus className="w-6 h-6 text-gray-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-600">Registrar insumos del día</p>
              <p className="text-xs text-gray-400">Crea los gastos automáticamente</p>
            </div>
          </button>
        </div>

        {/* History by day */}
        <div>
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">Historial (últimos 30 días)</h2>
          {loading ? (
            <div className="flex justify-center py-12">
              <RefreshCw className="w-6 h-6 text-gray-300 animate-spin" />
            </div>
          ) : days.length === 0 ? (
            <Card className="text-center py-12">
              <PackageCheck className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 font-medium text-sm">Sin registros todavía</p>
              <p className="text-gray-300 text-xs mt-1">Cargá los insumos de hoy para empezar</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {days.map((day) => (
                <div key={day}>
                  <DaySummaryCard date={day} />
                  {/* Individual entries for deletion */}
                  <div className="mt-1 pl-2 space-y-1">
                    {entries.filter((e) => e.date === day).map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between px-4 py-1.5 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 font-medium">{entry.product_line}</span>
                          <span className="text-xs font-bold text-gray-700">{formatPrice(Number(entry.cost))}</span>
                          {entry.expense_id && (
                            <span className="text-[9px] bg-teal-100 text-teal-600 px-1.5 py-0.5 rounded font-semibold">gasto creado</span>
                          )}
                        </div>
                        <button
                          onClick={() => handleDelete(entry)}
                          disabled={deletingId === entry.id}
                          className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                        >
                          {deletingId === entry.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Trash2 className="w-3.5 h-3.5" />
                          }
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {showForm && <DayInputForm onSave={handleSave} onClose={() => setShowForm(false)} />}
      </div>
    </FeatureGuard>
  )
}
