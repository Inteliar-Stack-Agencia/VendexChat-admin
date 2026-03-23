import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import {
    ChevronLeft,
    Save,
    Percent,
    DollarSign,
    Tag,
    Package,
    FolderTree,
    AlertCircle,
    Clock,
} from 'lucide-react'
import { Card, Button, LoadingSpinner, Badge } from '../../components/common'
import { couponsApi, productsApi, categoriesApi } from '../../services/api'
import { CouponFormData, Product, Category } from '../../types'
import { showToast } from '../../components/common/Toast'

export default function CouponFormPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const isEdit = Boolean(id)

    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [products, setProducts] = useState<Product[]>([])
    const [categories, setCategories] = useState<Category[]>([])

    const [formData, setFormData] = useState<CouponFormData>({
        code: '',
        type: 1,
        value: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        usage_limit: '',
        min_purchase_amount: '',
        is_active: true,
        applicable_products: [],
        applicable_categories: []
    })

    const loadInitialData = async () => {
        setLoading(true)
        try {
            const [prodsRes, catsRes] = await Promise.all([
                productsApi.list({ limit: 1000 }),
                categoriesApi.list()
            ])
            setProducts(prodsRes.data)
            setCategories(catsRes)

            if (isEdit && id) {
                const coupon = await couponsApi.get(id)
                setFormData({
                    code: coupon.code,
                    type: coupon.type,
                    value: coupon.value.toString(),
                    start_date: new Date(coupon.start_date).toISOString().split('T')[0],
                    end_date: coupon.end_date ? new Date(coupon.end_date).toISOString().split('T')[0] : '',
                    usage_limit: coupon.usage_limit?.toString() || '',
                    min_purchase_amount: coupon.min_purchase_amount.toString(),
                    is_active: coupon.is_active,
                    applicable_products: coupon.applicable_products || [],
                    applicable_categories: coupon.applicable_categories || []
                })
            }
        } catch (err) {
            console.error('Error cargando datos del formulario:', err)
            showToast('error', 'Error al cargar los datos')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadInitialData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.code.trim()) return showToast('error', 'Ingresá un código para el cupón')
        if (Number(formData.value) <= 0) return showToast('error', 'El valor del descuento debe ser mayor a 0')

        // Validaciones por tipo
        if ((formData.type === 3 || formData.type === 4) && formData.applicable_products.length === 0) {
            return showToast('error', 'Seleccioná al menos un producto')
        }
        if ((formData.type === 5 || formData.type === 6) && formData.applicable_categories.length === 0) {
            return showToast('error', 'Seleccioná al menos una categoría')
        }

        setSaving(true)
        try {
            if (isEdit && id) {
                await couponsApi.update(id, formData)
                showToast('success', 'Cupón actualizado')
            } else {
                await couponsApi.create(formData)
                showToast('success', 'Cupón creado con éxito')
            }
            navigate('/coupons')
        } catch (err) {
            console.error('Error guardando cupón:', err)
            showToast('error', 'Ocurrió un error al guardar')
        } finally {
            setSaving(false)
        }
    }

    const toggleApplicableItem = (itemId: string, list: 'products' | 'categories') => {
        const field = list === 'products' ? 'applicable_products' : 'applicable_categories'
        setFormData(prev => {
            const currentList = prev[field]
            const newList = currentList.includes(itemId)
                ? currentList.filter(i => i !== itemId)
                : [...currentList, itemId]
            return { ...prev, [field]: newList }
        })
    }

    if (loading) return <LoadingSpinner text="Preparando el formulario..." />

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-20">
            {/* Header */}
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-4">
                    <Link to="/coupons" className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-100 transition-all">
                        <ChevronLeft className="w-6 h-6" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                            {isEdit ? 'Editar Cupón' : 'Crear Nuevo Cupón'}
                        </h1>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Configura las reglas de tu promoción</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        onClick={() => navigate('/coupons')}
                        className="font-black uppercase tracking-widest text-[10px] px-6 py-3 rounded-2xl"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={saving}
                        className="bg-indigo-600 text-white font-black uppercase tracking-widest text-[10px] px-10 py-3 rounded-2xl shadow-xl shadow-indigo-100 flex items-center gap-2"
                    >
                        {saving ? <Clock className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {isEdit ? 'Guardar Cambios' : 'Crear Cupón'}
                    </Button>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                {/* Panel Izquierdo: Configuración General */}
                <div className="lg:col-span-3 space-y-8">
                    <Card className="p-8 space-y-8 border-2 border-indigo-50/50 shadow-xl shadow-indigo-50/20">
                        <div className="flex items-center gap-3 border-b border-indigo-50 pb-6 mb-2">
                            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                                <Tag className="w-5 h-5 text-indigo-500" />
                            </div>
                            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Datos principales</h3>
                        </div>

                        <div className="grid grid-cols-1 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Código del Cupón</label>
                                <input
                                    type="text"
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/\s/g, '') })}
                                    placeholder="EJ: VERANO2024"
                                    className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl font-black text-slate-800 uppercase transition-all outline-none"
                                />
                                <p className="text-[9px] text-slate-400 font-medium ml-1 italic">Evitá usar espacios o caracteres especiales.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Tipo de Descuento</label>
                                    <select
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: Number(e.target.value) })}
                                        className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl font-bold text-slate-700 transition-all outline-none"
                                    >
                                        <option value={1}>% Subtotal (Todo)</option>
                                        <option value={2}>$ Monto Fijo (Todo)</option>
                                        <option value={3}>% Productos Seleccionados</option>
                                        <option value={4}>$ Productos Seleccionados</option>
                                        <option value={5}>% Categorías Seleccionadas</option>
                                        <option value={6}>$ Categorías Seleccionadas</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                                        Valor del Descuento {formData.type % 2 === 1 ? '(%)' : '($)'}
                                    </label>
                                    <div className="relative">
                                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400">
                                            {formData.type % 2 === 1 ? <Percent className="w-4 h-4" /> : <DollarSign className="w-4 h-4" />}
                                        </div>
                                        <input
                                            type="number"
                                            value={formData.value}
                                            onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                                            className="w-full pl-12 pr-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl font-black text-slate-800 transition-all outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Restricción de Selección (Productos/Categorías) */}
                    {(formData.type > 2) && (
                        <Card className="p-8 space-y-6 border-2 border-amber-50 shadow-xl shadow-amber-50/20 animate-slide-up">
                            <div className="flex items-center justify-between border-b border-amber-50 pb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                                        {formData.type <= 4 ? <Package className="w-5 h-5 text-amber-500" /> : <FolderTree className="w-5 h-5 text-amber-500" />}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                                            {formData.type <= 4 ? 'Seleccionar Productos' : 'Seleccionar Categorías'}
                                        </h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                            El descuento solo se aplicará a los items elegidos.
                                        </p>
                                    </div>
                                </div>
                                <Badge className="bg-amber-100 text-amber-700 border-amber-200 uppercase text-[9px] font-black">
                                    {formData.type <= 4 ? formData.applicable_products.length : formData.applicable_categories.length} ELEGIDOS
                                </Badge>
                            </div>

                            <div className="max-h-80 overflow-y-auto pr-2 custom-scrollbar grid grid-cols-1 md:grid-cols-2 gap-3">
                                {formData.type <= 4 ? (
                                    products.map(p => (
                                        <div
                                            key={p.id}
                                            onClick={() => toggleApplicableItem(p.id, 'products')}
                                            className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-3 ${formData.applicable_products.includes(p.id) ? 'border-amber-500 bg-amber-50' : 'border-slate-100 hover:border-amber-200 opacity-60'}`}
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-white overflow-hidden shrink-0">
                                                {p.image_url ? <img src={p.image_url} className="w-full h-full object-cover" /> : <Package className="w-4 h-4 text-slate-300 mx-auto mt-2" />}
                                            </div>
                                            <span className="text-xs font-bold text-slate-700 truncate">{p.name}</span>
                                        </div>
                                    ))
                                ) : (
                                    categories.map(c => (
                                        <div
                                            key={c.id}
                                            onClick={() => toggleApplicableItem(c.id, 'categories')}
                                            className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-3 ${formData.applicable_categories.includes(c.id) ? 'border-amber-500 bg-amber-50' : 'border-slate-100 hover:border-amber-200 opacity-60'}`}
                                        >
                                            <FolderTree className={`w-4 h-4 ${formData.applicable_categories.includes(c.id) ? 'text-amber-500' : 'text-slate-300'}`} />
                                            <span className="text-xs font-bold text-slate-700 truncate">{c.name}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </Card>
                    )}
                </div>

                {/* Panel Derecho: Restricciones y Fechas */}
                <div className="lg:col-span-2 space-y-8">
                    <Card className="p-8 space-y-8 border-2 border-slate-100 shadow-xl">
                        <div className="flex items-center gap-2 border-b border-slate-50 pb-6 mb-2">
                            <Clock className="w-5 h-5 text-slate-400" />
                            <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Restricciones</h4>
                        </div>

                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Desde</label>
                                    <input
                                        type="date"
                                        value={formData.start_date}
                                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl text-xs font-bold text-slate-700 outline-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Hasta (Opcional)</label>
                                    <input
                                        type="date"
                                        value={formData.end_date}
                                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl text-xs font-bold text-slate-700 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Límite de usos totales</label>
                                <input
                                    type="number"
                                    placeholder="Sin límite si está vacío"
                                    value={formData.usage_limit}
                                    onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
                                    className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl font-bold text-slate-700 transition-all outline-none"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Condición de uso ($ mínimo)</label>
                                <input
                                    type="number"
                                    placeholder="Monto mínimo de compra"
                                    value={formData.min_purchase_amount}
                                    onChange={(e) => setFormData({ ...formData, min_purchase_amount: e.target.value })}
                                    className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl font-bold text-slate-700 transition-all outline-none"
                                />
                            </div>

                            <div className="pt-4 flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase text-slate-900 tracking-tight">Estado del Cupón</span>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase">¿Publicar ahora?</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${formData.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6 bg-amber-50 border-amber-100 border italic shadow-sm">
                        <div className="flex gap-3">
                            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                            <p className="text-[11px] text-amber-800 font-medium leading-relaxed">
                                **Nota sobre selección múltiple:** Si elegís "Productos Seleccionados", el descuento se aplicará individualmente sobre cada item de la lista que el cliente tenga en su carrito.
                            </p>
                        </div>
                    </Card>
                </div>
            </form>
        </div>
    )
}
