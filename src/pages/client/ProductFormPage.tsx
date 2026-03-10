import { useState, useEffect, FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Upload, X, Sparkles, Trash2, Search } from 'lucide-react'
import { Button, Input, Select, Card, LoadingSpinner } from '../../components/common'
import ImageSuggestionModal from '../../components/products/ImageSuggestionModal'
import PexelsImageSuggestions from '../../components/products/PexelsImageSuggestions'
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
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [isImageModalOpen, setIsImageModalOpen] = useState(false)
  const [isPexelsModalOpen, setIsPexelsModalOpen] = useState(false)

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

  useEffect(() => {
    categoriesApi.list().then(res => {
      setCategories(res)
      if (!isEditing && res.length > 0) {
        setForm(prev => ({ ...prev, category_id: res[0].id }))
      }
    }).catch(console.error)
  }, [isEditing])

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
    let finalValue = value
    if (field === 'name' && typeof value === 'string') {
      finalValue = value.toUpperCase()
    } else if (field === 'description' && typeof value === 'string') {
      finalValue = value.toLowerCase()
    }

    setForm((prev) => ({ ...prev, [field]: finalValue }))
    setErrors((prev) => ({ ...prev, [field]: '' }))
  }

  // Manejar imagen: previsualizar y guardar archivo
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      showToast('error', 'La imagen no puede superar 2MB')
      return
    }

    setImageFile(file)
    const reader = new FileReader()
    reader.onload = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const removeImage = () => {
    setImagePreview(null)
    setImageFile(null)
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

      let savedProduct;
      if (isEditing) {
        savedProduct = await productsApi.update(id, data)
        showToast('success', 'Producto actualizado')
      } else {
        savedProduct = await productsApi.create(data)
        showToast('success', 'Producto creado')
      }

      // Si hay un archivo de imagen, subirlo ahora que tenemos el ID
      if (imageFile && savedProduct?.id) {
        try {
          await productsApi.uploadProductImage(String(savedProduct.id), imageFile)
        } catch (uploadErr) {
          console.error('Error uploading image after save:', uploadErr)
          showToast('error', 'Producto guardado, pero la imagen falló al subirse')
        }
      }

      navigate('/products')
    } catch (err: unknown) {
      console.error('Error al guardar producto:', err)
      const msg = err instanceof Error ? err.message : 'Error al guardar'
      showToast('error', msg)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!id || !window.confirm('¿Estás seguro de que deseas eliminar este producto?')) return

    try {
      await productsApi.delete(id)
      showToast('success', 'Producto eliminado')
      navigate('/products')
    } catch (err) {
      showToast('error', 'Error al eliminar el producto')
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase">Imagen</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPexelsModalOpen(true)}
                className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700 transition-colors bg-emerald-50 px-3 py-1.5 rounded-full"
              >
                <Search className="w-3.5 h-3.5" />
                Buscar fotos
              </button>
              <button
                type="button"
                onClick={() => setIsImageModalOpen(true)}
                className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700 transition-colors bg-indigo-50 px-3 py-1.5 rounded-full"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Sugerir con IA
              </button>
            </div>
          </div>

          {imagePreview ? (
            <div className="relative inline-block">
              <img src={imagePreview} alt="Preview" className="w-40 h-40 object-cover rounded-xl shadow-lg border-2 border-slate-100" />
              <button
                type="button"
                onClick={removeImage}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 shadow-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-all group">
              <Upload className="w-8 h-8 text-gray-400 mb-2 group-hover:text-indigo-500 transition-colors" />
              <span className="text-sm text-gray-500 font-medium">Haz clic para subir imagen</span>
              <span className="text-xs text-gray-400 mt-1 font-bold uppercase tracking-widest text-[9px]">Recomendado: 800x800px, máximo 2MB</span>
              <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            </label>
          )}

          <ImageSuggestionModal
            isOpen={isImageModalOpen}
            onClose={() => setIsImageModalOpen(false)}
            onSelect={(url) => {
              setImagePreview(url)
              updateField('image_url', url)
              setIsImageModalOpen(false)
            }}
            initialQuery={form.name}
          />

          <PexelsImageSuggestions
            isOpen={isPexelsModalOpen}
            onClose={() => setIsPexelsModalOpen(false)}
            onSelect={(url) => {
              setImagePreview(url)
              updateField('image_url', url)
              setIsPexelsModalOpen(false)
            }}
            initialQuery={form.name}
          />
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
        <div className="flex justify-between items-center gap-3">
          {isEditing ? (
            <button
              type="button"
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Eliminar producto
            </button>
          ) : <div />}

          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={() => navigate('/products')}>
              Cancelar
            </Button>
            <Button type="submit" loading={saving}>
              {isEditing ? 'Guardar cambios' : 'Crear producto'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
