import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  TrendingDown,
  Plus,
  Trash2,
  X,
  Loader2,
  Store,
  Phone,
  Mail,
  Search,
  AlertCircle,
  BarChart3,
  Download,
  Target,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { Card, Button } from '../../components/common'
import FeatureGuard from '../../components/FeatureGuard'
import {
  expensesApi,
  type Expense,
  type Supplier,
  type Partner,
  type ExpenseCategory,
  type ExpenseType,
} from '../../services/expensesApi'
import { formatPrice } from '../../utils/helpers'
import { showToast } from '../../components/common/Toast'

// ─── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES: { value: ExpenseCategory; label: string; color: string }[] = [
  { value: 'materia_prima', label: 'Materia Prima', color: 'bg-green-100 text-green-700' },
  { value: 'servicios', label: 'Servicios', color: 'bg-blue-100 text-blue-700' },
  { value: 'alquiler', label: 'Alquiler', color: 'bg-orange-100 text-orange-700' },
  { value: 'personal', label: 'Personal', color: 'bg-purple-100 text-purple-700' },
  { value: 'transporte', label: 'Transporte', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'marketing', label: 'Marketing', color: 'bg-pink-100 text-pink-700' },
  { value: 'otros', label: 'Otros', color: 'bg-gray-100 text-gray-700' },
]

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const getCategoryMeta = (value: string) =>
  CATEGORIES.find((c) => c.value === value) ?? { label: value, color: 'bg-gray-100 text-gray-700' }

const currentYear = new Date().getFullYear()
const today = new Date().toISOString().split('T')[0]
const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

// ─── Expense Form Modal ─────────────────────────────────────────────────────────

interface ExpenseFormProps {
  suppliers: Supplier[]
  onSave: (data: Omit<Expense, 'id' | 'store_id' | 'created_at' | 'supplier'>) => Promise<void>
  onClose: () => void
}

function ExpenseForm({ suppliers, onSave, onClose }: ExpenseFormProps) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    description: '',
    category: 'otros' as ExpenseCategory,
    expense_type: 'variable' as ExpenseType,
    amount: '',
    date: today,
    supplier_id: '',
    notes: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.description || !form.amount || !form.date) return
    setSaving(true)
    try {
      await onSave({
        description: form.description,
        category: form.category,
        expense_type: form.expense_type,
        amount: parseFloat(form.amount),
        date: form.date,
        supplier_id: form.supplier_id || null,
        notes: form.notes || null,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">Nuevo Gasto</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Descripción *
            </label>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder="Ej: Compra de ingredientes"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              required
            />
          </div>

          {/* Tipo: Fijo / Variable */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Tipo de gasto *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['fijo', 'variable'] as ExpenseType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm({ ...form, expense_type: t })}
                  className={`py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest border-2 transition-all ${
                    form.expense_type === t
                      ? t === 'fijo'
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'bg-amber-500 border-amber-500 text-white'
                      : 'border-gray-200 text-gray-400 hover:border-gray-300'
                  }`}
                >
                  {t === 'fijo' ? '📌 Fijo' : '📊 Variable'}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5">
              {form.expense_type === 'fijo'
                ? 'Se repite cada mes sin importar las ventas (alquiler, sueldos fijos...)'
                : 'Varía según la operación (materia prima, delivery, comisiones...)'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Categoría *
              </label>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as ExpenseCategory })}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Monto *
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Fecha *
              </label>
              <input
                type="date"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Proveedor
              </label>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                value={form.supplier_id}
                onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}
              >
                <option value="">Sin proveedor</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Notas
            </label>
            <textarea
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
              rows={2}
              placeholder="Opcional..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Supplier Form Modal ────────────────────────────────────────────────────────

interface SupplierFormProps {
  initial?: Supplier | null
  onSave: (data: Omit<Supplier, 'id' | 'store_id' | 'created_at'>) => Promise<void>
  onClose: () => void
}

function SupplierForm({ initial, onSave, onClose }: SupplierFormProps) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    contact_name: initial?.contact_name ?? '',
    phone: initial?.phone ?? '',
    email: initial?.email ?? '',
    category: initial?.category ?? '',
    notes: initial?.notes ?? '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name) return
    setSaving(true)
    try {
      await onSave({
        name: form.name,
        contact_name: form.contact_name || null,
        phone: form.phone || null,
        email: form.email || null,
        category: form.category || null,
        notes: form.notes || null,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">{initial ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Nombre *</label>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder="Nombre del proveedor"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Contacto</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="Nombre de contacto"
                value={form.contact_name}
                onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Categoría</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="Ej: Alimentos"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Teléfono</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="+54 11..."
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Email</label>
              <input
                type="email"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="proveedor@mail.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Notas</label>
            <textarea
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
              rows={2}
              placeholder="Condiciones de pago, horarios, etc."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Setup Banner ───────────────────────────────────────────────────────────────

function SetupBanner() {
  return (
    <Card className="p-6 border-amber-200 bg-amber-50">
      <div className="flex gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-amber-800 text-sm">Tablas de base de datos requeridas</p>
          <p className="text-amber-700 text-xs mt-1">
            Este módulo necesita las tablas <code className="bg-amber-100 px-1 rounded">expenses</code> y{' '}
            <code className="bg-amber-100 px-1 rounded">suppliers</code> en Supabase. Ejecutá el SQL del README
            o contactá a soporte.
          </p>
          <details className="mt-3">
            <summary className="text-xs font-semibold text-amber-800 cursor-pointer">Ver SQL de creación</summary>
            <pre className="mt-2 text-[10px] bg-amber-100 rounded p-3 overflow-x-auto text-amber-900 whitespace-pre-wrap">
{`-- Proveedores
create table suppliers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references stores(id) on delete cascade not null,
  name text not null,
  contact_name text,
  phone text,
  email text,
  category text,
  notes text,
  created_at timestamptz default now()
);
alter table suppliers enable row level security;
create policy "store owner" on suppliers
  using (store_id = my_store_id());

-- Gastos
create table expenses (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references stores(id) on delete cascade not null,
  supplier_id uuid references suppliers(id) on delete set null,
  description text not null,
  category text not null default 'otros',
  expense_type text not null default 'variable',
  amount numeric(12,2) not null,
  date date not null,
  notes text,
  created_at timestamptz default now()
);
alter table expenses enable row level security;
create policy "store owner" on expenses
  using (store_id = my_store_id());

-- Socios
create table partners (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references stores(id) on delete cascade not null,
  name text not null,
  percentage numeric(5,2) not null check (percentage > 0 and percentage <= 100),
  created_at timestamptz default now()
);
alter table partners enable row level security;
create policy "store owner" on partners
  using (store_id = my_store_id());`}
            </pre>
          </details>
        </div>
      </div>
    </Card>
  )
}

// ─── Partner Manager ───────────────────────────────────────────────────────────

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
      if (editId) {
        await onUpdate(editId, name, p)
      } else {
        await onAdd(name, p)
      }
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

      {/* Progress bar */}
      {partners.length > 0 && (
        <div className="mb-4">
          <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
            {partners.map((p, i) => {
              const colors = [
                'bg-indigo-500', 'bg-emerald-500', 'bg-amber-500',
                'bg-purple-500', 'bg-pink-500', 'bg-cyan-500',
              ]
              return (
                <div
                  key={p.id}
                  className={`${colors[i % colors.length]} transition-all`}
                  style={{ width: `${p.percentage}%` }}
                  title={`${p.name}: ${p.percentage}%`}
                />
              )
            })}
            {remaining > 0 && (
              <div className="bg-gray-200 flex-1" title={`Sin asignar: ${remaining.toFixed(1)}%`} />
            )}
          </div>
          <div className="flex items-center justify-between mt-1">
            <p className="text-[10px] text-gray-400">Asignado: {totalPct.toFixed(1)}%</p>
            {remaining > 0 && (
              <p className="text-[10px] text-amber-500 font-semibold">Sin asignar: {remaining.toFixed(1)}%</p>
            )}
            {totalPct > 100 && (
              <p className="text-[10px] text-red-500 font-semibold">⚠ Superás el 100%</p>
            )}
          </div>
        </div>
      )}

      {/* Partner list */}
      <div className="space-y-2 mb-3">
        {partners.map((p, i) => {
          const colors = [
            'bg-indigo-500', 'bg-emerald-500', 'bg-amber-500',
            'bg-purple-500', 'bg-pink-500', 'bg-cyan-500',
          ]
          return (
            <div key={p.id} className="flex items-center gap-3 py-1.5">
              <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${colors[i % colors.length]}`} />
              <p className="text-sm font-medium text-gray-800 flex-1">{p.name}</p>
              <p className="text-sm font-black text-gray-700">{p.percentage}%</p>
              <button
                onClick={() => startEdit(p)}
                className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-indigo-600"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                onClick={() => onDelete(p.id)}
                className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )
        })}
      </div>

      {/* Add/edit form */}
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
              type="number"
              min="0.1"
              max="100"
              step="0.1"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 pr-7"
              placeholder="50"
              value={pct}
              onChange={(e) => setPct(e.target.value)}
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">%</span>
          </div>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-2"
          >
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

  const colors = [
    { dot: 'bg-indigo-500', badge: 'bg-indigo-100 text-indigo-700' },
    { dot: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700' },
    { dot: 'bg-amber-500', badge: 'bg-amber-100 text-amber-700' },
    { dot: 'bg-purple-500', badge: 'bg-purple-100 text-purple-700' },
    { dot: 'bg-pink-500', badge: 'bg-pink-100 text-pink-700' },
    { dot: 'bg-cyan-500', badge: 'bg-cyan-100 text-cyan-700' },
  ]

  return (
    <Card className="overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <p className="font-bold text-gray-800 text-sm">Distribución de Utilidades</p>
          <p className="text-xs text-gray-400">Resultado neto: {' '}
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
          const c = colors[i % colors.length]
          return (
            <div key={p.id} className="flex items-center gap-4 px-5 py-3.5">
              <div className={`w-3 h-3 rounded-full shrink-0 ${c.dot}`} />
              <p className="flex-1 font-semibold text-gray-800">{p.name}</p>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${c.badge}`}>
                {p.percentage}%
              </span>
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

// ─── P&L Monthly Row ───────────────────────────────────────────────────────────

interface MonthlyRow {
  month: number
  revenue: number
  fixedCosts: number
  variableCosts: number
  result: number
}

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

  // Break-even: CF / (1 - CV/Ingresos) — punto donde resultado = 0
  const avgFixedCosts = activeMonths.length > 0 ? totals.fixedCosts / activeMonths.length : 0
  const avgRevenue = activeMonths.length > 0 ? totals.revenue / activeMonths.length : 0
  const avgVarCosts = activeMonths.length > 0 ? totals.variableCosts / activeMonths.length : 0
  const contributionMarginRatio = avgRevenue > 0 ? (avgRevenue - avgVarCosts) / avgRevenue : 0
  const breakEven = contributionMarginRatio > 0 ? avgFixedCosts / contributionMarginRatio : 0

  return (
    <div className="space-y-5">
      {/* Break-even card */}
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
                (promedio basado en {activeMonths.length} mes{activeMonths.length !== 1 ? 'es' : ''} con datos)
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

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <p className="font-bold text-gray-800 text-sm">Estado de Resultados — {year}</p>
          <Button
            onClick={onExport}
            variant="ghost"
            className="text-xs flex items-center gap-1.5 text-gray-500 hover:text-emerald-700"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar Excel
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
                  <tr
                    key={r.month}
                    className={`transition-colors ${isEmpty ? 'opacity-40' : 'hover:bg-gray-50'}`}
                  >
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
                        <button
                          onClick={() => setExpanded(expanded === r.month ? null : r.month)}
                          className="text-gray-400 hover:text-gray-700 p-1 rounded"
                        >
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

type Tab = 'gastos' | 'pnl' | 'proveedores'

export default function ExpensesPage() {
  const [tab, setTab] = useState<Tab>('gastos')
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [partners, setPartners] = useState<Partner[]>([])
  const [revenueOrders, setRevenueOrders] = useState<{ total: number; created_at: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [dbError, setDbError] = useState(false)
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [showSupplierForm, setShowSupplierForm] = useState(false)
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null)
  const [search, setSearch] = useState('')
  const [fromDate, setFromDate] = useState(thirtyDaysAgo)
  const [toDate, setToDate] = useState(today)
  const [pnlYear, setPnlYear] = useState(currentYear)
  const [typeFilter, setTypeFilter] = useState<'all' | 'fijo' | 'variable'>('all')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [exp, sup] = await Promise.all([
        expensesApi.listExpenses({ from: fromDate, to: toDate }),
        expensesApi.listSuppliers(),
      ])
      setExpenses(exp)
      setSuppliers(sup)
      setDbError(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('does not exist') || msg.includes('relation') || msg.includes('42P01')) {
        setDbError(true)
      } else {
        showToast('error', 'Error al cargar datos')
      }
    } finally {
      setLoading(false)
    }
  }, [fromDate, toDate])

  const loadPnLData = useCallback(async () => {
    setLoading(true)
    try {
      const [yearExpenses, revenue, partnerList] = await Promise.all([
        expensesApi.listExpenses({
          from: `${pnlYear}-01-01`,
          to: `${pnlYear}-12-31`,
        }),
        expensesApi.getMonthlyRevenue(pnlYear),
        expensesApi.listPartners(),
      ])
      setExpenses(yearExpenses)
      setRevenueOrders(revenue)
      setPartners(partnerList)
      setDbError(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('does not exist') || msg.includes('relation') || msg.includes('42P01')) {
        setDbError(true)
      } else {
        showToast('error', 'Error al cargar P&L')
      }
    } finally {
      setLoading(false)
    }
  }, [pnlYear])

  useEffect(() => {
    if (tab === 'pnl') {
      loadPnLData()
    } else {
      loadData()
    }
  }, [tab, loadData, loadPnLData])

  // P&L monthly rows
  const pnlRows: MonthlyRow[] = useMemo(() => {
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

  // Excel export P&L
  const handleExportPnL = () => {
    const rows = pnlRows.map((r) => ({
      Mes: MONTHS[r.month - 1],
      Ingresos: r.revenue,
      'Gastos Fijos': r.fixedCosts,
      'Gastos Variables': r.variableCosts,
      'Total Egresos': r.fixedCosts + r.variableCosts,
      Resultado: r.result,
      'Margen %': r.revenue > 0 ? +((r.result / r.revenue) * 100).toFixed(2) : 0,
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, `P&L ${pnlYear}`)
    XLSX.writeFile(wb, `pnl_${pnlYear}.xlsx`)
  }

  const handleCreateExpense = async (data: Parameters<typeof expensesApi.createExpense>[0]) => {
    await expensesApi.createExpense(data)
    showToast('success', 'Gasto registrado')
    setShowExpenseForm(false)
    loadData()
  }

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('¿Eliminar este gasto?')) return
    await expensesApi.deleteExpense(id)
    showToast('success', 'Gasto eliminado')
    loadData()
  }

  const handleSaveSupplier = async (data: Parameters<typeof expensesApi.createSupplier>[0]) => {
    if (editSupplier) {
      await expensesApi.updateSupplier(editSupplier.id, data)
      showToast('success', 'Proveedor actualizado')
    } else {
      await expensesApi.createSupplier(data)
      showToast('success', 'Proveedor creado')
    }
    setShowSupplierForm(false)
    setEditSupplier(null)
    loadData()
  }

  const handleDeleteSupplier = async (id: string) => {
    if (!confirm('¿Eliminar este proveedor?')) return
    await expensesApi.deleteSupplier(id)
    showToast('success', 'Proveedor eliminado')
    loadData()
  }

  const handleAddPartner = async (name: string, percentage: number) => {
    await expensesApi.createPartner({ name, percentage })
    showToast('success', 'Socio agregado')
    const updated = await expensesApi.listPartners()
    setPartners(updated)
  }

  const handleUpdatePartner = async (id: string, name: string, percentage: number) => {
    await expensesApi.updatePartner(id, { name, percentage })
    showToast('success', 'Socio actualizado')
    const updated = await expensesApi.listPartners()
    setPartners(updated)
  }

  const handleDeletePartner = async (id: string) => {
    if (!confirm('¿Eliminar este socio?')) return
    await expensesApi.deletePartner(id)
    showToast('success', 'Socio eliminado')
    const updated = await expensesApi.listPartners()
    setPartners(updated)
  }

  // Filtered expenses for Gastos tab
  const filteredExpenses = expenses.filter((e) => {
    const matchSearch =
      e.description.toLowerCase().includes(search.toLowerCase()) ||
      (e.supplier?.name ?? '').toLowerCase().includes(search.toLowerCase())
    const matchType = typeFilter === 'all' || e.expense_type === typeFilter
    return matchSearch && matchType
  })

  const totalFijo = filteredExpenses.filter((e) => e.expense_type === 'fijo').reduce((s, e) => s + e.amount, 0)
  const totalVariable = filteredExpenses.filter((e) => e.expense_type === 'variable').reduce((s, e) => s + e.amount, 0)
  const totalPeriod = totalFijo + totalVariable

  const filteredSuppliers = suppliers.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.contact_name ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const TAB_CONFIG: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'gastos', label: 'Gastos', icon: <TrendingDown className="w-3.5 h-3.5" /> },
    { id: 'pnl', label: 'P&L', icon: <BarChart3 className="w-3.5 h-3.5" /> },
    { id: 'proveedores', label: 'Proveedores', icon: <Store className="w-3.5 h-3.5" /> },
  ]

  return (
    <FeatureGuard feature="expenses" minPlan="pro">
      <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900">Gastos & Proveedores</h1>
              <p className="text-xs text-gray-500">Controlá tus costos fijos, variables y tu rentabilidad</p>
            </div>
          </div>
          {tab !== 'pnl' && (
            <Button
              onClick={() =>
                tab === 'gastos'
                  ? setShowExpenseForm(true)
                  : (setEditSupplier(null), setShowSupplierForm(true))
              }
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {tab === 'gastos' ? 'Nuevo Gasto' : 'Nuevo Proveedor'}
            </Button>
          )}
        </div>

        {dbError && <SetupBanner />}

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
          {TAB_CONFIG.map((t) => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setSearch('') }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                tab === t.id ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* ── GASTOS TAB ── */}
        {tab === 'gastos' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
                <Search className="w-4 h-4 text-gray-400" />
                <input
                  className="text-sm outline-none w-36"
                  placeholder="Buscar..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <input
                type="date"
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
              <span className="text-gray-400 text-sm">→</span>
              <input
                type="date"
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
              {/* Type filter */}
              <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                {(['all', 'fijo', 'variable'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setTypeFilter(f)}
                    className={`px-3 py-1 rounded-md text-xs font-bold uppercase transition-all ${
                      typeFilter === f ? 'bg-white shadow-sm text-gray-800' : 'text-gray-400'
                    }`}
                  >
                    {f === 'all' ? 'Todos' : f === 'fijo' ? '📌 Fijos' : '📊 Variables'}
                  </button>
                ))}
              </div>
            </div>

            {/* Summary cards */}
            {!dbError && !loading && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <Card className="p-4">
                  <p className="text-xs text-gray-500 font-medium">Total período</p>
                  <p className="text-2xl font-black text-gray-900 mt-1">{formatPrice(totalPeriod)}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{filteredExpenses.length} registros</p>
                </Card>
                <Card className="p-4 border-indigo-100 bg-indigo-50">
                  <p className="text-xs text-indigo-600 font-semibold flex items-center gap-1">📌 Gastos Fijos</p>
                  <p className="text-2xl font-black text-indigo-700 mt-1">{formatPrice(totalFijo)}</p>
                  <p className="text-[10px] text-indigo-400 mt-1">
                    {totalPeriod > 0 ? ((totalFijo / totalPeriod) * 100).toFixed(1) : 0}% del total
                  </p>
                </Card>
                <Card className="p-4 border-amber-100 bg-amber-50">
                  <p className="text-xs text-amber-600 font-semibold flex items-center gap-1">📊 Gastos Variables</p>
                  <p className="text-2xl font-black text-amber-700 mt-1">{formatPrice(totalVariable)}</p>
                  <p className="text-[10px] text-amber-400 mt-1">
                    {totalPeriod > 0 ? ((totalVariable / totalPeriod) * 100).toFixed(1) : 0}% del total
                  </p>
                </Card>
              </div>
            )}

            {/* Table */}
            <Card className="overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                </div>
              ) : filteredExpenses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <TrendingDown className="w-10 h-10 mb-3 opacity-30" />
                  <p className="text-sm font-medium">Sin gastos en este período</p>
                  <p className="text-xs mt-1">Registrá tu primer gasto con el botón de arriba</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-left bg-gray-50">
                        <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha</th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Descripción</th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tipo</th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Categoría</th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Proveedor</th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Monto</th>
                        <th className="px-4 py-3 w-8" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredExpenses.map((exp) => {
                        const cat = getCategoryMeta(exp.category)
                        return (
                          <tr key={exp.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">
                              {new Date(exp.date + 'T00:00:00').toLocaleDateString('es-AR', {
                                day: '2-digit', month: 'short', year: 'numeric',
                              })}
                            </td>
                            <td className="px-4 py-3 font-medium text-gray-900">
                              {exp.description}
                              {exp.notes && <p className="text-xs text-gray-400 font-normal">{exp.notes}</p>}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                exp.expense_type === 'fijo'
                                  ? 'bg-indigo-100 text-indigo-700'
                                  : 'bg-amber-100 text-amber-700'
                              }`}>
                                {exp.expense_type === 'fijo' ? '📌 Fijo' : '📊 Variable'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cat.color}`}>
                                {cat.label}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-500 text-xs">{exp.supplier?.name ?? '—'}</td>
                            <td className="px-4 py-3 text-right font-bold text-gray-900">
                              {formatPrice(exp.amount)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => handleDeleteExpense(exp.id)}
                                className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-600 text-gray-400 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ── P&L TAB ── */}
        {tab === 'pnl' && (
          <FeatureGuard feature="pnl" minPlan="vip">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Año</label>
                <select
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                  value={pnlYear}
                  onChange={(e) => setPnlYear(Number(e.target.value))}
                >
                  {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                </div>
              ) : (
                <>
                  <PnLTable rows={pnlRows} year={pnlYear} onExport={handleExportPnL} />

                  {/* Socios y distribución */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
                    <PartnerManager
                      partners={partners}
                      onAdd={handleAddPartner}
                      onUpdate={handleUpdatePartner}
                      onDelete={handleDeletePartner}
                    />
                    <DistributionTable
                      partners={partners}
                      netResult={pnlRows.reduce((s, r) => s + r.result, 0)}
                    />
                  </div>
                </>
              )}
            </div>
          </FeatureGuard>
        )}

        {/* ── PROVEEDORES TAB ── */}
        {tab === 'proveedores' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-3 py-2 w-fit">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                className="text-sm outline-none w-48"
                placeholder="Buscar proveedor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
              </div>
            ) : filteredSuppliers.length === 0 ? (
              <Card className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Store className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm font-medium">Sin proveedores registrados</p>
                <p className="text-xs mt-1">Añadí tu primer proveedor para asociarlo a tus gastos</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredSuppliers.map((s) => (
                  <Card key={s.id} className="p-5 flex flex-col gap-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold text-gray-900">{s.name}</p>
                        {s.category && (
                          <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-full">
                            {s.category}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => { setEditSupplier(s); setShowSupplierForm(true) }}
                          className="p-1.5 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 text-gray-400 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteSupplier(s.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-600 text-gray-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1.5 text-xs text-gray-500">
                      {s.contact_name && <p className="flex items-center gap-2"><Store className="w-3.5 h-3.5 shrink-0" />{s.contact_name}</p>}
                      {s.phone && <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 shrink-0" />{s.phone}</p>}
                      {s.email && <p className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 shrink-0" />{s.email}</p>}
                      {s.notes && <p className="text-gray-400 italic">{s.notes}</p>}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showExpenseForm && (
        <ExpenseForm
          suppliers={suppliers}
          onSave={handleCreateExpense}
          onClose={() => setShowExpenseForm(false)}
        />
      )}

      {showSupplierForm && (
        <SupplierForm
          initial={editSupplier}
          onSave={handleSaveSupplier}
          onClose={() => { setShowSupplierForm(false); setEditSupplier(null) }}
        />
      )}
    </FeatureGuard>
  )
}
