import { useState, useEffect, FormEvent } from 'react'
import { Plus, Pencil, Trash2, FolderOpen, ArrowUp, ArrowDown } from 'lucide-react'
import { Card, Button, Input, Modal, LoadingSpinner, EmptyState, ConfirmDialog } from '../../components/common'
import { showToast } from '../../components/common/Toast'
import { categoriesApi } from '../../services/api'
import { Category } from '../../types'
import { useAuth } from '../../contexts/AuthContext'

export default function CategoriesPage() {
  const { selectedStoreId } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Form fields
  const [name, setName] = useState('')
  const [sortOrder, setSortOrder] = useState('')
  const [saving, setSaving] = useState(false)

  const loadCategories = async () => {
    try {
      const data = await categoriesApi.list()
      setCategories(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Error cargando categorías:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCategories()
  }, [selectedStoreId])

  const openCreate = () => {
    setEditingCategory(null)
    setName('')
    setSortOrder(String(categories.length + 1))
    setModalOpen(true)
  }

  const openEdit = (cat: Category) => {
    setEditingCategory(cat)
    setName(cat.name)
    setSortOrder(String(cat.sort_order))
    setModalOpen(true)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      showToast('error', 'El nombre es obligatorio')
      return
    }

    setSaving(true)
    try {
      if (editingCategory) {
        await categoriesApi.update(editingCategory.id, { name, sort_order: Number(sortOrder) || 0 })
        showToast('success', 'Categoría actualizada')
      } else {
        await categoriesApi.create({ name, sort_order: Number(sortOrder) || 0 })
        showToast('success', 'Categoría creada')
      }
      setModalOpen(false)
      loadCategories()
    } catch (err) {
      console.error('Category handleSave error:', err)
      const msg = err instanceof Error ? err.message : 'Error al guardar la categoría'
      showToast('error', msg)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      await categoriesApi.deleteCategory(deleteId)
      showToast('success', 'Categoría eliminada')
      setDeleteId(null)
      loadCategories()
    } catch {
      showToast('error', 'Error al eliminar la categoría')
    } finally {
      setDeleting(false)
    }
  }

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= categories.length) return

    const newCategories = [...categories]
    const current = { ...newCategories[index] }
    const target = { ...newCategories[newIndex] }

    // Swap sort_order
    const tempOrder = current.sort_order
    current.sort_order = target.sort_order
    target.sort_order = tempOrder

    newCategories[index] = target
    newCategories[newIndex] = current

    setCategories(newCategories)

    try {
      await Promise.all([
        categoriesApi.update(current.id, { sort_order: current.sort_order }),
        categoriesApi.update(target.id, { sort_order: target.sort_order })
      ])
      showToast('success', 'Orden actualizado')
    } catch (err) {
      showToast('error', 'Error al guardar el orden')
      loadCategories() // Revertir
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Categorías</h1>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4" />
          Nueva Categoría
        </Button>
      </div>

      {loading ? (
        <LoadingSpinner text="Cargando categorías..." />
      ) : categories.length === 0 ? (
        <EmptyState
          icon={<FolderOpen className="w-16 h-16" />}
          title="No hay categorías"
          description="Crea categorías para organizar tus productos"
          action={
            <Button onClick={openCreate}>
              <Plus className="w-4 h-4" />
              Crear categoría
            </Button>
          }
        />
      ) : (
        <Card padding={false}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400">
                <th className="px-4 py-3 text-center w-24">Orden</th>
                <th className="text-left px-4 py-3">Nombre</th>
                <th className="text-left px-4 py-3 hidden sm:table-cell">Productos</th>
                <th className="text-right px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {categories.map((cat, idx) => (
                <tr key={cat.id} className="group hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex flex-col items-center gap-1 group-hover:opacity-100 transition-opacity">
                      <button
                        disabled={idx === 0}
                        onClick={() => handleMove(idx, 'up')}
                        className={`p-1 rounded-lg hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 transition-all ${idx === 0 ? 'invisible' : ''}`}
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        disabled={idx === categories.length - 1}
                        onClick={() => handleMove(idx, 'down')}
                        className={`p-1 rounded-lg hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 transition-all ${idx === categories.length - 1 ? 'invisible' : ''}`}
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-black text-gray-900 tracking-tight leading-none mb-1">{cat.name}</td>
                  <td className="px-4 py-3 text-gray-600 font-bold text-[10px] uppercase hidden sm:table-cell">{cat.product_count ?? 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(cat)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteId(cat.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Modal crear/editar */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingCategory ? 'Editar categoría' : 'Nueva categoría'}
        size="sm"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nombre"
            placeholder="Ej: Hamburguesas"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            label="Orden"
            type="number"
            placeholder="1"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={saving}>
              {editingCategory ? 'Guardar' : 'Crear'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirmar eliminación */}
      <ConfirmDialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Eliminar categoría"
        message="¿Estás seguro? Los productos de esta categoría quedarán sin categoría."
        confirmText="Eliminar"
        loading={deleting}
      />
    </div>
  )
}
