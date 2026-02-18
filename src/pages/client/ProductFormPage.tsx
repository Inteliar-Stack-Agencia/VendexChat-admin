import { useState, useEffect, FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Upload, X } from 'lucide-react'
import { Button, Input, Select, Card, LoadingSpinner } from '../../components/common'
import { showToast } from '../../components/common/Toast'
import { productsApi, categoriesApi } from '../../services/api'
import { Category, ProductFormData } from '../../types'

export default function ProductFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEditing = !!id
  const navigate = useNavigate()

  const [loading, setLoading] = useState(isEditing)
  const [saving, setSaving] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  const [form, setForm] = useState<ProductFormData>({
    name: '',
    description: '',
    price: '',
    stock: '0',
    unlimited_stock: false,
    image_url: '',
    category_id: '',
    is_active: true,
    is_featured: false,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Cargar categorías
  useEffect(() => {
    categoriesApi.list().then(setCategories).catch(console.error)
  }, [])

  // Cargar producto si estamos editando
  useEffect(() => {
    if (isEditing && id) {
      productsApi
        .get(id)
        .then((product) => {
          setForm({
            name: product.name,
            description: product.description || '',
            price: product.price,
            stock: product.stock,
            unlimited_stock: product.unlimited_stock,
            image_url: product.image_url || '',
            category_id: product.category_id || '',
            is_active: product.is_active,
            is_featured: product.is_featured,
          })
          if (product.image_url) setImagePreview(product.image_url)
        })
        .catch(() => {
          showToast('error', 'Error al cargar el producto')
          navigate('/products')
        })
        .finally(() => setLoading(false))
    }
  }, [id, isEditing, navigate])

  const updateField = (field: keyof ProductFormData, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: '' }))
  }

  // Manejar imagen: convertir a base64
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      showToast('error', 'La imagen no puede superar 2MB')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result as string
      setImagePreview(base64)
      updateField('image_url', base64)
    }
    reader.readAsDataURL(file)
  }

  const removeImage = () => {
    setImagePreview(null)
    updateField('image_url', '')
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!form.name.trim()) newErrors.name = 'El nombre es obligatorio'
    if (!form.price || Number(form.price) <= 0) newErrors.price = 'El precio debe ser mayor a 0'
    if (!form.category_id) newErrors.category_id = 'Selecciona una categoría'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setSaving(true)
    try {
      const data = {
        ...form,
        price: Number(form.price),
        stock: Number(form.stock),
        category_id: form.category_id,
      }

      if (isEditing) {
        await productsApi.update(id, data)
        showToast('success', 'Producto actualizado')
      } else {
        await productsApi.create(data)
        showToast('success', 'Producto creado')
      }
      navigate('/products')
    } catch (err: any) {
      console.error('Error al guardar producto:', err)
      const msg = err?.message || (typeof err === 'string' ? err : 'Error al guardar')
      showToast('error', msg)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingSpinner text="Cargando producto..." />

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/products')} className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditing ? 'Editar producto' : 'Nuevo producto'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Información básica */}
        <Card>
          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-4">Información básica</h2>
          <div className="space-y-4">
            <Input
              label="Nombre del producto"
              placeholder="Ej: Hamburguesa doble"
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              error={errors.name}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                rows={3}
                maxLength={500}
                placeholder="Descripción del producto (opcional)"
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
              />
              <p className="text-xs text-gray-400 mt-1">{form.description.length}/500</p>
            </div>

            <Select
              label="Categoría"
              value={String(form.category_id)}
              onChange={(e) => updateField('category_id', e.target.value)}
              error={errors.category_id}
              placeholder="Seleccionar categoría"
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
            />
          </div>
        </Card>

        {/* Precio y stock */}
        <Card>
          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-4">Precio y stock</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Precio"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={String(form.price)}
              onChange={(e) => updateField('price', e.target.value)}
              error={errors.price}
            />

            <Input
              label="Stock disponible"
              type="number"
              min="0"
              placeholder="0"
              value={String(form.stock)}
              onChange={(e) => updateField('stock', e.target.value)}
              disabled={form.unlimited_stock}
            />
          </div>

          <label className="flex items-center gap-2 mt-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.unlimited_stock}
              onChange={(e) => updateField('unlimited_stock', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-sm text-gray-600">Producto sin límite de stock</span>
          </label>
        </Card>

        {/* Imagen */}
        <Card>
          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-4">Imagen</h2>
          {imagePreview ? (
            <div className="relative inline-block">
              <img src={imagePreview} alt="Preview" className="w-40 h-40 object-cover rounded-xl" />
              <button
                type="button"
                onClick={removeImage}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 transition-colors">
              <Upload className="w-8 h-8 text-gray-400 mb-2" />
              <span className="text-sm text-gray-500">Haz clic para subir imagen</span>
              <span className="text-xs text-gray-400 mt-1">Recomendado: 800x800px, máximo 2MB</span>
              <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            </label>
          )}
        </Card>

        {/* Visibilidad */}
        <Card>
          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-4">Visibilidad</h2>
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => updateField('is_active', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-sm text-gray-700">Producto activo (aparece en el catálogo)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_featured}
                onChange={(e) => updateField('is_featured', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-sm text-gray-700">Producto destacado (aparece primero)</span>
            </label>
          </div>
        </Card>

        {/* Botones */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => navigate('/products')}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            {isEditing ? 'Guardar cambios' : 'Crear producto'}
          </Button>
        </div>
      </form>
    </div>
  )
}
