import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Pencil, Package, ArrowUp, ArrowDown, Eye, EyeOff, MinusCircle, Trash2, FolderInput, CheckSquare, Square, Check, Upload, Loader2, GripVertical, Save, X as CloseIcon } from 'lucide-react'
import { Card, LoadingSpinner, EmptyState, Pagination, Button } from '../../components/common'
import { productsApi, categoriesApi } from '../../services/api'
import { Product, Category } from '../../types'
import { formatPrice } from '../../utils/helpers'
import { showToast } from '../../components/common/Toast'
import BulkActionsToolbar from '../../components/products/BulkActionsToolbar'

// Dnd Kit Imports
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface SortableRowProps {
  product: Product
  idx: number
  isSelected: boolean
  isSorting: boolean
  uploadingId: string | null
  updatingId: string | null
  onSelect: (id: string) => void
  onUpdateStatus: (p: Product, s: 'visible' | 'no-stock' | 'hidden') => void
  onImageUpload: (id: string, e: React.ChangeEvent<HTMLInputElement>) => void
  moveArrows: React.ReactNode
}

function SortableProductRow({
  product,
  idx,
  isSelected,
  isSorting,
  uploadingId,
  updatingId,
  onSelect,
  onUpdateStatus,
  onImageUpload,
  moveArrows
}: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: product.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.5 : 1
  }

  const isVisible = product.is_active && (product.unlimited_stock || product.stock > 0)
  const isNoStock = product.is_active && !product.unlimited_stock && product.stock === 0
  const isHidden = !product.is_active || (!product.unlimited_stock && product.stock < 0)

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`group hover:bg-slate-50/50 transition-colors ${isSelected ? 'bg-indigo-50/30' : ''} ${isDragging ? 'bg-white shadow-2xl' : ''}`}
    >
      <td className="px-6 py-4">
        {isSorting ? (
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-2 hover:bg-slate-200 rounded-lg transition-colors">
            <GripVertical className="w-5 h-5 text-slate-400" />
          </div>
        ) : (
          <button
            onClick={() => onSelect(product.id)}
            className={`w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white border-slate-200 group-hover:border-indigo-300'}`}
          >
            {isSelected && <Check className="w-3.5 h-3.5" strokeWidth={4} />}
          </button>
        )}
      </td>
      <td className="px-6 py-4">
        {!isSorting && moveArrows}
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="relative group/img w-12 h-12 flex-shrink-0">
            {product.image_url ? (
              <img src={product.image_url} alt="" className="w-12 h-12 rounded-xl object-cover ring-2 ring-slate-100 shadow-sm" />
            ) : (
              <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center border-2 border-slate-100 shadow-sm font-black text-slate-300">
                <Package className="w-6 h-6" />
              </div>
            )}
            <label className={`absolute inset-0 z-10 flex items-center justify-center bg-slate-900/40 rounded-xl opacity-0 group-hover/img:opacity-100 transition-all cursor-pointer backdrop-blur-[2px] ${uploadingId === product.id ? 'opacity-100' : ''}`}>
              {uploadingId === product.id ? (
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              ) : (
                <div className="flex flex-col items-center gap-1 text-white">
                  <Upload className="w-4 h-4" />
                  <span className="text-[6px] font-black uppercase tracking-tighter">Cargar</span>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onImageUpload(product.id, e)}
                disabled={uploadingId === product.id}
              />
            </label>
          </div>
          <div>
            <p className="font-black text-slate-800 tracking-tight leading-none mb-1">{product.name}</p>
            <p className="text-[10px] text-slate-400 line-clamp-1 mb-1">{product.description}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest sm:hidden">{product.category_name || 'Sin Categoría'}</p>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 text-slate-500 font-bold text-[10px] uppercase hidden sm:table-cell">{product.category_name || '-'}</td>
      <td className="px-6 py-4 font-black text-slate-900">{formatPrice(product.price)}</td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          <button
            disabled={updatingId === product.id}
            onClick={() => onUpdateStatus(product, 'visible')}
            className={`flex flex-col items-center gap-1 p-2 w-16 rounded-xl transition-all border-2 ${isVisible ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-transparent border-transparent text-slate-300 hover:text-emerald-400'}`}
          >
            <Eye className="w-4 h-4" />
            <span className="text-[7px] font-black uppercase">Visible</span>
          </button>
          <button
            disabled={updatingId === product.id}
            onClick={() => onUpdateStatus(product, 'no-stock')}
            className={`flex flex-col items-center gap-1 p-2 w-16 rounded-xl transition-all border-2 ${isNoStock ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-transparent border-transparent text-slate-300 hover:text-amber-400'}`}
          >
            <MinusCircle className="w-4 h-4" />
            <span className="text-[7px] font-black uppercase">Sin Stock</span>
          </button>
          <button
            disabled={updatingId === product.id}
            onClick={() => onUpdateStatus(product, 'hidden')}
            className={`flex flex-col items-center gap-1 p-2 w-16 rounded-xl transition-all border-2 ${isHidden ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-transparent border-transparent text-slate-300 hover:text-rose-400'}`}
          >
            <EyeOff className="w-4 h-4" />
            <span className="text-[7px] font-black uppercase">Oculto</span>
          </button>
        </div>
      </td>
      <td className="px-6 py-4 text-right">
        <Link
          to={`/products/edit/${product.id}`}
          className="inline-flex items-center justify-center p-3 rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-900 hover:text-white transition-all shadow-sm"
        >
          <Pencil className="w-4 h-4" />
        </Link>
      </td>
    </tr>
  )
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isSortingMode, setIsSortingMode] = useState(false)
  const [isSavingOrder, setIsSavingOrder] = useState(false)
  const requestCount = useRef(0)

  // Dnd Kit Sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const loadProducts = useCallback(async () => {
    const requestId = ++requestCount.current
    setLoading(true)
    try {
      const params: Record<string, unknown> = { page, limit: 100 }
      if (search) params.search = search
      if (categoryFilter) params.category_id = categoryFilter

      const res = await productsApi.list(params as Parameters<typeof productsApi.list>[0])

      if (requestId !== requestCount.current) return

      setProducts(res.data)
      setTotalPages(res.total_pages)
    } catch (err) {
      console.error('Error cargando productos:', err)
      showToast('error', 'Error al cargar productos')
    } finally {
      if (requestId === requestCount.current) {
        setLoading(false)
      }
    }
  }, [page, search, categoryFilter])

  useEffect(() => {
    if (categories.length > 0 && !categoryFilter) return
    loadProducts()
  }, [loadProducts, categories.length])

  useEffect(() => {
    categoriesApi.list().then(res => {
      setCategories(res)
      if (res.length > 0 && !categoryFilter) {
        setCategoryFilter(res[0].id)
      }
    }).catch(console.error)
  }, []) // Solo al montar

  const handleUpdateStatus = async (product: Product, newStatus: 'visible' | 'no-stock' | 'hidden') => {
    setUpdatingId(product.id)
    try {
      let updates: any = {}
      if (newStatus === 'visible') {
        updates = { is_active: true, unlimited_stock: true }
      } else if (newStatus === 'no-stock') {
        updates = { is_active: true, unlimited_stock: false, stock: 0 }
      } else {
        updates = { is_active: false }
      }

      await productsApi.update(product.id, updates)
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, ...updates } : p))
      showToast('success', 'Estado actualizado')
    } catch (err) {
      showToast('error', 'Error al actualizar estado')
    } finally {
      setUpdatingId(null)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setProducts((items) => {
      const oldIndex = items.findIndex((i) => i.id === active.id)
      const newIndex = items.findIndex((i) => i.id === over.id)

      const newItems = arrayMove(items, oldIndex, newIndex)

      // Actualizar sort_order localmente basado en la nueva posición
      // Mantenemos la lógica de que el primero tiene el menor sort_order
      return newItems.map((item, idx) => ({
        ...item,
        sort_order: idx + 1
      }))
    })
  }

  const handleSaveOrder = async () => {
    setIsSavingOrder(true)
    try {
      // Actualización masiva de sort_order
      await Promise.all(
        products.map(p => productsApi.update(p.id, { sort_order: p.sort_order }))
      )
      showToast('success', 'Nuevo orden guardado')
      setIsSortingMode(false)
    } catch (err) {
      showToast('error', 'Error al guardar el nuevo orden')
    } finally {
      setIsSavingOrder(false)
    }
  }

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= products.length) return

    const newProducts = [...products]
    const current = { ...newProducts[index] }
    const target = { ...newProducts[newIndex] }

    // Swap sort_order
    const tempOrder = current.sort_order
    current.sort_order = target.sort_order
    target.sort_order = tempOrder

    newProducts[index] = target
    newProducts[newIndex] = current

    setProducts(newProducts)

    try {
      await Promise.all([
        productsApi.update(current.id, { sort_order: current.sort_order }),
        productsApi.update(target.id, { sort_order: target.sort_order })
      ])
      showToast('success', 'Orden actualizado')
    } catch (err) {
      showToast('error', 'Error al guardar el orden')
      loadProducts() // Revertir
    }
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredProducts.length && filteredProducts.length > 0) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredProducts.map(p => p.id))
    }
  }

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const handleBulkDelete = async () => {
    try {
      await Promise.all(selectedIds.map(id => productsApi.delete(id)))
      setProducts(prev => prev.filter(p => !selectedIds.includes(p.id)))
      setSelectedIds([])
      showToast('success', `${selectedIds.length} productos eliminados`)
    } catch (err) {
      showToast('error', 'Error al eliminar productos')
      loadProducts()
    }
  }

  const handleBulkMove = async (categoryId: string) => {
    try {
      const category = categories.find(c => c.id === categoryId)
      await Promise.all(selectedIds.map(id => productsApi.update(id, { category_id: categoryId })))
      setProducts(prev => prev.map(p =>
        selectedIds.includes(p.id)
          ? { ...p, category_id: categoryId, category_name: category?.name }
          : p
      ))
      setSelectedIds([])
      showToast('success', `${selectedIds.length} productos movidos`)
    } catch (err) {
      showToast('error', 'Error al mover productos')
      loadProducts()
    }
  }

  const handleDirectImageUpload = async (productId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      showToast('error', 'La imagen no puede superar 2MB')
      return
    }

    setUploadingId(productId)
    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = reader.result as string
      try {
        await productsApi.update(productId, { image_url: base64 })
        setProducts(prev => prev.map(p => p.id === productId ? { ...p, image_url: base64 } : p))
        showToast('success', 'Imagen actualizada')
      } catch (err) {
        showToast('error', 'Error al subir imagen')
      } finally {
        setUploadingId(null)
      }
    }
    reader.readAsDataURL(file)
  }

  // Filtrar y Ordenar en el cliente (Estrategia de doble seguridad e instantaneidad)
  const filteredProducts = products
    .filter((p) => {
      // 1. Filtrar por categoría (siempre debería coincidir con el estado categoryFilter)
      if (categoryFilter && String(p.category_id) !== String(categoryFilter)) return false

      // 2. Filtrar por estado
      if (statusFilter) {
        if (statusFilter === 'visible') return p.is_active && (p.unlimited_stock || p.stock > 0)
        if (statusFilter === 'no-stock') return p.is_active && !p.unlimited_stock && p.stock === 0
        if (statusFilter === 'hidden') return !p.is_active
      }

      return true
    })
    .sort((a, b) => {
      // 1. Prioridad: Activos vs Ocultos (Ocultos al final)
      if (a.is_active !== b.is_active) {
        return a.is_active ? -1 : 1
      }
      // 2. Secundario: El sort_order definido
      return (a.sort_order || 0) - (b.sort_order || 0)
    })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-1">
        <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Gestión de Catálogo</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (isSortingMode) {
                handleSaveOrder()
              } else {
                setIsSortingMode(true)
                showToast('info', 'Arrastrá los productos para reordenar')
              }
            }}
            disabled={isSavingOrder || loading}
            className={`inline-flex items-center justify-center gap-2 px-6 py-3 border-2 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl ${isSortingMode
              ? 'bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100'
              : 'bg-white border-indigo-100 text-indigo-600 hover:border-indigo-600 shadow-slate-100'
              }`}
          >
            {isSavingOrder ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isSortingMode ? (
              <>
                <Save className="w-4 h-4" />
                Guardar Orden
              </>
            ) : (
              <>
                <GripVertical className="w-4 h-4" />
                Ordenar Productos
              </>
            )}
          </button>

          {isSortingMode && (
            <button
              onClick={() => {
                setIsSortingMode(false)
                loadProducts() // Revertir cambios locales
              }}
              className="p-3 bg-white border-2 border-rose-100 text-rose-500 rounded-2xl hover:bg-rose-50 transition-all shadow-xl shadow-rose-50"
            >
              <CloseIcon className="w-5 h-5" />
            </button>
          )}

          <Link
            to="/products/new"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-slate-900 transition-all shadow-xl shadow-emerald-100"
          >
            <Plus className="w-4 h-4" />
            Nuevo Producto
          </Link>
        </div>
      </div>

      {/* Filtros */}
      {!isSortingMode && (
        <Card className="border-indigo-100 shadow-xl shadow-indigo-50/50">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nombre..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-medium focus:border-indigo-500 transition-all"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={categoryFilter}
                onChange={(e) => { setCategoryFilter(e.target.value); setPage(1) }}
                className="px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 focus:border-indigo-500 transition-all cursor-pointer"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 focus:border-indigo-500 transition-all cursor-pointer"
              >
                <option value="">Cualquier estado</option>
                <option value="visible">Visibles</option>
                <option value="no-stock">Sin Stock</option>
                <option value="hidden">Ocultos</option>
              </select>
            </div>
          </div>
        </Card>
      )}

      {/* Alerta de Modo Ordenar */}
      {isSortingMode && (
        <div className="bg-indigo-50 border-2 border-indigo-100 p-4 rounded-2xl flex items-center gap-3 text-indigo-700 animate-pulse">
          <GripVertical className="w-5 h-5" />
          <p className="text-sm font-bold">Modo Ordenar Activo: Arrastrá los productos desde el icono de la izquierda.</p>
        </div>
      )}

      {/* Tabla de productos */}
      {loading ? (
        <LoadingSpinner text="Cargando catálogo..." />
      ) : filteredProducts.length === 0 ? (
        <EmptyState
          title="No hay productos"
          description="Agregá tu primer producto para que aparezca en el Shop"
          action={
            <Link
              to="/products/new"
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-slate-900 shadow-xl shadow-indigo-100"
            >
              <Plus className="w-5 h-5" />
              Crear Producto
            </Link>
          }
        />
      ) : (
        <Card padding={false} className="border-indigo-100 shadow-2xl shadow-indigo-50/30 overflow-hidden">
          <div className="overflow-x-auto">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">
                    <th className="px-6 py-4 w-10">
                      {isSortingMode ? null : (
                        <button
                          onClick={toggleSelectAll}
                          className={`w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center ${selectedIds.length === filteredProducts.length && filteredProducts.length > 0 ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 hover:border-indigo-400'}`}
                        >
                          {selectedIds.length === filteredProducts.length && filteredProducts.length > 0 && <Check className="w-3.5 h-3.5" strokeWidth={4} />}
                          {selectedIds.length > 0 && selectedIds.length < filteredProducts.length && (
                            <div className="w-2 h-0.5 bg-indigo-400 rounded-full" />
                          )}
                        </button>
                      )}
                    </th>
                    <th className="px-6 py-4 text-center w-24">{isSortingMode ? 'Drag' : 'Orden'}</th>
                    <th className="text-left px-6 py-4">Producto</th>
                    <th className="text-left px-6 py-4 hidden sm:table-cell">Categoría</th>
                    <th className="text-left px-6 py-4">Precio</th>
                    <th className="text-left px-6 py-4">Estado / Stock</th>
                    <th className="text-right px-6 py-4">Editar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <SortableContext
                    items={filteredProducts.map(p => p.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {filteredProducts.map((product, idx) => (
                      <SortableProductRow
                        key={product.id}
                        product={product}
                        idx={idx}
                        isSelected={selectedIds.includes(product.id)}
                        isSorting={isSortingMode}
                        uploadingId={uploadingId}
                        updatingId={updatingId}
                        onSelect={toggleSelectOne}
                        onUpdateStatus={handleUpdateStatus}
                        onImageUpload={handleDirectImageUpload}
                        moveArrows={
                          <div className="flex flex-col items-center gap-1 group-hover:opacity-100 transition-opacity">
                            <button
                              disabled={idx === 0}
                              onClick={() => handleMove(idx, 'up')}
                              className={`p-1 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-all ${idx === 0 ? 'invisible' : ''}`}
                            >
                              <ArrowUp className="w-4 h-4" />
                            </button>
                            <button
                              disabled={idx === filteredProducts.length - 1}
                              onClick={() => handleMove(idx, 'down')}
                              className={`p-1 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-all ${idx === filteredProducts.length - 1 ? 'invisible' : ''}`}
                            >
                              <ArrowDown className="w-4 h-4" />
                            </button>
                          </div>
                        }
                      />
                    ))}
                  </SortableContext>
                </tbody>
              </table>
            </DndContext>
          </div>
          {totalPages > 1 && !isSortingMode && (
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-center">
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          )}
        </Card>
      )
      }

      {/* Barra de Acciones Masivas */}
      <BulkActionsToolbar
        selectedCount={selectedIds.length}
        categories={categories}
        onDelete={handleBulkDelete}
        onMove={handleBulkMove}
        onClear={() => setSelectedIds([])}
      />
    </div>
  )
}
