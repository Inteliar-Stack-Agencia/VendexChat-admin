import { useState, useEffect, useRef } from 'react'
import {
  Plus,
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
  X,
  Check,
  GripVertical,
  UtensilsCrossed,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react'
import { Button, Badge } from '../../components/common'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import EmptyState from '../../components/common/EmptyState'
import { showToast } from '../../components/common/Toast'
import { modifiersApi } from '../../services/modifiersApi'
import { productsApi } from '../../services/productsApi'
import type { ModifierGroup, ModifierOption, Product } from '../../types'
import { formatPrice } from '../../utils/helpers'
import FeatureGuard from '../../components/FeatureGuard'

// ─── Inline option row used in form ────────────────────────────────────────
interface DraftOption {
  id?: string
  name: string
  price_delta: number | string
}

const emptyOption = (): DraftOption => ({ name: '', price_delta: 0 })

// ─── Group Form Modal ───────────────────────────────────────────────────────
interface GroupFormProps {
  initial?: ModifierGroup | null
  products: Product[]
  onSave: () => void
  onClose: () => void
}

function GroupFormModal({ initial, products, onSave, onClose }: GroupFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [selectionType, setSelectionType] = useState<'single' | 'multiple'>(initial?.selection_type ?? 'single')
  const [required, setRequired] = useState(initial?.required ?? false)
  const [maxSel, setMaxSel] = useState<string>(initial?.max_selections?.toString() ?? '')
  const [options, setOptions] = useState<DraftOption[]>(
    initial?.options && initial.options.length > 0
      ? initial.options.map((o) => ({ id: o.id, name: o.name, price_delta: o.price_delta }))
      : [emptyOption()]
  )
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>(initial?.product_ids ?? [])
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    nameRef.current?.focus()
  }, [])

  const addOption = () => setOptions((prev) => [...prev, emptyOption()])
  const removeOption = (i: number) => setOptions((prev) => prev.filter((_, idx) => idx !== i))
  const updateOption = (i: number, field: keyof DraftOption, val: string) => {
    setOptions((prev) => prev.map((o, idx) => (idx === i ? { ...o, [field]: val } : o)))
  }

  const toggleProduct = (id: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    )
  }

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!name.trim()) errs.name = 'El nombre es obligatorio'
    const validOptions = options.filter((o) => o.name.trim())
    if (validOptions.length === 0) errs.options = 'Agregá al menos una opción'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      const payload = {
        name,
        description,
        selection_type: selectionType,
        required,
        min_selections: required ? 1 : 0,
        max_selections: selectionType === 'multiple' && maxSel ? parseInt(maxSel) : null,
        options: options
          .filter((o) => o.name.trim())
          .map((o) => ({ id: o.id, name: o.name, price_delta: parseFloat(String(o.price_delta)) || 0 })),
        product_ids: selectedProductIds,
      }
      if (initial) {
        await modifiersApi.updateGroup(initial.id, payload)
        showToast('success', 'Grupo actualizado')
      } else {
        await modifiersApi.createGroup(payload)
        showToast('success', 'Grupo creado')
      }
      onSave()
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-lg font-bold text-gray-900">
            {initial ? 'Editar grupo' : 'Nuevo grupo de personalización'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del grupo *</label>
            <input
              ref={nameRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Elige tu acompañamiento, Adicionales, Opciones"
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${errors.name ? 'border-red-400' : 'border-gray-300'}`}
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción (opcional)</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej: Seleccioná hasta 2 opciones"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Selection type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de selección</label>
            <div className="grid grid-cols-2 gap-3">
              {([
                { value: 'single', label: 'Una sola opción', hint: 'El cliente elige 1' },
                { value: 'multiple', label: 'Múltiples opciones', hint: 'El cliente elige varias' },
              ] as const).map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setSelectionType(t.value)}
                  className={`p-3 rounded-xl border-2 text-left transition-colors ${
                    selectionType === t.value
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className={`text-sm font-semibold ${selectionType === t.value ? 'text-emerald-700' : 'text-gray-700'}`}>
                    {t.label}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{t.hint}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Required + Max */}
          <div className="flex items-center gap-4 flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={required}
                onChange={(e) => setRequired(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 border-gray-300 focus:ring-emerald-500"
              />
              <span className="text-sm font-medium text-gray-700">Obligatorio</span>
            </label>
            {selectionType === 'multiple' && (
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 shrink-0">Máx. opciones:</label>
                <input
                  type="number"
                  min="1"
                  value={maxSel}
                  onChange={(e) => setMaxSel(e.target.value)}
                  placeholder="Sin límite"
                  className="w-24 px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            )}
          </div>

          {/* Options */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Opciones *</label>
              <button
                type="button"
                onClick={addOption}
                className="text-xs text-emerald-600 font-semibold hover:text-emerald-700 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar opción
              </button>
            </div>
            {errors.options && <p className="text-xs text-red-500 mb-2">{errors.options}</p>}
            <div className="space-y-2">
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <GripVertical className="w-4 h-4 text-gray-300 shrink-0" />
                  <input
                    value={opt.name}
                    onChange={(e) => updateOption(i, 'name', e.target.value)}
                    placeholder={`Opción ${i + 1} (ej: Papas extra)`}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <div className="relative shrink-0">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">+$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={opt.price_delta}
                      onChange={(e) => updateOption(i, 'price_delta', e.target.value)}
                      className="w-24 pl-7 pr-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  {options.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeOption(i)}
                      className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1.5">Ingresá $0 para opciones sin costo adicional</p>
          </div>

          {/* Products */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Aplicar a productos{' '}
              <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            {products.length === 0 ? (
              <p className="text-xs text-gray-400">No hay productos cargados aún.</p>
            ) : (
              <div className="border border-gray-200 rounded-xl overflow-hidden max-h-40 overflow-y-auto">
                {products.map((p) => (
                  <label
                    key={p.id}
                    className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-0"
                  >
                    <input
                      type="checkbox"
                      checked={selectedProductIds.includes(p.id)}
                      onChange={() => toggleProduct(p.id)}
                      className="w-4 h-4 rounded text-emerald-600 border-gray-300 focus:ring-emerald-500"
                    />
                    <span className="text-sm text-gray-700 flex-1">{p.name}</span>
                    {selectedProductIds.includes(p.id) && (
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100"
          >
            Cancelar
          </button>
          <Button onClick={handleSave} loading={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6">
            {initial ? 'Guardar cambios' : 'Crear grupo'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Group Card (Rappi-style collapsible) ───────────────────────────────────
interface GroupCardProps {
  group: ModifierGroup
  onEdit: (g: ModifierGroup) => void
  onDelete: (id: string) => void
  onToggle: (id: string, active: boolean) => void
}

function GroupCard({ group, onEdit, onDelete, onToggle }: GroupCardProps) {
  const [expanded, setExpanded] = useState(false)

  const selLabel = group.selection_type === 'single' ? 'Una sola opción' : 'Múltiples opciones'

  return (
    <div className={`bg-white border rounded-2xl overflow-hidden transition-all ${group.is_active ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}>
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-4">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="shrink-0 text-gray-400 hover:text-gray-600"
          aria-label={expanded ? 'Colapsar' : 'Expandir'}
        >
          {expanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>

        <div className="flex-1 min-w-0" onClick={() => setExpanded((v) => !v)} role="button">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-gray-900">{group.name}</h3>
            <Badge variant={group.required ? 'warning' : 'default'} size="sm">
              {group.required ? 'Obligatorio' : 'Opcional'}
            </Badge>
            <Badge variant="default" size="sm">{selLabel}</Badge>
          </div>
          {group.product_names && group.product_names.length > 0 && (
            <p className="text-xs text-gray-400 mt-0.5 truncate">
              Aplicado en:{' '}
              <span className="text-emerald-600 font-medium">
                {group.product_names.join(', ')}
              </span>
            </p>
          )}
          {group.description && (
            <p className="text-xs text-gray-400 mt-0.5">{group.description}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onToggle(group.id, !group.is_active)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
            title={group.is_active ? 'Desactivar' : 'Activar'}
          >
            {group.is_active
              ? <ToggleRight className="w-5 h-5 text-emerald-500" />
              : <ToggleLeft className="w-5 h-5 text-gray-400" />
            }
          </button>
          <button
            onClick={() => onEdit(group)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
            title="Editar"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(group.id)}
            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"
            title="Eliminar"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Options list (expanded) */}
      {expanded && (
        <div className="border-t border-gray-100">
          {(!group.options || group.options.length === 0) ? (
            <p className="px-6 py-4 text-sm text-gray-400 italic">Sin opciones cargadas.</p>
          ) : (
            group.options.map((opt: ModifierOption, i) => (
              <div
                key={opt.id ?? i}
                className="flex items-center gap-4 px-6 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50/50"
              >
                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                  <UtensilsCrossed className="w-4 h-4 text-gray-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-400">Opción {i + 1}</p>
                  <p className="text-sm font-semibold text-gray-800">{opt.name}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-gray-400">Precio adicional</p>
                  <p className="text-sm font-semibold text-gray-700">
                    {opt.price_delta > 0 ? `+ ${formatPrice(opt.price_delta)}` : '+ $0'}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────────
export default function ModifiersPage() {
  const [groups, setGroups] = useState<ModifierGroup[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [modalGroup, setModalGroup] = useState<ModifierGroup | null | undefined>(undefined) // undefined = closed, null = new

  const load = async () => {
    setLoading(true)
    try {
      const [grps, prods] = await Promise.all([
        modifiersApi.listGroups(),
        productsApi.list({ limit: 200 }).then((r) => r.data),
      ])
      setGroups(grps)
      setProducts(prods)
    } catch (err) {
      showToast('error', 'Error cargando personalizaciones')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este grupo de personalización? Se desvinculará de todos los productos.')) return
    try {
      await modifiersApi.deleteGroup(id)
      showToast('success', 'Grupo eliminado')
      setGroups((prev) => prev.filter((g) => g.id !== id))
    } catch {
      showToast('error', 'Error al eliminar')
    }
  }

  const handleToggle = async (id: string, active: boolean) => {
    try {
      await modifiersApi.toggleGroupActive(id, active)
      setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, is_active: active } : g)))
    } catch {
      showToast('error', 'Error al cambiar estado')
    }
  }

  const handleSaved = () => {
    setModalGroup(undefined)
    load()
  }

  return (
    <FeatureGuard feature="modifiers" minPlan="pro">
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Personalizaciones</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Creá grupos de adicionales y opciones para tus productos (acompañamientos, extras, variantes, etc.)
          </p>
        </div>
        <Button
          onClick={() => setModalGroup(null)}
          className="bg-slate-900 hover:bg-slate-800 text-white shrink-0 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Agregar grupo
        </Button>
      </div>

      {/* Info card */}
      <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700 flex gap-3 items-start">
        <UtensilsCrossed className="w-4 h-4 mt-0.5 shrink-0 text-blue-500" />
        <p>
          Los grupos se vinculan a productos. Cuando el cliente agrega un producto al carrito, verá las opciones para personalizar su pedido (como en Rappi o PedidosYa).
        </p>
      </div>

      {/* Content */}
      {loading ? (
        <LoadingSpinner />
      ) : groups.length === 0 ? (
        <EmptyState
          icon={UtensilsCrossed}
          title="Sin personalizaciones"
          description='Creá tu primer grupo de opciones. Por ejemplo: "Adicionales", "Elige tu acompañamiento", "Sin ingredientes".'
          action={{ label: 'Crear primer grupo', onClick: () => setModalGroup(null) }}
        />
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              onEdit={(g) => setModalGroup(g)}
              onDelete={handleDelete}
              onToggle={handleToggle}
            />
          ))}
        </div>
      )}

      {/* Form modal */}
      {modalGroup !== undefined && (
        <GroupFormModal
          initial={modalGroup}
          products={products}
          onSave={handleSaved}
          onClose={() => setModalGroup(undefined)}
        />
      )}
    </div>
    </FeatureGuard>
  )
}
