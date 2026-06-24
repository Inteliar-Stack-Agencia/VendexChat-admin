import { useState, useEffect, useCallback, useRef } from 'react'
import {
  PackageCheck, Plus, Trash2, X, Loader2, RefreshCw,
  TrendingUp, TrendingDown, ChevronDown, ChevronUp, CalendarDays, Link2,
  ArrowDownCircle, ArrowUpCircle, ChevronLeft, ChevronRight, TableProperties,
  Upload, FileSpreadsheet, Image as ImageIcon, CheckCircle2,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import Tesseract from 'tesseract.js'
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
import { callAI } from '../../services/aiService'
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

// ─── Import Production Modal ──────────────────────────────────────────────────

interface ImportRow {
  product_name: string
  quantity: number
  price: number
  matched_product_id: string
}

// Normalize string for fuzzy matching
function normStr(s: string) {
  return s.toLowerCase().trim()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
}

function findMatch(name: string, products: Product[]): string {
  const norm = normStr(name)
  // Exact normalized match
  const exact = products.find(p => normStr(p.name) === norm)
  if (exact) return exact.id
  // Partial match: product name contains the search or vice versa
  const partial = products.find(p => normStr(p.name).includes(norm) || norm.includes(normStr(p.name)))
  if (partial) return partial.id
  return ''
}

interface ImportModalProps {
  products: Product[]
  onImport: (date: string, rows: ImportRow[]) => Promise<void>
  onClose: () => void
}

function ImportProductionModal({ products, onImport, onClose }: ImportModalProps) {
  const [date, setDate] = useState(today)
  const [step, setStep] = useState<'upload' | 'preview'>('upload')
  const [rows, setRows] = useState<ImportRow[]>([])
  const [processing, setProcessing] = useState(false)
  const [ocrProgress, setOcrProgress] = useState(0)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const parseCSVDirect = (csv: string): ImportRow[] => {
    const lines = csv.split('\n').map((l) => l.trim()).filter(Boolean)
    const results: ImportRow[] = []

    for (const line of lines) {
      // Split by comma or tab or semicolon
      const cols = line.split(/[,;\t]/).map((c) => c.replace(/["']/g, '').trim())
      if (cols.length < 2) continue

      // First col = name, find a numeric col for quantity
      const name = cols[0]
      if (!name || name.length < 2) continue

      // Skip header-like rows
      const lname = name.toLowerCase()
      if (['producto', 'nombre', 'item', 'opciones', 'descripcion', 'total'].some((h) => lname.includes(h))) continue

      // Find first numeric column (quantity)
      let quantity = 0
      let price = 0
      for (let i = 1; i < cols.length; i++) {
        const n = parseFloat(cols[i].replace(/[$.,]/g, '').replace(',', '.'))
        if (!isNaN(n) && n > 0) {
          if (quantity === 0) quantity = Math.round(n) // first number = qty
          else if (n > 100) price = n // larger number = price
        }
      }

      if (quantity <= 0) continue

      results.push({ product_name: name, quantity, price, matched_product_id: findMatch(name, products) })
    }

    return results
  }

  const parseWithAI = async (rawText: string): Promise<ImportRow[]> => {
    try {
      const response = await callAI([
        {
          role: 'system',
          content: 'Sos un asistente que extrae tablas de producción. Devolvés SOLO un JSON array válido con objetos {"product_name":"...","quantity":N,"price":N}. Sin texto adicional, sin markdown, sin explicación. Solo el array JSON.',
        },
        {
          role: 'user',
          content: `Extraé los productos (ignorá encabezados y totales) de esta planilla:\n\n${rawText.slice(0, 3000)}`,
        },
      ])

      // Try to extract JSON array from response
      const clean = response.trim()
      const match = clean.match(/\[[\s\S]*\]/)
      if (!match) return []
      const parsed = JSON.parse(match[0]) as Array<{ product_name: string; quantity: number; price: number }>

      return parsed
        .filter((r) => r.product_name && Number(r.quantity) > 0)
        .map((r) => {
          return {
            product_name: r.product_name || '',
            quantity: Number(r.quantity) || 0,
            price: Number(r.price) || 0,
            matched_product_id: findMatch(r.product_name || '', products),
          }
        })
    } catch (err) {
      console.error('AI parse failed:', err)
      return []
    }
  }

  const handleFile = async (file: File) => {
    setProcessing(true)
    setOcrProgress(0)
    try {
      let rawText = ''
      let parsed: ImportRow[] = []

      if (file.name.match(/\.(xlsx|xls)$/i)) {
        // Excel → parse CSV directly first, fallback to AI
        const ab = await file.arrayBuffer()
        const wb = XLSX.read(ab)
        const ws = wb.Sheets[wb.SheetNames[0]]
        rawText = XLSX.utils.sheet_to_csv(ws)
        parsed = parseCSVDirect(rawText)
        if (parsed.length === 0) parsed = await parseWithAI(rawText)
      } else if (file.name.match(/\.csv$/i)) {
        rawText = await file.text()
        parsed = parseCSVDirect(rawText)
        if (parsed.length === 0) parsed = await parseWithAI(rawText)
      } else if (file.type.startsWith('image/') || file.name.match(/\.(png|jpg|jpeg|webp|bmp)$/i)) {
        // OCR → AI
        const result = await Tesseract.recognize(file, 'spa', {
          logger: (m) => {
            if (m.status === 'recognizing text') setOcrProgress(Math.round(m.progress * 100))
          },
        })
        rawText = result.data.text
        if (!rawText.trim()) { showToast('error', 'No se pudo leer texto de la imagen'); return }
        parsed = await parseWithAI(rawText)
      } else {
        showToast('error', 'Formato no soportado. Usá imagen, Excel o CSV.')
        return
      }

      if (parsed.length === 0) {
        showToast('error', 'No se encontraron productos. Revisá el formato del archivo.')
        return
      }

      setRows(parsed.filter((r) => r.quantity > 0))
      setStep('preview')
    } catch (err) {
      console.error('Import error:', err)
      showToast('error', `Error: ${err instanceof Error ? err.message : 'No se pudo procesar el archivo'}`)
      showToast('error', 'Error al procesar el archivo')
    } finally {
      setProcessing(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const updateRow = (i: number, patch: Partial<ImportRow>) => {
    setRows((prev) => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r))
  }

  const removeRow = (i: number) => setRows((prev) => prev.filter((_, idx) => idx !== i))

  const handleSave = async () => {
    const valid = rows.filter((r) => r.product_name.trim() && r.quantity > 0)
    if (valid.length === 0) return
    setSaving(true)
    try {
      await onImport(date, valid)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center">
              <Upload className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Importar Planilla de Producción</h2>
              <p className="text-xs text-gray-400 mt-0.5">Captura de pantalla, Excel o CSV · la IA extrae los datos</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-500" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {step === 'upload' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Fecha</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>

              {processing ? (
                <div className="border-2 border-dashed border-indigo-200 rounded-2xl p-12 text-center space-y-3">
                  <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mx-auto" />
                  <p className="text-sm font-semibold text-indigo-600">
                    {ocrProgress > 0 ? `Leyendo imagen… ${ocrProgress}%` : 'Procesando con IA…'}
                  </p>
                  {ocrProgress > 0 && (
                    <div className="w-48 mx-auto bg-gray-100 rounded-full h-2">
                      <div className="bg-indigo-500 h-2 rounded-full transition-all" style={{ width: `${ocrProgress}%` }} />
                    </div>
                  )}
                </div>
              ) : (
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed border-gray-200 hover:border-indigo-300 rounded-2xl p-12 text-center cursor-pointer transition-colors group"
                >
                  <div className="flex justify-center gap-4 mb-4">
                    <ImageIcon className="w-8 h-8 text-gray-300 group-hover:text-indigo-400 transition-colors" />
                    <FileSpreadsheet className="w-8 h-8 text-gray-300 group-hover:text-indigo-400 transition-colors" />
                  </div>
                  <p className="text-sm font-bold text-gray-500 group-hover:text-indigo-600 transition-colors">
                    Arrastrá o hacé clic para subir
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Captura de pantalla (PNG/JPG), Excel (.xlsx) o CSV</p>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".xlsx,.xls,.csv,image/*"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
                  />
                </div>
              )}
            </>
          )}

          {step === 'preview' && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Fecha</label>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                </div>
                <button onClick={() => { setStep('upload'); setRows([]) }} className="text-xs text-indigo-500 font-semibold hover:text-indigo-700">
                  ← Subir otro archivo
                </button>
              </div>

              <div className="bg-indigo-50 rounded-xl px-4 py-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                <p className="text-xs text-indigo-700 font-semibold">{rows.length} productos encontrados · revisá y corregí antes de guardar</p>
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-3 py-2.5 font-bold text-gray-500 uppercase tracking-wider">Producto</th>
                      <th className="text-center px-3 py-2.5 font-bold text-gray-500 uppercase tracking-wider w-20">Cant.</th>
                      <th className="text-center px-3 py-2.5 font-bold text-gray-500 uppercase tracking-wider w-28">Precio costo</th>
                      <th className="text-left px-3 py-2.5 font-bold text-gray-500 uppercase tracking-wider">Producto en planilla</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={i} className={`border-b border-gray-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={row.product_name}
                            onChange={(e) => updateRow(i, { product_name: e.target.value })}
                            className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number" min="0"
                            value={row.quantity}
                            onChange={(e) => updateRow(i, { quantity: parseInt(e.target.value) || 0 })}
                            className="w-full text-center border border-gray-200 rounded-lg px-2 py-1 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-indigo-400"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                            <input
                              type="number" min="0" step="0.01"
                              value={row.price || ''}
                              placeholder="0"
                              onChange={(e) => updateRow(i, { price: parseFloat(e.target.value) || 0 })}
                              className="w-full text-center border border-orange-200 rounded-lg pl-5 pr-2 py-1 text-xs font-bold text-orange-600 focus:outline-none focus:ring-1 focus:ring-orange-400"
                            />
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={row.matched_product_id}
                            onChange={(e) => updateRow(i, { matched_product_id: e.target.value })}
                            className={`w-full border rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400 ${row.matched_product_id ? 'border-emerald-300 text-emerald-700 font-semibold' : 'border-gray-200 text-gray-400'}`}
                          >
                            <option value="">Sin vincular</option>
                            {[...products].sort((a, b) => a.name.localeCompare(b.name, 'es')).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </td>
                        <td className="px-2 py-2">
                          <button onClick={() => removeRow(i)} className="p-1 text-gray-300 hover:text-red-500">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-teal-50 rounded-xl px-4 py-3 flex justify-between items-center">
                <span className="text-sm font-semibold text-teal-700">Total unidades</span>
                <span className="text-xl font-black text-teal-700">{rows.reduce((s, r) => s + r.quantity, 0)}</span>
              </div>
            </>
          )}
        </div>

        <div className="flex gap-3 p-6 border-t border-gray-100 shrink-0">
          <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>Cancelar</Button>
          {step === 'preview' && (
            <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleSave} disabled={saving || rows.length === 0}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : `Guardar ${rows.length} productos`}
            </Button>
          )}
        </div>
      </div>
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
                <th className="text-center px-2 py-3 font-bold text-gray-400 uppercase tracking-wider min-w-[60px]">Costo</th>
                <th className="text-center px-2 py-3 font-bold text-gray-400 uppercase tracking-wider min-w-[60px]">Venta</th>
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
              {(() => {
                // Group by category
                const groups: Record<string, { name: string; products: typeof activeProducts }> = {}
                for (const p of activeProducts) {
                  const key = p.category_id || '__none__'
                  const catName = p.category_name || 'Sin categoría'
                  if (!groups[key]) groups[key] = { name: catName, products: [] }
                  groups[key].products.push(p)
                }
                let rowIdx = 0
                return Object.entries(groups).map(([catKey, group]) => (
                  <>
                    <tr key={`cat-${catKey}`} className="bg-gray-100 border-t border-gray-200">
                      <td colSpan={11 + weekDays.length} className="px-4 py-1.5 text-[10px] font-black text-gray-500 uppercase tracking-widest sticky left-0">
                        {group.name}
                      </td>
                    </tr>
                    {group.products.map((product) => {
                      const totals = productTotals(product.id)
                      const stockColor = totals.stockFinal < 0 ? 'text-red-500' : totals.stockFinal === 0 ? 'text-emerald-600' : 'text-amber-500'
                      const bg = rowIdx++ % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'
                      return (
                        <tr key={product.id} className={`border-b border-gray-50 ${bg}`}>
                          <td className={`px-4 py-2 font-medium text-gray-700 sticky left-0 z-10 ${bg}`}>{product.name}</td>
                          <td className="px-2 py-2 text-center text-orange-400 font-medium text-[11px]">{product.cost_price ? formatPrice(product.cost_price) : '—'}</td>
                          <td className="px-2 py-2 text-center text-gray-400 font-medium text-[11px]">{formatPrice(product.price)}</td>
                          {weekDays.map((day) => {
                            const iso = toISO(day)
                            const sales = getSales(product.id, iso)
                            const prodVal = getPendingVal(product.id, iso)
                            const isToday = iso === today
                            return (
                              <td key={iso} className={`px-1 py-1 ${isToday ? 'bg-teal-50/30' : ''}`}>
                                <div className="flex flex-col items-center gap-0.5">
                                  <input
                                    type="number" min="0" value={prodVal} placeholder="—"
                                    onChange={(e) => handleCellChange(product.id, iso, e.target.value)}
                                    className="w-14 text-center border border-gray-200 rounded-lg px-1 py-1 text-sm font-bold text-teal-700 focus:outline-none focus:ring-1 focus:ring-teal-400 focus:border-teal-400 bg-white"
                                  />
                                  {sales.qty > 0 && <span className="text-[10px] text-emerald-600 font-semibold">-{sales.qty} vtas</span>}
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
                  </>
                ))
              })()}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 border-t-2 border-gray-200">
                <td className="px-4 py-3 font-black text-gray-700 sticky left-0 bg-gray-100 z-10">TOTALES</td>
                <td /><td />
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

// ─── Stock Close Grid ─────────────────────────────────────────────────────────

function StockCloseGrid({ products }: { products: Product[] }) {
  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(new Date()))
  const [weekData, setWeekData] = useState<Awaited<ReturnType<typeof productionApi.getWeekData>> | null>(null)
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState<Record<string, Record<string, Record<string, string>>>>({})
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
      showToast('error', 'Error al cargar cierre de stock')
    } finally {
      setLoading(false)
    }
  }, [weekStartISO, weekEndISO])

  useEffect(() => { load() }, [load])

  const getStockField = (productId: string, date: string, field: 'sobrante' | 'consumo_interno' | 'merma'): number =>
    weekData?.stock[productId]?.[date]?.[field] ?? 0

  const getPendingVal = (productId: string, date: string, field: 'sobrante' | 'consumo_interno' | 'merma'): string => {
    if (pending[productId]?.[date]?.[field] !== undefined) return pending[productId][date][field]
    const v = getStockField(productId, date, field)
    return v === 0 ? '' : String(v)
  }

  const handleCellChange = (productId: string, date: string, field: 'sobrante' | 'consumo_interno' | 'merma', val: string) => {
    setPending((prev) => ({
      ...prev,
      [productId]: {
        ...(prev[productId] || {}),
        [date]: { ...(prev[productId]?.[date] || {}), [field]: val },
      },
    }))

    const key = `${productId}__${date}__${field}`
    clearTimeout(saveTimers.current[key])
    saveTimers.current[key] = setTimeout(async () => {
      const n = parseInt(val) || 0
      const sobrante = field === 'sobrante' ? n : (parseInt(getPendingVal(productId, date, 'sobrante')) || getStockField(productId, date, 'sobrante'))
      const consumo = field === 'consumo_interno' ? n : (parseInt(getPendingVal(productId, date, 'consumo_interno')) || getStockField(productId, date, 'consumo_interno'))
      const merma = field === 'merma' ? n : (parseInt(getPendingVal(productId, date, 'merma')) || getStockField(productId, date, 'merma'))
      try {
        await productionApi.upsertStockClose(date, productId, { sobrante, consumo_interno: consumo, merma })
        const data = await productionApi.getWeekData(weekStartISO, weekEndISO)
        setWeekData(data)
      } catch {
        showToast('error', 'Error al guardar')
      }
    }, 800)
  }

  const productTotals = (productId: string) => {
    let totalSobrante = 0, totalConsumo = 0, totalMerma = 0
    for (const day of weekDays) {
      const d = toISO(day)
      const s = parseInt(getPendingVal(productId, d, 'sobrante')) || getStockField(productId, d, 'sobrante')
      const c = parseInt(getPendingVal(productId, d, 'consumo_interno')) || getStockField(productId, d, 'consumo_interno')
      const m = parseInt(getPendingVal(productId, d, 'merma')) || getStockField(productId, d, 'merma')
      totalSobrante += s
      totalConsumo += c
      totalMerma += m
    }
    return { totalSobrante, totalConsumo, totalMerma }
  }

  const activeProducts = products.filter((p) => p.is_active)

  const grandTotals = activeProducts.reduce(
    (acc, p) => {
      const t = productTotals(p.id)
      acc.sobrante += t.totalSobrante
      acc.consumo += t.totalConsumo
      acc.merma += t.totalMerma
      return acc
    },
    { sobrante: 0, consumo: 0, merma: 0 },
  )

  return (
    <div className="space-y-4">
      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <button onClick={() => setWeekStart(addDays(weekStart, -7))} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ChevronLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div className="text-center">
          <p className="text-sm font-bold text-gray-800">{weekLabel}</p>
          <p className="text-xs text-gray-400">Cierre semanal · sobrante diario</p>
        </div>
        <button onClick={() => setWeekStart(addDays(weekStart, 7))} disabled={weekStartISO >= toISO(getWeekStart(new Date()))} className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-30">
          <ChevronRight className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Summary banner */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-amber-50 rounded-xl p-3 text-center">
          <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1">Sobrante total</p>
          <p className="text-2xl font-black text-amber-700">{grandTotals.sobrante}</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-3 text-center">
          <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-1">Consumo interno</p>
          <p className="text-2xl font-black text-blue-700">{grandTotals.consumo}</p>
        </div>
        <div className="bg-red-50 rounded-xl p-3 text-center">
          <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-1">Merma total</p>
          <p className="text-2xl font-black text-red-600">{grandTotals.merma}</p>
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
                <th className="text-center px-2 py-3 font-bold text-amber-600 uppercase tracking-wider min-w-[80px]">Sobrante</th>
                <th className="text-center px-2 py-3 font-bold text-blue-500 uppercase tracking-wider min-w-[90px]">C. Interno</th>
                <th className="text-center px-2 py-3 font-bold text-red-500 uppercase tracking-wider min-w-[80px]">Merma</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const groups: Record<string, { name: string; products: typeof activeProducts }> = {}
                for (const p of activeProducts) {
                  const key = p.category_id || '__none__'
                  const catName = p.category_name || 'Sin categoría'
                  if (!groups[key]) groups[key] = { name: catName, products: [] }
                  groups[key].products.push(p)
                }
                let rowIdx = 0
                return Object.entries(groups).map(([catKey, group]) => (
                  <>
                    <tr key={`cat-${catKey}`} className="bg-gray-100 border-t border-gray-200">
                      <td colSpan={10 + weekDays.length} className="px-4 py-1.5 text-[10px] font-black text-gray-500 uppercase tracking-widest sticky left-0">
                        {group.name}
                      </td>
                    </tr>
                    {group.products.map((product) => {
                      const totals = productTotals(product.id)
                      const bg = rowIdx++ % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'
                      return (
                        <tr key={product.id} className={`border-b border-gray-50 ${bg}`}>
                          <td className={`px-4 py-2 font-medium text-gray-700 sticky left-0 z-10 ${bg}`}>{product.name}</td>
                          {weekDays.map((day) => {
                            const iso = toISO(day)
                            const isToday = iso === today
                            const sobranteVal = getPendingVal(product.id, iso, 'sobrante')
                            const consumoVal = getPendingVal(product.id, iso, 'consumo_interno')
                            const mermaVal = getPendingVal(product.id, iso, 'merma')
                            return (
                              <td key={iso} className={`px-1 py-1 ${isToday ? 'bg-teal-50/30' : ''}`}>
                                <div className="flex flex-col items-center gap-0.5">
                                  <input type="number" min="0" value={sobranteVal} placeholder="—" title="Sobrante"
                                    onChange={(e) => handleCellChange(product.id, iso, 'sobrante', e.target.value)}
                                    className="w-14 text-center border border-amber-200 rounded-lg px-1 py-1 text-sm font-bold text-amber-700 focus:outline-none focus:ring-1 focus:ring-amber-400 bg-white"
                                  />
                                  {(consumoVal !== '' && consumoVal !== '0') && <span className="text-[9px] text-blue-500 font-semibold">CI:{consumoVal}</span>}
                                  {(mermaVal !== '' && mermaVal !== '0') && <span className="text-[9px] text-red-400 font-semibold">M:{mermaVal}</span>}
                                </div>
                              </td>
                            )
                          })}
                          <td className="px-2 py-2 text-center font-black text-amber-600">{totals.totalSobrante || '—'}</td>
                          <td className="px-2 py-2 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <input type="number" min="0" placeholder="0"
                                value={getPendingVal(product.id, weekEndISO, 'consumo_interno')}
                                onChange={(e) => handleCellChange(product.id, weekEndISO, 'consumo_interno', e.target.value)}
                                className="w-14 text-center border border-blue-200 rounded-lg px-1 py-1 text-xs font-bold text-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                              />
                              {totals.totalConsumo > 0 && <span className="text-[9px] text-blue-400">{totals.totalConsumo} total</span>}
                            </div>
                          </td>
                          <td className="px-2 py-2 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <input type="number" min="0" placeholder="0"
                                value={getPendingVal(product.id, weekEndISO, 'merma')}
                                onChange={(e) => handleCellChange(product.id, weekEndISO, 'merma', e.target.value)}
                                className="w-14 text-center border border-red-200 rounded-lg px-1 py-1 text-xs font-bold text-red-500 focus:outline-none focus:ring-1 focus:ring-red-400 bg-white"
                              />
                              {totals.totalMerma > 0 && <span className="text-[9px] text-red-400">{totals.totalMerma} total</span>}
                      </div>
                    </td>
                          </tr>
                        )
                      })}
                    </>
                  ))
                })()}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 border-t-2 border-gray-200">
                <td className="px-4 py-3 font-black text-gray-700 sticky left-0 bg-gray-100 z-10">TOTALES</td>
                {weekDays.map((day) => {
                  const iso = toISO(day)
                  const daySobrante = activeProducts.reduce((s, p) => {
                    const v = parseInt(getPendingVal(p.id, iso, 'sobrante')) || getStockField(p.id, iso, 'sobrante')
                    return s + v
                  }, 0)
                  return (
                    <td key={iso} className="px-1 py-3 text-center">
                      <div className="text-xs font-black text-amber-600">{daySobrante || '—'}</div>
                    </td>
                  )
                })}
                <td className="px-2 py-3 text-center font-black text-amber-600">{grandTotals.sobrante}</td>
                <td className="px-2 py-3 text-center font-black text-blue-600">{grandTotals.consumo}</td>
                <td className="px-2 py-3 text-center font-black text-red-500">{grandTotals.merma}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <p className="text-[10px] text-gray-400 text-center">
        Sobrante: editá por día · Consumo interno y Merma: total semanal por producto · se guarda automáticamente
      </p>
    </div>
  )
}

// ─── POS Sales Grid ───────────────────────────────────────────────────────────

function POSSalesGrid({ products }: { products: Product[] }) {
  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(new Date()))
  const [weekData, setWeekData] = useState<Awaited<ReturnType<typeof productionApi.getWeekData>> | null>(null)
  const [loading, setLoading] = useState(true)

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const weekStartISO = toISO(weekStart)
  const weekEndISO = toISO(weekDays[6])
  const weekLabel = `${weekStart.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })} – ${weekDays[6].toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}`

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await productionApi.getWeekData(weekStartISO, weekEndISO)
      setWeekData(data)
    } catch {
      showToast('error', 'Error al cargar ventas POS')
    } finally {
      setLoading(false)
    }
  }, [weekStartISO, weekEndISO])

  useEffect(() => { load() }, [load])

  const trackedProducts = products.filter(p => p.track_pos_sales)

  // Group by category
  const categories = [...new Set(trackedProducts.map(p => p.category_name || 'Sin categoría'))]
  type CategoryGroup = { name: string; products: Product[] }
  const grouped: CategoryGroup[] = categories.map(name => ({
    name,
    products: trackedProducts.filter(p => (p.category_name || 'Sin categoría') === name),
  }))

  const getSalesQty = (productId: string, date: string) =>
    weekData?.sales[productId]?.[date]?.qty ?? 0

  const getSalesRevenue = (productId: string, date: string) =>
    weekData?.sales[productId]?.[date]?.revenue ?? 0

  const weekSalesQty = (productId: string) =>
    weekDays.reduce((s, d) => s + getSalesQty(productId, toISO(d)), 0)

  const weekSalesRevenue = (productId: string) =>
    weekDays.reduce((s, d) => s + getSalesRevenue(productId, toISO(d)), 0)

  const totalQty = trackedProducts.reduce((s, p) => s + weekSalesQty(p.id), 0)
  const totalRevenue = trackedProducts.reduce((s, p) => s + weekSalesRevenue(p.id), 0)

  return (
    <div className="space-y-4">
      {/* Week navigator */}
      <div className="flex items-center justify-between">
        <button onClick={() => setWeekStart(d => addDays(d, -7))} className="p-2 rounded-lg hover:bg-gray-100">
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-teal-600" />
          <span className="text-sm font-bold text-gray-700">{weekLabel}</span>
        </div>
        <button onClick={() => setWeekStart(d => addDays(d, 7))} className="p-2 rounded-lg hover:bg-gray-100">
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Summary banners */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-center">
          <div className="text-lg font-black text-indigo-700">{totalQty}</div>
          <div className="text-xs text-indigo-500 font-semibold">Unidades vendidas</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
          <div className="text-lg font-black text-green-700">{formatPrice(totalRevenue)}</div>
          <div className="text-xs text-green-500 font-semibold">Ingresos POS</div>
        </div>
      </div>

      {trackedProducts.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-semibold">Sin productos marcados para ventas POS</p>
          <p className="text-xs mt-1">Activá "Registrar ventas en POS" en la edición de cada producto</p>
        </div>
      ) : loading ? (
        <div className="text-center py-10 text-gray-400 text-sm">Cargando...</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2 text-left text-xs font-black text-gray-500 uppercase tracking-wider min-w-[140px]">Producto</th>
                {weekDays.map(d => (
                  <th key={toISO(d)} className="px-2 py-2 text-center text-xs font-black text-gray-500 uppercase tracking-wider min-w-[60px]">
                    <div>{DAY_SHORT[d.getDay()]}</div>
                    <div className="text-[10px] font-normal text-gray-400">{d.getDate()}</div>
                  </th>
                ))}
                <th className="px-2 py-2 text-center text-xs font-black text-indigo-600 uppercase tracking-wider">Cant.</th>
                <th className="px-2 py-2 text-center text-xs font-black text-green-600 uppercase tracking-wider">Total</th>
              </tr>
            </thead>
            <tbody>
              {grouped.map(group => (
                <>
                  <tr key={`cat-${group.name}`} className="bg-gray-100">
                    <td colSpan={9 + 2} className="px-3 py-1.5 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                      {group.name}
                    </td>
                  </tr>
                  {group.products.map((product, i) => {
                    const wQty = weekSalesQty(product.id)
                    const wRev = weekSalesRevenue(product.id)
                    return (
                      <tr key={product.id} className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                        <td className="px-3 py-2 font-medium text-gray-800">{product.name}</td>
                        {weekDays.map(d => {
                          const qty = getSalesQty(product.id, toISO(d))
                          return (
                            <td key={toISO(d)} className="px-2 py-2 text-center text-xs text-gray-600">
                              {qty > 0 ? <span className="font-bold text-indigo-700">{qty}</span> : <span className="text-gray-300">—</span>}
                            </td>
                          )
                        })}
                        <td className="px-2 py-2 text-center font-black text-indigo-700">{wQty || '—'}</td>
                        <td className="px-2 py-2 text-center font-black text-green-700">{wRev > 0 ? formatPrice(wRev) : '—'}</td>
                      </tr>
                    )
                  })}
                </>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 border-t-2 border-gray-300">
                <td className="px-3 py-3 text-xs font-black text-gray-600 uppercase">Total semana</td>
                {weekDays.map(d => {
                  const dayQty = trackedProducts.reduce((s, p) => s + getSalesQty(p.id, toISO(d)), 0)
                  return (
                    <td key={toISO(d)} className="px-2 py-3 text-center font-black text-indigo-700 text-xs">
                      {dayQty || '—'}
                    </td>
                  )
                })}
                <td className="px-2 py-3 text-center font-black text-indigo-700">{totalQty}</td>
                <td className="px-2 py-3 text-center font-black text-green-700">{formatPrice(totalRevenue)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      <p className="text-[10px] text-gray-400 text-center">
        Ventas registradas desde el POS · solo productos con "Registrar ventas en POS" activado
      </p>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = 'produccion' | 'stock' | 'ventas'

export default function InventoryPage() {
  const [tab, setTab] = useState<Tab>('produccion')
  const [entries, setEntries] = useState<InventoryEntry[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showEgressForm, setShowEgressForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
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

  const handleImport = async (date: string, rows: ImportRow[]) => {
    for (const row of rows) {
      if (row.matched_product_id) {
        await productionApi.upsertEntry(date, row.matched_product_id, row.quantity)
        // Update cost_price if provided
        if (row.price > 0) {
          await productsApi.update(row.matched_product_id, { cost_price: row.price })
        }
      }
    }
    const unlinked = rows.filter((r) => !r.matched_product_id)
    if (unlinked.length > 0) {
      showToast('info', `${rows.length - unlinked.length} guardados en planilla · ${unlinked.length} sin vincular (solo en el registro)`)
    } else {
      showToast('success', `${rows.length} productos guardados en la planilla`)
    }
    setShowImport(false)
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
          {tab === 'produccion' && (
            <Button onClick={() => setShowImport(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2">
              <Upload className="w-4 h-4" /> Importar planilla
            </Button>
          )}
          {tab === 'stock' && (
            <div className="flex gap-2">
              <Button onClick={() => setShowEgressForm(true)} className="bg-orange-500 hover:bg-orange-600 text-white flex items-center gap-2">
                <ArrowUpCircle className="w-4 h-4" /> Egreso
              </Button>
              <Button onClick={() => setShowForm(true)} className="bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-2">
                <ArrowDownCircle className="w-4 h-4" /> Ingreso
              </Button>
            </div>
          )}
          {tab === 'ventas' && <div />}
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
          <button
            onClick={() => setTab('produccion')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${tab === 'produccion' ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <TableProperties className="w-4 h-4" />
            Producción
          </button>
          <button
            onClick={() => setTab('stock')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${tab === 'stock' ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <TrendingDown className="w-4 h-4" />
            Cierre / Stock
          </button>
          <button
            onClick={() => setTab('ventas')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${tab === 'ventas' ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <TrendingUp className="w-4 h-4" />
            Ventas POS
          </button>
        </div>

        {tab === 'produccion' && <ProductionGrid products={products} />}
        {tab === 'stock' && <StockCloseGrid products={products} />}
        {tab === 'ventas' && <POSSalesGrid products={products} />}

        {showForm && <DayInputForm products={products} onSave={handleSaveInputs} onClose={() => setShowForm(false)} />}
        {showEgressForm && <DayEgressForm products={products} onSave={handleSaveEgresses} onClose={() => setShowEgressForm(false)} />}
        {showImport && <ImportProductionModal products={products} onImport={handleImport} onClose={() => setShowImport(false)} />}
      </div>
    </FeatureGuard>
  )
}
