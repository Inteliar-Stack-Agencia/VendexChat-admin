import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Pencil, Package, ArrowUp, ArrowDown, Eye, EyeOff, MinusCircle } from 'lucide-react'
import { Card, LoadingSpinner, EmptyState, Pagination } from '../../components/common'
import { productsApi, categoriesApi } from '../../services/api'
import { Product, Category } from '../../types'
import { formatPrice } from '../../utils/helpers'
import { showToast } from '../../components/common/Toast'

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

  const loadProducts = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = { page, limit: 100 }
      if (search) params.search = search
      if (categoryFilter) params.category_id = categoryFilter
      const res = await productsApi.list(params as Parameters<typeof productsApi.list>[0])
      setProducts(res.data)
      setTotalPages(res.total_pages)
    } catch (err) {
      console.error('Error cargando productos:', err)
    } finally {
      setLoading(false)
    }
  }, [page, search, categoryFilter])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  useEffect(() => {
    categoriesApi.list().then(setCategories).catch(console.error)
  }, [])

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

  // Filtrar por estado en el cliente
  const filteredProducts = statusFilter
    ? products.filter((p) => {
      if (statusFilter === 'visible') return p.is_active && (p.unlimited_stock || p.stock > 0)
      if (statusFilter === 'no-stock') return p.is_active && !p.unlimited_stock && p.stock === 0
      if (statusFilter === 'hidden') return !p.is_active
      return true
    })
    : products

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-1">
        <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Gestión de Catálogo</h1>
        <Link
          to="/products/new"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-slate-900 transition-all shadow-xl shadow-emerald-100"
        >
          <Plus className="w-4 h-4" />
          Nuevo Producto
        </Link>
      </div>

      {/* Filtros */}
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
              <option value="">Todas las categorías</option>
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
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">
                  <th className="px-6 py-4 text-center w-24">Orden</th>
                  <th className="text-left px-6 py-4">Producto</th>
                  <th className="text-left px-6 py-4 hidden sm:table-cell">Categoría</th>
                  <th className="text-left px-6 py-4">Precio</th>
                  <th className="text-left px-6 py-4">Estado / Stock</th>
                  <th className="text-right px-6 py-4">Editar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((product, idx) => {
                  const isVisible = product.is_active && (product.unlimited_stock || product.stock > 0)
                  const isNoStock = product.is_active && !product.unlimited_stock && product.stock === 0
                  const isHidden = !product.is_active || (!product.unlimited_stock && product.stock < 0)

                  return (
                    <tr key={product.id} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
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
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          {product.image_url ? (
                            <img src={product.image_url} alt="" className="w-12 h-12 rounded-xl object-cover ring-2 ring-slate-100 shadow-sm" />
                          ) : (
                            <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center border-2 border-slate-100 shadow-sm font-black text-slate-300">
                              <Package className="w-6 h-6" />
                            </div>
                          )}
                          <div>
                            <p className="font-black text-slate-800 tracking-tight leading-none mb-1">{product.name}</p>
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
                            onClick={() => handleUpdateStatus(product, 'visible')}
                            className={`flex flex-col items-center gap-1 p-2 w-16 rounded-xl transition-all border-2 ${isVisible ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-transparent border-transparent text-slate-300 hover:text-emerald-400'}`}
                          >
                            <Eye className="w-4 h-4" />
                            <span className="text-[7px] font-black uppercase">Visible</span>
                          </button>
                          <button
                            disabled={updatingId === product.id}
                            onClick={() => handleUpdateStatus(product, 'no-stock')}
                            className={`flex flex-col items-center gap-1 p-2 w-16 rounded-xl transition-all border-2 ${isNoStock ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-transparent border-transparent text-slate-300 hover:text-amber-400'}`}
                          >
                            <MinusCircle className="w-4 h-4" />
                            <span className="text-[7px] font-black uppercase">Sin Stock</span>
                          </button>
                          <button
                            disabled={updatingId === product.id}
                            onClick={() => handleUpdateStatus(product, 'hidden')}
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
                })}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-center">
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
