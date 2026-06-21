import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  BarChart3,
  Download,
  Target,
  ChevronDown,
  ChevronUp,
  Loader2,
  Plus,
  Trash2,
  X,
  AlertCircle,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { Card, Button } from '../../components/common'
import FeatureGuard from '../../components/FeatureGuard'
import { expensesApi, type Partner } from '../../services/expensesApi'
import { formatPrice } from '../../utils/helpers'
import { showToast } from '../../components/common/Toast'

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const PARTNER_COLORS = [
  { dot: 'bg-indigo-500', bar: 'bg-indigo-500', badge: 'bg-indigo-100 text-indigo-700' },
  { dot: 'bg-emerald-500', bar: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700' },
  { dot: 'bg-amber-500', bar: 'bg-amber-500', badge: 'bg-amber-100 text-amber-700' },
  { dot: 'bg-purple-500', bar: 'bg-purple-500', badge: 'bg-purple-100 text-purple-700' },
  { dot: 'bg-pink-500', bar: 'bg-pink-500', badge: 'bg-pink-100 text-pink-700' },
  { dot: 'bg-cyan-500', bar: 'bg-cyan-500', badge: 'bg-cyan-100 text-cyan-700' },
]

const currentYear = new Date().getFullYear()

interface MonthlyRow {
  month: number
  revenue: number
  fixedCosts: number
  variableCosts: number
  result: number
}

// ─── Setup Banner ───────────────────────────────────────────────────────────────

function SetupBanner() {
  return (
    <Card className="p-6 border-amber-200 bg-amber-50">
      <div className="flex gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-amber-800 text-sm">Tablas requeridas en Supabase</p>
          <p className="text-amber-700 text-xs mt-1">
            Este módulo necesita las tablas <code className="bg-amber-100 px-1 rounded">expenses</code> y{' '}
            <code className="bg-amber-100 px-1 rounded">partners</code>. Revisá el módulo de Gastos para el SQL completo.
          </p>
        </div>
      </div>
    </Card>
  )
}

// ─── Partner Manager ────────────────────────────────────────────────────────────

interface PartnerManagerProps {
  partners: Partner[]
  onAdd: (name: string, percentage: number) => Promise<void>
  onUpdate: (id: string, name: string, percentage: number) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

function PartnerManager({ partners, onAdd, onUpdate, onDelete }: PartnerManagerProps) {
  const [adding, setAdding] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [pct, setPct] = useState('')
  const [saving, setSaving] = useState(false)

  const totalPct = partners.reduce((s, p) => s + p.percentage, 0)
  const remaining = 100 - totalPct

  const resetForm = () => { setName(''); setPct(''); setAdding(false); setEditId(null) }

  const handleSave = async () => {
    const p = parseFloat(pct)
    if (!name || isNaN(p) || p <= 0) return
    setSaving(true)
    try {
      if (editId) await onUpdate(editId, name, p)
      else await onAdd(name, p)
      resetForm()
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (partner: Partner) => {
    setEditId(partner.id)
    setName(partner.name)
    setPct(String(partner.percentage))
    setAdding(true)
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="font-bold text-gray-800 text-sm">Socios / Participaciones</p>
          <p className="text-xs text-gray-400 mt-0.5">Configurá quién participa y en qué porcentaje</p>
        </div>
        {!adding && (
          <Button
            onClick={() => { resetForm(); setAdding(true) }}
            variant="ghost"
            className="text-xs flex items-center gap-1.5 text-indigo-600 hover:bg-indigo-50"
          >
            <Plus className="w-3.5 h-3.5" /> Agregar socio
          </Button>
        )}
      </div>

      {partners.length > 0 && (
        <div className="mb-4">
          <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
            {partners.map((p, i) => (
              <div
                key={p.id}
                className={`${PARTNER_COLORS[i % PARTNER_COLORS.length].bar} transition-all`}
                style={{ width: `${p.percentage}%` }}
                title={`${p.name}: ${p.percentage}%`}
              />
            ))}
            {remaining > 0 && <div className="bg-gray-200 flex-1" title={`Sin asignar: ${remaining.toFixed(1)}%`} />}
          </div>
          <div className="flex items-center justify-between mt-1">
            <p className="text-[10px] text-gray-400">Asignado: {totalPct.toFixed(1)}%</p>
            {remaining > 0 && <p className="text-[10px] text-amber-500 font-semibold">Sin asignar: {remaining.toFixed(1)}%</p>}
            {totalPct > 100 && <p className="text-[10px] text-red-500 font-semibold">⚠ Superás el 100%</p>}
          </div>
        </div>
      )}

      <div className="space-y-2 mb-3">
        {partners.map((p, i) => (
          <div key={p.id} className="flex items-center gap-3 py-1.5">
            <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${PARTNER_COLORS[i % PARTNER_COLORS.length].dot}`} />
            <p className="text-sm font-medium text-gray-800 flex-1">{p.name}</p>
            <p className="text-sm font-black text-gray-700">{p.percentage}%</p>
            <button onClick={() => startEdit(p)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-indigo-600">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button onClick={() => onDelete(p.id)} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {adding && (
        <div className="flex gap-2 items-center pt-3 border-t border-gray-100">
          <input
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            placeholder="Nombre del socio"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <div className="relative w-24">
            <input
              type="number" min="0.1" max="100" step="0.1"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 pr-7"
              placeholder="50"
              value={pct}
              onChange={(e) => setPct(e.target.value)}
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">%</span>
          </div>
          <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-2">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : editId ? 'Guardar' : 'Agregar'}
          </Button>
          <button onClick={resetForm} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </Card>
  )
}

// ─── Distribution Table ─────────────────────────────────────────────────────────

function DistributionTable({ partners, netResult }: { partners: Partner[]; netResult: number }) {
  if (partners.length === 0) return null
  const totalPct = partners.reduce((s, p) => s + p.percentage, 0)

  return (
    <Card className="overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <p className="font-bold text-gray-800 text-sm">Distribución de Utilidades</p>
          <p className="text-xs text-gray-400">
            Resultado neto:{' '}
            <span className={`font-bold ${netResult >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {netResult >= 0 ? '+' : ''}{formatPrice(netResult)}
            </span>
          </p>
        </div>
        {totalPct !== 100 && (
          <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-2 py-1 rounded-full">
            ⚠ Los % no suman 100
          </span>
        )}
      </div>
      <div className="divide-y divide-gray-50">
        {partners.map((p, i) => {
          const share = (netResult * p.percentage) / 100
          const c = PARTNER_COLORS[i % PARTNER_COLORS.length]
          return (
            <div key={p.id} className="flex items-center gap-4 px-5 py-3.5">
              <div className={`w-3 h-3 rounded-full shrink-0 ${c.dot}`} />
              <p className="flex-1 font-semibold text-gray-800">{p.name}</p>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${c.badge}`}>{p.percentage}%</span>
              <p className={`font-black text-base w-32 text-right ${share >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {share >= 0 ? '+' : ''}{formatPrice(share)}
              </p>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

// ─── P&L Table ──────────────────────────────────────────────────────────────────

function PnLTable({ rows, year, onExport }: { rows: MonthlyRow[]; year: number; onExport: () => void }) {
  const [expanded, setExpanded] = useState<number | null>(null)

  const totals = rows.reduce(
    (acc, r) => ({
      revenue: acc.revenue + r.revenue,
      fixedCosts: acc.fixedCosts + r.fixedCosts,
      variableCosts: acc.variableCosts + r.variableCosts,
      result: acc.result + r.result,
    }),
    { revenue: 0, fixedCosts: 0, variableCosts: 0, result: 0 }
  )

  const activeMonths = rows.filter((r) => r.revenue > 0 || r.fixedCosts > 0 || r.variableCosts > 0)
  const avgFixedCosts = activeMonths.length > 0 ? totals.fixedCosts / activeMonths.length : 0
  const avgRevenue = activeMonths.length > 0 ? totals.revenue / activeMonths.length : 0
  const avgVarCosts = activeMonths.length > 0 ? totals.variableCosts / activeMonths.length : 0
  const contributionMarginRatio = avgRevenue > 0 ? (avgRevenue - avgVarCosts) / avgRevenue : 0
  const breakEven = contributionMarginRatio > 0 ? avgFixedCosts / contributionMarginRatio : 0

  return (
    <div className="space-y-5">
      {breakEven > 0 && (
        <Card className="p-5 bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-100">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
              <Target className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Punto de Equilibrio</p>
              <p className="text-3xl font-black text-indigo-700 mt-1">{formatPrice(breakEven)}</p>
              <p className="text-xs text-indigo-500 mt-1">
                Necesitás facturar <strong>{formatPrice(breakEven)}</strong> por mes para cubrir todos tus costos
                (promedio de {activeMonths.length} mes{activeMonths.length !== 1 ? 'es' : ''} con datos)
              </p>
              <div className="grid grid-cols-3 gap-3 mt-3">
                <div className="bg-white rounded-lg p-2 text-center">
                  <p className="text-[10px] text-gray-400 font-medium">CF promedio/mes</p>
                  <p className="text-sm font-bold text-indigo-600">{formatPrice(avgFixedCosts)}</p>
                </div>
                <div className="bg-white rounded-lg p-2 text-center">
                  <p className="text-[10px] text-gray-400 font-medium">Margen contribución</p>
                  <p className="text-sm font-bold text-emerald-600">{(contributionMarginRatio * 100).toFixed(1)}%</p>
                </div>
                <div className="bg-white rounded-lg p-2 text-center">
                  <p className="text-[10px] text-gray-400 font-medium">Resultado acum.</p>
                  <p className={`text-sm font-bold ${totals.result >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {formatPrice(totals.result)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <p className="font-bold text-gray-800 text-sm">Estado de Resultados — {year}</p>
          <Button onClick={onExport} variant="ghost" className="text-xs flex items-center gap-1.5 text-gray-500 hover:text-emerald-700">
            <Download className="w-3.5 h-3.5" /> Exportar Excel
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-left">
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Mes</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Ingresos</th>
                <th className="px-4 py-3 text-xs font-semibold text-indigo-500 uppercase tracking-wider text-right">G. Fijos</th>
                <th className="px-4 py-3 text-xs font-semibold text-amber-500 uppercase tracking-wider text-right">G. Variables</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Total Egresos</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Resultado</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Margen</th>
                <th className="px-4 py-3 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((r) => {
                const totalCosts = r.fixedCosts + r.variableCosts
                const margin = r.revenue > 0 ? (r.result / r.revenue) * 100 : 0
                const isEmpty = r.revenue === 0 && totalCosts === 0
                return (
                  <tr key={r.month} className={`transition-colors ${isEmpty ? 'opacity-40' : 'hover:bg-gray-50'}`}>
                    <td className="px-4 py-3 font-semibold text-gray-800">{MONTHS[r.month - 1]}</td>
                    <td className="px-4 py-3 text-right text-emerald-700 font-semibold">{formatPrice(r.revenue)}</td>
                    <td className="px-4 py-3 text-right text-indigo-600 font-medium">{formatPrice(r.fixedCosts)}</td>
                    <td className="px-4 py-3 text-right text-amber-600 font-medium">{formatPrice(r.variableCosts)}</td>
                    <td className="px-4 py-3 text-right text-red-500 font-medium">{formatPrice(totalCosts)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-black ${r.result >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {r.result >= 0 ? '+' : ''}{formatPrice(r.result)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!isEmpty && (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          margin >= 20 ? 'bg-emerald-100 text-emerald-700' :
                          margin >= 0 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {margin.toFixed(1)}%
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {!isEmpty && (
                        <button onClick={() => setExpanded(expanded === r.month ? null : r.month)} className="text-gray-400 hover:text-gray-700 p-1 rounded">
                          {expanded === r.month ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-gray-200 font-black">
                <td className="px-4 py-3 text-gray-800 uppercase text-xs tracking-wider">TOTAL</td>
                <td className="px-4 py-3 text-right text-emerald-700">{formatPrice(totals.revenue)}</td>
                <td className="px-4 py-3 text-right text-indigo-600">{formatPrice(totals.fixedCosts)}</td>
                <td className="px-4 py-3 text-right text-amber-600">{formatPrice(totals.variableCosts)}</td>
                <td className="px-4 py-3 text-right text-red-500">{formatPrice(totals.fixedCosts + totals.variableCosts)}</td>
                <td className="px-4 py-3 text-right">
                  <span className={totals.result >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                    {totals.result >= 0 ? '+' : ''}{formatPrice(totals.result)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {totals.revenue > 0 && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      totals.result / totals.revenue >= 0.2 ? 'bg-emerald-100 text-emerald-700' :
                      totals.result / totals.revenue >= 0 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {((totals.result / totals.revenue) * 100).toFixed(1)}%
                    </span>
                  )}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────────────

export default function BalancePage() {
  const [expenses, setExpenses] = useState<{ amount: number; date: string; expense_type: string }[]>([])
  const [revenueOrders, setRevenueOrders] = useState<{ total: number; created_at: string }[]>([])
  const [partners, setPartners] = useState<Partner[]>([])
  const [loading, setLoading] = useState(true)
  const [dbError, setDbError] = useState(false)
  const [year, setYear] = useState(currentYear)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [exp, revenue, partnerList] = await Promise.all([
        expensesApi.listExpenses({ from: `${year}-01-01`, to: `${year}-12-31` }),
        expensesApi.getMonthlyRevenue(year),
        expensesApi.listPartners(),
      ])
      setExpenses(exp)
      setRevenueOrders(revenue)
      setPartners(partnerList)
      setDbError(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('does not exist') || msg.includes('relation') || msg.includes('42P01')) {
        setDbError(true)
      } else {
        showToast('error', 'Error al cargar balance')
      }
    } finally {
      setLoading(false)
    }
  }, [year])

  useEffect(() => { loadData() }, [loadData])

  const rows: MonthlyRow[] = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const month = i + 1
      const revenue = revenueOrders
        .filter((o) => new Date(o.created_at).getMonth() + 1 === month)
        .reduce((s, o) => s + (Number(o.total) || 0), 0)
      const fixedCosts = expenses
        .filter((e) => new Date(e.date + 'T00:00:00').getMonth() + 1 === month && e.expense_type === 'fijo')
        .reduce((s, e) => s + e.amount, 0)
      const variableCosts = expenses
        .filter((e) => new Date(e.date + 'T00:00:00').getMonth() + 1 === month && e.expense_type === 'variable')
        .reduce((s, e) => s + e.amount, 0)
      return { month, revenue, fixedCosts, variableCosts, result: revenue - fixedCosts - variableCosts }
    })
  }, [expenses, revenueOrders])

  const netResult = rows.reduce((s, r) => s + r.result, 0)

  const handleExport = () => {
    const data = rows.map((r) => ({
      Mes: MONTHS[r.month - 1],
      Ingresos: r.revenue,
      'Gastos Fijos': r.fixedCosts,
      'Gastos Variables': r.variableCosts,
      'Total Egresos': r.fixedCosts + r.variableCosts,
      Resultado: r.result,
      'Margen %': r.revenue > 0 ? +((r.result / r.revenue) * 100).toFixed(2) : 0,
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, `P&L ${year}`)
    XLSX.writeFile(wb, `balance_${year}.xlsx`)
  }

  const handleAddPartner = async (name: string, percentage: number) => {
    await expensesApi.createPartner({ name, percentage })
    showToast('success', 'Socio agregado')
    setPartners(await expensesApi.listPartners())
  }

  const handleUpdatePartner = async (id: string, name: string, percentage: number) => {
    await expensesApi.updatePartner(id, { name, percentage })
    showToast('success', 'Socio actualizado')
    setPartners(await expensesApi.listPartners())
  }

  const handleDeletePartner = async (id: string) => {
    if (!confirm('¿Eliminar este socio?')) return
    await expensesApi.deletePartner(id)
    showToast('success', 'Socio eliminado')
    setPartners(await expensesApi.listPartners())
  }

  return (
    <FeatureGuard feature="pnl" minPlan="vip">
      <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900">Balance & P&L</h1>
              <p className="text-xs text-gray-500">Estado de resultados, punto de equilibrio y distribución de utilidades</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Año</label>
            <select
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {dbError && <SetupBanner />}

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
          </div>
        ) : (
          <div className="space-y-6">
            <PnLTable rows={rows} year={year} onExport={handleExport} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <PartnerManager
                partners={partners}
                onAdd={handleAddPartner}
                onUpdate={handleUpdatePartner}
                onDelete={handleDeletePartner}
              />
              <DistributionTable partners={partners} netResult={netResult} />
            </div>
          </div>
        )}
      </div>
    </FeatureGuard>
  )
}
