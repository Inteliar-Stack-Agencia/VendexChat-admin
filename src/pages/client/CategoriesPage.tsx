import { useState, useEffect, FormEvent } from 'react'
import { Plus, Pencil, Trash2, FolderOpen } from 'lucide-react'
import { Card, Button, Input, Modal, LoadingSpinner, EmptyState, ConfirmDialog } from '../../components/common'
import { showToast } from '../../components/common/Toast'
import { categoriesApi } from '../../services/api'
import { Category } from '../../types'

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
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
  }, [])

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
      await categoriesApi.delete(deleteId)
      showToast('success', 'Categoría eliminada')
      setDeleteId(null)
      loadCategories()
    } catch {
      showToast('error', 'Error al eliminar la categoría')
    } finally {
      setDeleting(false)
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
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-500">Nombre</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 hidden sm:table-cell">Productos</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 hidden sm:table-cell">Orden</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{cat.name}</td>
                  <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{cat.product_count ?? 0}</td>
                  <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{cat.sort_order}</td>
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
