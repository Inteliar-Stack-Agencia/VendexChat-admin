import { useState, useEffect, useCallback, useRef } from 'react'
import {
  PackageCheck, Plus, Trash2, X, Loader2, RefreshCw,
  TrendingUp, TrendingDown, ChevronDown, ChevronUp, CalendarDays, Link2,
  ArrowDownCircle, ArrowUpCircle, ChevronLeft, ChevronRight, TableProperties,
} from 'lucide-react'
import { Card, Button } from '../../components/common'
import FeatureGuard from '../../components/FeatureGuard'
import {
  inventoryApi,
  type InventoryEntry,
  type InventoryDayInput,
  type InventoryEgressInput,
  type EgressReason,
  EGRESS_REASON_LABEL,
} from '../../services/inventoryApi'
import { productionApi } from '../../services/productionApi'
import { productsApi } from '../../services/productsApi'
import { formatPrice } from '../../utils/helpers'
import { showToast } from '../../components/common/Toast'
import type { Product } from '../../types'

const today = new Date().toISOString().split('T')[0]

const PM_LABEL: Record<string, string> = {
  efectivo: 'Efectivo',
  mercadopago: 'Mercado Pago',
  transferencia: 'Transferencia',
  tarjeta: 'Tarjeta',
}

const DAY_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

// Returns Monday of the week containing `date`
function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function toISO(date: Date) {
  return date.toISOString().split('T')[0]
}

// ─── Row / Egress data types ──────────────────────────────────────────────────

interface RowData {
  product_line: string
  product_id: string
  quantity: string
  unit_cost: string
  cost: string
  useProductLink: boolean
}

interface EgressRowData {
  product_line: string
  product_id: string
  quantity: string
  cost: string
  reason: EgressReason
  notes: string
  useProductLink: boolean
}

const emptyRow = (): RowData => ({
  product_line: '', product_id: '', quantity: '', unit_cost: '', cost: '', useProductLink: false,
})

const emptyEgressRow = (): EgressRowData => ({
  product_line: '', product_id: '', quantity: '', cost: '', reason: 'merma', notes: '', useProductLink: false,
})

// ─── Day Input Form (Ingresos) ────────────────────────────────────────────────

interface DayFormProps {
  products: Product[]
  onSave: (date: string, inputs: InventoryDayInput[]) => Promise<void>
  onClose: () => void
}

function DayInputForm({ products, onSave, onClose }: DayFormProps) {
  const [saving, setSaving] = useState(false)
  const [date, setDate] = useState(today)
  const [rows, setRows] = useState<RowData[]>([emptyRow()])

  const updateRow = (i: number, patch: Partial<RowData>) => {
    setRows((prev) => prev.map((r, idx) => {
      if (idx !== i) return r
      const updated = { ...r, ...patch }
      if (patch.product_id !== undefined) {
        const p = products.find((p) => p.id === patch.product_id)
        if (p) updated.product_line = p.name
      }
      const qty = parseFloat(updated.quantity) || 0
      const uc = parseFloat(updated.unit_cost) || 0
      if (qty > 0 && uc > 0) updated.cost = String(qty * uc)
      return updated
    }))
  }

  const addRow = () => setRows((prev) => [...prev, emptyRow()])
  const removeRow = (i: number) => setRows((prev) => prev.filter((_, idx) => idx !== i))
  const total = rows.reduce((s, r) => s + (parseFloat(r.cost) || 0), 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const valid = rows.filter((r) => r.product_line.trim() && parseFloat(r.cost) > 0)
    if (valid.length === 0) { showToast('error', 'Ingresá al menos un rubro con costo'); return }
    setSaving(true)
    try {
      await onSave(date, valid.map((r) => ({
        product_line: r.product_line,
        product_id: r.product_id || null,
        quantity: parseFloat(r.quantity) || undefined,
        unit_cost: parseFloat(r.unit_cost) || undefined,
        cost: parseFloat(r.cost),
      })))
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-teal-50 rounded-xl flex items-center justify-center">
              <ArrowDownCircle className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Registrar Ingresos del Día</h2>
              <p className="text-xs text-gray-400 mt-0.5">Insumos comprados · actualiza stock automáticamente</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-500" /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Fecha</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Rubros</label>
                <button type="button" onClick={addRow} className="flex items-center gap-1 text-xs text-teal-600 font-semibold hover:text-teal-700">
                  <Plus className="w-3 h-3" /> Agregar rubro
                </button>
              </div>
              <div className="space-y-3">
                {rows.map((row, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-3 space-y-2">
                    <div className="flex gap-2 items-center">
                      {row.useProductLink ? (
                        <select value={row.product_id} onChange={(e) => updateRow(i, { product_id: e.target.value })}
                          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-300">
                          <option value="">Seleccioná un producto...</option>
                          {products.map((p) => <option key={p.id} value={p.id}>{p.name}{p.stock != null ? ` (stock: ${p.stock})` : ''}</option>)}
                        </select>
                      ) : (
                        <input type="text" placeholder="Rubro (ej: Viandas, Panchos)" value={row.product_line}
                          onChange={(e) => updateRow(i, { product_line: e.target.value })}
                          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-300" />
                      )}
                      <button type="button" onClick={() => updateRow(i, { useProductLink: !row.useProductLink, product_id: '', product_line: '' })}
                        className={`p-2 rounded-lg border transition-colors shrink-0 ${row.useProductLink ? 'border-teal-400 bg-teal-50 text-teal-600' : 'border-gray-200 text-gray-400 hover:border-teal-300 hover:text-teal-500'}`}>
                        <Link2 className="w-4 h-4" />
                      </button>
                      <button type="button" onClick={() => removeRow(i)} className="p-2 text-gray-300 hover:text-red-500 shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Cantidad</label>
                        <input type="number" min="0" placeholder="0" value={row.quantity} onChange={(e) => updateRow(i, { quantity: e.target.value })}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-300" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Costo unitario</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                          <input type="number" min="0" step="0.01" placeholder="0" value={row.unit_cost} onChange={(e) => updateRow(i, { unit_cost: e.target.value })}
                            className="w-full border border-gray-200 rounded-lg pl-7 pr-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-300" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Total</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                          <input type="number" min="0" step="0.01" placeholder="0" value={row.cost} onChange={(e) => updateRow(i, { cost: e.target.value })}
                            className="w-full border border-gray-200 rounded-lg pl-7 pr-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-300" />
                        </div>
                      </div>
                    </div>
                    {row.useProductLink && row.product_id && row.quantity && (
                      <p className="text-[10px] text-teal-600 font-semibold">✓ Se agregarán {row.quantity} unidades al stock</p>
                    )}
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
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Registrar ingresos'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Day Egress Form ──────────────────────────────────────────────────────────

interface EgressFormProps {
  products: Product[]
  onSave: (date: string, egresses: InventoryEgressInput[]) => Promise<void>
  onClose: () => void
}

function DayEgressForm({ products, onSave, onClose }: EgressFormProps) {
  const [saving, setSaving] = useState(false)
  const [date, setDate] = useState(today)
  const [rows, setRows] = useState<EgressRowData[]>([emptyEgressRow()])

  const updateRow = (i: number, patch: Partial<EgressRowData>) => {
    setRows((prev) => prev.map((r, idx) => {
      if (idx !== i) return r
      const updated = { ...r, ...patch }
      if (patch.product_id !== undefined) {
        const p = products.find((p) => p.id === patch.product_id)
        if (p) updated.product_line = p.name
      }
      return updated
    }))
  }

  const addRow = () => setRows((prev) => [...prev, emptyEgressRow()])
  const removeRow = (i: number) => setRows((prev) => prev.filter((_, idx) => idx !== i))
  const total = rows.reduce((s, r) => s + (parseFloat(r.cost) || 0), 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const valid = rows.filter((r) => r.product_line.trim() && parseFloat(r.cost) > 0)
    if (valid.length === 0) { showToast('error', 'Ingresá al menos un rubro con costo'); return }
    setSaving(true)
    try {
      await onSave(date, valid.map((r) => ({
        product_line: r.product_line,
        product_id: r.product_id || null,
        quantity: parseFloat(r.quantity) || undefined,
        cost: parseFloat(r.cost),
        reason: r.reason,
        notes: r.notes || undefined,
      })))
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-orange-50 rounded-xl flex items-center justify-center">
              <ArrowUpCircle className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Registrar Egresos del Día</h2>
              <p className="text-xs text-gray-400 mt-0.5">Merma, consumo interno, devoluciones · descuenta stock</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Fecha</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Rubros</label>
                <button type="button" onClick={addRow} className="flex items-center gap-1 text-xs text-orange-500 font-semibold hover:text-orange-600">
                  <Plus className="w-3 h-3" /> Agregar rubro
                </button>
              </div>
              <div className="space-y-3">
                {rows.map((row, i) => (
                  <div key={i} className="bg-orange-50/50 rounded-xl p-3 space-y-2 border border-orange-100">
                    <div className="flex gap-2">
                      <select value={row.reason} onChange={(e) => updateRow(i, { reason: e.target.value as EgressReason })}
                        className="border border-orange-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-300 shrink-0">
                        {(Object.keys(EGRESS_REASON_LABEL) as EgressReason[]).map((r) => (
                          <option key={r} value={r}>{EGRESS_REASON_LABEL[r]}</option>
                        ))}
                      </select>
                      <button type="button" onClick={() => removeRow(i)} className="p-2 text-gray-300 hover:text-red-500 shrink-0 ml-auto">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex gap-2 items-center">
                      {row.useProductLink ? (
                        <select value={row.product_id} onChange={(e) => updateRow(i, { product_id: e.target.value })}
                          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-300">
                          <option value="">Seleccioná un producto...</option>
                          {products.map((p) => <option key={p.id} value={p.id}>{p.name}{p.stock != null ? ` (stock: ${p.stock})` : ''}</option>)}
                        </select>
                      ) : (
                        <input type="text" placeholder="Producto o rubro" value={row.product_line} onChange={(e) => updateRow(i, { product_line: e.target.value })}
                          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-300" />
                      )}
                      <button type="button" onClick={() => updateRow(i, { useProductLink: !row.useProductLink, product_id: '', product_line: '' })}
                        className={`p-2 rounded-lg border transition-colors shrink-0 ${row.useProductLink ? 'border-orange-400 bg-orange-50 text-orange-500' : 'border-gray-200 text-gray-400 hover:border-orange-300 hover:text-orange-400'}`}>
                        <Link2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Cantidad</label>
                        <input type="number" min="0" placeholder="0" value={row.quantity} onChange={(e) => updateRow(i, { quantity: e.target.value })}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-300" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Costo / valor</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                          <input type="number" min="0" step="0.01" placeholder="0" value={row.cost} onChange={(e) => updateRow(i, { cost: e.target.value })}
                            className="w-full border border-gray-200 rounded-lg pl-7 pr-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-300" />
                        </div>
                      </div>
                    </div>
                    <input type="text" placeholder="Notas (opcional)" value={row.notes} onChange={(e) => updateRow(i, { notes: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-300" />
                    {row.useProductLink && row.product_id && row.quantity && (
                      <p className="text-[10px] text-orange-500 font-semibold">⚠ Se descontarán {row.quantity} unidades del stock</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-orange-50 rounded-xl p-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-orange-600">Total egresos</span>
              <span className="text-lg font-black text-orange-600">{formatPrice(total)}</span>
            </div>
          </div>
          <div className="flex gap-3 p-6 border-t border-gray-100 shrink-0">
            <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="flex-1 bg-orange-500 hover:bg-orange-600 text-white" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Registrar egresos'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Day Summary Card ─────────────────────────────────────────────────────────

function DaySummaryCard({ date }: { date: string }) {
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof inventoryApi.getDaySummary>> | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    inventoryApi.getDaySummary(date).then(setSummary).catch(console.error).finally(() => setLoading(false))
  }, [date])

  if (loading) return <div className="bg-white rounded-2xl p-4 border border-gray-100 flex justify-center"><RefreshCw className="w-5 h-5 text-gray-300 animate-spin" /></div>
  if (!summary) return null

  const ingresos = summary.entries.filter((e) => e.movement_type !== 'egreso')
  const egresos = summary.entries.filter((e) => e.movement_type === 'egreso')
  const marginColor = summary.margin >= 0 ? 'text-emerald-600' : 'text-red-500'

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <button onClick={() => setExpanded(!expanded)} className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-teal-50 rounded-xl flex items-center justify-center">
            <CalendarDays className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-gray-800">
              {new Date(date + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <p className="text-xs text-gray-400">{summary.orderCount} ventas · {ingresos.length} ingresos · {egresos.length} egresos</p>
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
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-emerald-50 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1"><TrendingUp className="w-3.5 h-3.5 text-emerald-600" /><p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Ventas</p></div>
              <p className="text-lg font-black text-emerald-700">{formatPrice(summary.totalRevenue)}</p>
            </div>
            <div className="bg-teal-50 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1"><ArrowDownCircle className="w-3.5 h-3.5 text-teal-600" /><p className="text-[10px] font-bold text-teal-600 uppercase tracking-widest">Insumos</p></div>
              <p className="text-lg font-black text-teal-700">{formatPrice(summary.totalInputCost)}</p>
            </div>
            <div className="bg-orange-50 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1"><ArrowUpCircle className="w-3.5 h-3.5 text-orange-500" /><p className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">Egresos</p></div>
              <p className="text-lg font-black text-orange-600">{formatPrice(summary.totalEgressCost)}</p>
            </div>
          </div>
          {summary.totalRevenue > 0 && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Ventas por método</p>
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
        </div>
      )}
    </div>
  )
}

// ─── Production Grid ──────────────────────────────────────────────────────────

function ProductionGrid({ products }: { products: Product[] }) {
  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(new Date()))
  const [weekData, setWeekData] = useState<Awaited<ReturnType<typeof productionApi.getWeekData>> | null>(null)
  const [loading, setLoading] = useState(true)
  // pending[productId][date] = qty string being edited
  const [pending, setPending] = useState<Record<string, Record<string, string>>>({})
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const weekStartISO = toISO(weekStart)
  const weekEndISO = toISO(weekDays[6])

  const weekLabel = `${weekStart.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })} – ${weekDays[6].toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}`

  const load = useCallback(async () => {
    setLoading(true)
    setPending({})
    try {
      const data = await productionApi.getWeekData(weekStartISO, weekEndISO)
      setWeekData(data)
    } catch {
      showToast('error', 'Error al cargar producción')
    } finally {
      setLoading(false)
    }
  }, [weekStartISO, weekEndISO])

  useEffect(() => { load() }, [load])

  const getProduction = (productId: string, date: string): number =>
    weekData?.production[productId]?.[date] ?? 0

  const getSales = (productId: string, date: string) =>
    weekData?.sales[productId]?.[date] ?? { qty: 0, revenue: 0 }

  const getPendingVal = (productId: string, date: string): string => {
    if (pending[productId]?.[date] !== undefined) return pending[productId][date]
    const v = getProduction(productId, date)
    return v === 0 ? '' : String(v)
  }

  const handleCellChange = (productId: string, date: string, val: string) => {
    setPending((prev) => ({
      ...prev,
      [productId]: { ...(prev[productId] || {}), [date]: val },
    }))

    // debounce auto-save 800ms
    const key = `${productId}__${date}`
    clearTimeout(saveTimers.current[key])
    saveTimers.current[key] = setTimeout(async () => {
      const qty = parseInt(val) || 0
      try {
        if (qty > 0) {
          await productionApi.upsertEntry(date, productId, qty)
        } else {
          await productionApi.deleteEntry(date, productId)
        }
        // refresh silently
        const data = await productionApi.getWeekData(weekStartISO, weekEndISO)
        setWeekData(data)
      } catch {
        showToast('error', 'Error al guardar')
      }
    }, 800)
  }

  // Totals per product
  const productTotals = (productId: string) => {
    let produced = 0, sold = 0, revenue = 0
    for (const day of weekDays) {
      const d = toISO(day)
      const pv = pending[productId]?.[d]
      produced += pv !== undefined ? (parseInt(pv) || 0) : getProduction(productId, d)
      const s = getSales(productId, d)
      sold += s.qty
      revenue += s.revenue
    }
    const stockFinal = produced - sold
    return { produced, sold, revenue, stockFinal }
  }

  // Grand totals
  const grandTotals = products.reduce(
    (acc, p) => {
      const t = productTotals(p.id)
      acc.produced += t.produced
      acc.sold += t.sold
      acc.revenue += t.revenue
      return acc
    },
    { produced: 0, sold: 0, revenue: 0 },
  )

  const activeProducts = products.filter((p) => p.is_active)

  return (
    <div className="space-y-4">
      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <button onClick={() => setWeekStart(addDays(weekStart, -7))} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ChevronLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div className="text-center">
          <p className="text-sm font-bold text-gray-800">{weekLabel}</p>
          <p className="text-xs text-gray-400">Semana de producción</p>
        </div>
        <button onClick={() => setWeekStart(addDays(weekStart, 7))} disabled={weekStartISO >= toISO(getWeekStart(new Date()))} className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-30">
          <ChevronRight className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Grand totals banner */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-teal-50 rounded-xl p-3 text-center">
          <p className="text-[10px] font-bold text-teal-500 uppercase tracking-widest mb-1">Total producido</p>
          <p className="text-2xl font-black text-teal-700">{grandTotals.produced}</p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-3 text-center">
          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Total vendido</p>
          <p className="text-2xl font-black text-emerald-700">{grandTotals.sold}</p>
        </div>
        <div className="bg-indigo-50 rounded-xl p-3 text-center">
          <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-1">Recaudación</p>
          <p className="text-xl font-black text-indigo-700">{formatPrice(grandTotals.revenue)}</p>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-12"><RefreshCw className="w-6 h-6 text-gray-300 animate-spin" /></div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 font-bold text-gray-500 uppercase tracking-wider min-w-[180px] sticky left-0 bg-gray-50 z-10">Producto</th>
                <th className="text-center px-2 py-3 font-bold text-gray-400 uppercase tracking-wider min-w-[40px]">Precio</th>
                {weekDays.map((day) => {
                  const iso = toISO(day)
                  const isToday = iso === today
                  return (
                    <th key={iso} className={`text-center px-1 py-3 min-w-[80px] ${isToday ? 'text-teal-600' : 'text-gray-400'}`}>
                      <div className="font-bold uppercase tracking-wider">{DAY_SHORT[day.getDay()]}</div>
                      <div className={`text-[10px] font-normal ${isToday ? 'text-teal-400' : 'text-gray-300'}`}>{day.getDate()}/{day.getMonth() + 1}</div>
                    </th>
                  )
                })}
                <th className="text-center px-2 py-3 font-bold text-teal-500 uppercase tracking-wider min-w-[70px]">Prod.</th>
                <th className="text-center px-2 py-3 font-bold text-emerald-600 uppercase tracking-wider min-w-[70px]">Vendido</th>
                <th className="text-center px-2 py-3 font-bold text-gray-500 uppercase tracking-wider min-w-[70px]">Stock fin.</th>
                <th className="text-center px-2 py-3 font-bold text-indigo-500 uppercase tracking-wider min-w-[90px]">$$$$$</th>
              </tr>
            </thead>
            <tbody>
              {activeProducts.map((product, rowIdx) => {
                const totals = productTotals(product.id)
                const stockColor = totals.stockFinal < 0 ? 'text-red-500' : totals.stockFinal === 0 ? 'text-emerald-600' : 'text-amber-500'
                return (
                  <tr key={product.id} className={`border-b border-gray-50 ${rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                    <td className={`px-4 py-2 font-medium text-gray-700 sticky left-0 z-10 ${rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                      {product.name}
                    </td>
                    <td className="px-2 py-2 text-center text-gray-400 font-medium">{formatPrice(product.price)}</td>
                    {weekDays.map((day) => {
                      const iso = toISO(day)
                      const sales = getSales(product.id, iso)
                      const prodVal = getPendingVal(product.id, iso)
                      const isToday = iso === today
                      return (
                        <td key={iso} className={`px-1 py-1 ${isToday ? 'bg-teal-50/30' : ''}`}>
                          <div className="flex flex-col items-center gap-0.5">
                            <input
                              type="number"
                              min="0"
                              value={prodVal}
                              onChange={(e) => handleCellChange(product.id, iso, e.target.value)}
                              placeholder="—"
                              className="w-14 text-center border border-gray-200 rounded-lg px-1 py-1 text-sm font-bold text-teal-700 focus:outline-none focus:ring-1 focus:ring-teal-400 focus:border-teal-400 bg-white"
                            />
                            {sales.qty > 0 && (
                              <span className="text-[10px] text-emerald-600 font-semibold">-{sales.qty} vtas</span>
                            )}
                          </div>
                        </td>
                      )
                    })}
                    <td className="px-2 py-2 text-center font-black text-teal-600">{totals.produced || '—'}</td>
                    <td className="px-2 py-2 text-center font-black text-emerald-600">{totals.sold || '—'}</td>
                    <td className={`px-2 py-2 text-center font-black ${stockColor}`}>{totals.stockFinal}</td>
                    <td className="px-2 py-2 text-center font-bold text-indigo-600">{totals.revenue > 0 ? formatPrice(totals.revenue) : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 border-t-2 border-gray-200">
                <td className="px-4 py-3 font-black text-gray-700 sticky left-0 bg-gray-100 z-10">TOTALES</td>
                <td />
                {weekDays.map((day) => {
                  const iso = toISO(day)
                  const dayProd = activeProducts.reduce((s, p) => {
                    const pv = pending[p.id]?.[iso]
                    return s + (pv !== undefined ? (parseInt(pv) || 0) : getProduction(p.id, iso))
                  }, 0)
                  const daySold = activeProducts.reduce((s, p) => s + getSales(p.id, iso).qty, 0)
                  return (
                    <td key={iso} className="px-1 py-3 text-center">
                      <div className="text-xs font-black text-teal-600">{dayProd || '—'}</div>
                      {daySold > 0 && <div className="text-[10px] text-emerald-600 font-semibold">-{daySold}</div>}
                    </td>
                  )
                })}
                <td className="px-2 py-3 text-center font-black text-teal-600">{grandTotals.produced}</td>
                <td className="px-2 py-3 text-center font-black text-emerald-600">{grandTotals.sold}</td>
                <td className="px-2 py-3 text-center font-black text-gray-700">{grandTotals.produced - grandTotals.sold}</td>
                <td className="px-2 py-3 text-center font-black text-indigo-600">{formatPrice(grandTotals.revenue)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <p className="text-[10px] text-gray-400 text-center">
        Editá las celdas de producción directamente · se guarda automáticamente · las ventas se toman del POS
      </p>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = 'produccion' | 'costos'

export default function InventoryPage() {
  const [tab, setTab] = useState<Tab>('produccion')
  const [entries, setEntries] = useState<InventoryEntry[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showEgressForm, setShowEgressForm] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [days, setDays] = useState<string[]>([])

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [data, productsRes] = await Promise.all([
        inventoryApi.listEntries({ from: thirtyDaysAgo }),
        productsApi.list({ limit: 500 }),
      ])
      setEntries(data)
      setProducts(productsRes.data.filter((p) => p.is_active))
      const uniqueDays = [...new Set(data.map((e) => e.date))].sort((a, b) => b.localeCompare(a))
      setDays(uniqueDays)
    } catch {
      showToast('error', 'Error al cargar inventario')
    } finally {
      setLoading(false)
    }
  }, [thirtyDaysAgo])

  useEffect(() => { load() }, [load])

  const handleSaveInputs = async (date: string, inputs: InventoryDayInput[]) => {
    await inventoryApi.registerDayInputs(date, inputs)
    showToast('success', 'Ingresos registrados · stock y gastos actualizados')
    setShowForm(false)
    load()
  }

  const handleSaveEgresses = async (date: string, egresses: InventoryEgressInput[]) => {
    await inventoryApi.registerDayEgresses(date, egresses)
    showToast('success', 'Egresos registrados · stock descontado')
    setShowEgressForm(false)
    load()
  }

  const handleDelete = async (entry: InventoryEntry) => {
    const isEgreso = entry.movement_type === 'egreso'
    const stockMsg = entry.product_id && entry.quantity
      ? isEgreso ? ' y se revertirá el stock descontado' : ' y se revertirá el stock agregado'
      : ''
    if (!confirm(`¿Eliminar "${entry.product_line}"? También se eliminará el gasto asociado${stockMsg}.`)) return
    setDeletingId(entry.id)
    try {
      await inventoryApi.deleteEntry(entry.id, entry.expense_id, entry.product_id, entry.quantity, entry.movement_type || 'ingreso')
      showToast('success', 'Registro eliminado')
      load()
    } catch {
      showToast('error', 'Error al eliminar')
    } finally {
      setDeletingId(null)
    }
  }

  const todayEntries = entries.filter((e) => e.date === today)
  const todayIngresos = todayEntries.filter((e) => e.movement_type !== 'egreso')
  const todayEgresos = todayEntries.filter((e) => e.movement_type === 'egreso')
  const todayInputCost = todayIngresos.reduce((s, e) => s + Number(e.cost), 0)
  const todayEgressCost = todayEgresos.reduce((s, e) => s + Number(e.cost), 0)

  return (
    <FeatureGuard feature="pnl" minPlan="vip">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center">
              <PackageCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900">Inventario</h1>
              <p className="text-sm text-gray-400">Producción diaria · ingresos y egresos de stock</p>
            </div>
          </div>
          {tab === 'costos' && (
            <div className="flex gap-2">
              <Button onClick={() => setShowEgressForm(true)} className="bg-orange-500 hover:bg-orange-600 text-white flex items-center gap-2">
                <ArrowUpCircle className="w-4 h-4" /> Egreso
              </Button>
              <Button onClick={() => setShowForm(true)} className="bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-2">
                <ArrowDownCircle className="w-4 h-4" /> Ingreso
              </Button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
          <button
            onClick={() => setTab('produccion')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${tab === 'produccion' ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <TableProperties className="w-4 h-4" />
            Planilla de Producción
          </button>
          <button
            onClick={() => setTab('costos')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${tab === 'costos' ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <TrendingDown className="w-4 h-4" />
            Costos e Insumos
          </button>
        </div>

        {/* Production tab */}
        {tab === 'produccion' && <ProductionGrid products={products} />}

        {/* Costs tab */}
        {tab === 'costos' && (
          <>
            {/* Today KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="flex items-center gap-4">
                <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center shrink-0">
                  <ArrowDownCircle className="w-6 h-6 text-teal-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Ingresos hoy</p>
                  <p className="text-2xl font-black text-gray-900">{formatPrice(todayInputCost)}</p>
                  <p className="text-xs text-gray-400">{todayIngresos.length} rubro{todayIngresos.length !== 1 ? 's' : ''}</p>
                </div>
              </Card>
              <Card className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center shrink-0">
                  <ArrowUpCircle className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Egresos hoy</p>
                  <p className="text-2xl font-black text-gray-900">{formatPrice(todayEgressCost)}</p>
                  <p className="text-xs text-gray-400">{todayEgresos.length} rubro{todayEgresos.length !== 1 ? 's' : ''}</p>
                </div>
              </Card>
              <button onClick={() => setShowForm(true)} className="flex items-center gap-4 cursor-pointer hover:bg-gray-50 transition-colors bg-white rounded-2xl p-4 border border-dashed border-gray-200 w-full text-left">
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center shrink-0">
                  <Plus className="w-6 h-6 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-600">Cargar movimiento</p>
                  <p className="text-xs text-gray-400">Ingresos o egresos de stock</p>
                </div>
              </button>
            </div>

            {/* History */}
            <div>
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">Historial (últimos 30 días)</h2>
              {loading ? (
                <div className="flex justify-center py-12"><RefreshCw className="w-6 h-6 text-gray-300 animate-spin" /></div>
              ) : days.length === 0 ? (
                <Card className="text-center py-12">
                  <PackageCheck className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400 font-medium text-sm">Sin registros todavía</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {days.map((day) => (
                    <div key={day}>
                      <DaySummaryCard date={day} />
                      <div className="mt-1 pl-2 space-y-1">
                        {entries.filter((e) => e.date === day).map((entry) => {
                          const isEgreso = entry.movement_type === 'egreso'
                          return (
                            <div key={entry.id} className="flex items-center justify-between px-4 py-1.5 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-2 flex-wrap">
                                {isEgreso ? <ArrowUpCircle className="w-3 h-3 text-orange-400 shrink-0" /> : <ArrowDownCircle className="w-3 h-3 text-teal-500 shrink-0" />}
                                <span className="text-xs text-gray-500 font-medium">{entry.product_line}</span>
                                {entry.quantity && <span className="text-xs text-gray-400">x{entry.quantity}</span>}
                                <span className={`text-xs font-bold ${isEgreso ? 'text-orange-500' : 'text-gray-700'}`}>
                                  {isEgreso ? '-' : ''}{formatPrice(Number(entry.cost))}
                                </span>
                                {entry.notes && <span className="text-xs text-gray-400 italic">{entry.notes}</span>}
                                {entry.product_id && <span className="text-[9px] bg-teal-100 text-teal-600 px-1.5 py-0.5 rounded font-semibold">POS</span>}
                                {entry.expense_id && <span className="text-[9px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded font-semibold">gasto</span>}
                                {isEgreso && <span className="text-[9px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded font-semibold">egreso</span>}
                              </div>
                              <button onClick={() => handleDelete(entry)} disabled={deletingId === entry.id} className="p-1 text-gray-300 hover:text-red-500 shrink-0">
                                {deletingId === entry.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {showForm && <DayInputForm products={products} onSave={handleSaveInputs} onClose={() => setShowForm(false)} />}
        {showEgressForm && <DayEgressForm products={products} onSave={handleSaveEgresses} onClose={() => setShowEgressForm(false)} />}
      </div>
    </FeatureGuard>
  )
}
