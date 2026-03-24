import { useState, useEffect, useCallback, useRef } from 'react'
import {
    Search, X, Plus, Minus, Trash2, ShoppingCart, Receipt,
    CreditCard, Banknote, Smartphone, Printer, CheckCircle2,
    Package, RefreshCw, User, Building2,
} from 'lucide-react'
import { productsApi } from '../../services/productsApi'
import { categoriesApi } from '../../services/categoriesApi'
import { ordersApi } from '../../services/ordersApi'
import { formatPrice } from '../../utils/helpers'
import { showToast } from '../../components/common/Toast'
import { useAuth } from '../../contexts/AuthContext'
import type { Product, Category } from '../../types'

interface CartItem {
    product: Product
    quantity: number
}

const PAYMENT_METHODS = [
    { id: 'efectivo', label: 'Efectivo', icon: Banknote, color: 'emerald' },
    { id: 'transferencia', label: 'Transferencia', icon: Smartphone, color: 'blue' },
    { id: 'tarjeta', label: 'Tarjeta', icon: CreditCard, color: 'purple' },
]

export default function POSPage() {
    const { user } = useAuth()
    const storeName = user?.name || 'Tienda'

    const [products, setProducts] = useState<Product[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

    // Cart
    const [cart, setCart] = useState<CartItem[]>([])
    const [paymentMethod, setPaymentMethod] = useState('efectivo')
    const [customerName, setCustomerName] = useState('')
    const [customerType, setCustomerType] = useState<'particular' | 'empresa'>('particular')
    const [companyName, setCompanyName] = useState('')
    const [processing, setProcessing] = useState(false)

    // Ticket
    const [showTicket, setShowTicket] = useState(false)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [lastOrder, setLastOrder] = useState<any>(null)
    const ticketRef = useRef<HTMLDivElement>(null)

    const loadData = useCallback(async () => {
        setLoading(true)
        try {
            const [productsRes, categoriesRes] = await Promise.all([
                productsApi.list({ limit: 500 }),
                categoriesApi.list(),
            ])
            setProducts(productsRes.data.filter(p => p.is_active))
            setCategories(categoriesRes)
        } catch (err) {
            console.error('Error loading POS data:', err)
            showToast('error', 'Error al cargar productos')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { loadData() }, [loadData])

    // Filter products
    const filtered = products.filter(p => {
        if (selectedCategory && p.category_id !== selectedCategory) return false
        if (search) {
            const s = search.toLowerCase()
            return p.name.toLowerCase().includes(s)
        }
        return true
    })

    // Cart operations
    const addToCart = (product: Product) => {
        setCart(prev => {
            const existing = prev.find(item => item.product.id === product.id)
            if (existing) {
                if (!product.unlimited_stock && existing.quantity >= (product.stock || 0)) {
                    showToast('error', 'Sin stock suficiente')
                    return prev
                }
                return prev.map(item =>
                    item.product.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                )
            }
            if (!product.unlimited_stock && (product.stock || 0) <= 0) {
                showToast('error', 'Producto sin stock')
                return prev
            }
            return [...prev, { product, quantity: 1 }]
        })
    }

    const updateQuantity = (productId: string, delta: number) => {
        setCart(prev => {
            return prev
                .map(item => {
                    if (item.product.id !== productId) return item
                    const newQty = item.quantity + delta
                    if (newQty <= 0) return null
                    if (delta > 0 && !item.product.unlimited_stock && newQty > (item.product.stock || 0)) {
                        showToast('error', 'Sin stock suficiente')
                        return item
                    }
                    return { ...item, quantity: newQty }
                })
                .filter(Boolean) as CartItem[]
        })
    }

    const removeFromCart = (productId: string) => {
        setCart(prev => prev.filter(item => item.product.id !== productId))
    }

    const clearCart = () => {
        setCart([])
        setCustomerName('')
        setCustomerType('particular')
        setCompanyName('')
    }

    const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
    const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0)

    // Register sale
    const handleSale = async () => {
        if (cart.length === 0) return
        setProcessing(true)
        try {
            const order = await ordersApi.create({
                customer_name: customerName.trim() || 'Venta POS',
                subtotal: cartTotal,
                total: cartTotal,
                status: 'completed',
                metadata: {
                    source: 'pos',
                    payment_method: paymentMethod,
                    ...(customerType === 'empresa' && companyName.trim()
                        ? { company_name: companyName.trim() }
                        : {}),
                },
                items: cart.map(item => ({
                    product_id: item.product.id,
                    product_name: item.product.name,
                    quantity: item.quantity,
                    unit_price: item.product.price,
                    subtotal: item.product.price * item.quantity,
                })),
            })

            setLastOrder({
                ...order,
                items: cart.map(item => ({
                    name: item.product.name,
                    quantity: item.quantity,
                    price: item.product.price,
                    subtotal: item.product.price * item.quantity,
                })),
                paymentMethod,
                customerName: customerName.trim() || 'Venta POS',
                companyName: customerType === 'empresa' ? companyName.trim() : '',
                total: cartTotal,
                date: new Date(),
            })
            setShowTicket(true)
            setCart([])
            setCustomerName('')
            setCustomerType('particular')
            setCompanyName('')
            showToast('success', 'Venta registrada')

            // Reload products to update stock
            loadData()
        } catch (err) {
            console.error('POS sale error:', err)
            showToast('error', err instanceof Error ? err.message : 'Error al registrar venta')
        } finally {
            setProcessing(false)
        }
    }

    // Print ticket
    const handlePrint = () => {
        if (!ticketRef.current) return
        const printWindow = window.open('', '_blank', 'width=320,height=600')
        if (!printWindow) return
        printWindow.document.write(`
            <html>
            <head><title>Ticket</title>
            <style>
                body { font-family: 'Courier New', monospace; font-size: 12px; width: 280px; margin: 0 auto; padding: 10px; }
                .center { text-align: center; }
                .bold { font-weight: bold; }
                .line { border-top: 1px dashed #000; margin: 8px 0; }
                .row { display: flex; justify-content: space-between; }
                .big { font-size: 16px; }
                @media print { body { margin: 0; } }
            </style>
            </head>
            <body>${ticketRef.current.innerHTML}
            <script>window.print();window.close();</script>
            </body></html>
        `)
        printWindow.document.close()
    }

    const isOutOfStock = (p: Product) => !p.unlimited_stock && (p.stock || 0) <= 0

    return (
        <div className="h-[calc(100vh-4rem)] flex flex-col lg:flex-row gap-0 -m-4 sm:-m-6">
            {/* ─── LEFT: Product Catalog ─── */}
            <div className="flex-1 flex flex-col min-w-0 bg-gray-50">
                {/* Header */}
                <div className="bg-white border-b px-4 py-3 space-y-3 shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                                <Receipt className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <h1 className="text-lg font-black text-gray-900">POS</h1>
                                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest">{storeName}</p>
                            </div>
                        </div>
                        <button
                            onClick={loadData}
                            disabled={loading}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Actualizar productos"
                        >
                            <RefreshCw className={`w-4 h-4 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar productos..."
                            className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 outline-none"
                        />
                        {search && (
                            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                                <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                            </button>
                        )}
                    </div>

                    {/* Categories */}
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                        <button
                            onClick={() => setSelectedCategory(null)}
                            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                                !selectedCategory
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            Todos
                        </button>
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
                                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                                    selectedCategory === cat.id
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Product Grid */}
                <div className="flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2">
                            {Array.from({ length: 12 }).map((_, i) => (
                                <div key={i} className="bg-white rounded-xl px-3 py-2.5 animate-pulse">
                                    <div className="h-3 bg-gray-200 rounded w-3/4 mb-2" />
                                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                                </div>
                            ))}
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                            <Package className="w-12 h-12 mb-2" />
                            <p className="text-sm font-medium">No se encontraron productos</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2">
                            {filtered.map(product => {
                                const outOfStock = isOutOfStock(product)
                                const inCart = cart.find(item => item.product.id === product.id)
                                return (
                                    <button
                                        key={product.id}
                                        onClick={() => !outOfStock && addToCart(product)}
                                        disabled={outOfStock}
                                        className={`relative bg-white rounded-xl px-3 py-2.5 border-2 transition-all text-left ${
                                            inCart
                                                ? 'border-emerald-400 shadow-lg shadow-emerald-100'
                                                : 'border-transparent hover:border-emerald-200 hover:shadow-md'
                                        } ${outOfStock ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}
                                    >
                                        {inCart && (
                                            <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center text-white text-[10px] font-black shadow-lg">
                                                {inCart.quantity}
                                            </div>
                                        )}
                                        <p className="text-xs font-bold text-gray-800 leading-tight line-clamp-2 mb-1 pr-5">
                                            {product.name}
                                        </p>
                                        <p className="text-sm font-black text-emerald-600">
                                            {formatPrice(product.price)}
                                        </p>
                                        {outOfStock && (
                                            <span className="text-[9px] font-black text-red-500 uppercase">
                                                Sin stock
                                            </span>
                                        )}
                                        {!outOfStock && !product.unlimited_stock && (
                                            <p className={`text-[9px] font-semibold mt-0.5 ${
                                                (product.stock || 0) <= 5 ? 'text-amber-500' : 'text-gray-400'
                                            }`}>
                                                Stock: {product.stock}
                                            </p>
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* ─── RIGHT: Cart ─── */}
            <div className="w-full lg:w-96 bg-white border-l flex flex-col shrink-0">
                {/* Cart Header */}
                <div className="px-4 py-3 border-b flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                        <ShoppingCart className="w-5 h-5 text-emerald-600" />
                        <span className="font-bold text-gray-900">Carrito</span>
                        {cartItemCount > 0 && (
                            <span className="bg-emerald-100 text-emerald-700 text-xs font-black px-2 py-0.5 rounded-full">
                                {cartItemCount}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-gray-900">{formatPrice(cartTotal)}</span>
                        {cart.length > 0 && (
                            <button
                                onClick={clearCart}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Vaciar carrito"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Cart Items */}
                <div className="flex-1 overflow-y-auto">
                    {cart.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 px-4">
                            <ShoppingCart className="w-10 h-10 mb-2 text-gray-300" />
                            <p className="text-sm font-medium text-center">
                                Tocá un producto para agregarlo
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {cart.map(item => (
                                <div key={item.product.id} className="px-4 py-3 flex items-center gap-3">
                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-gray-800 truncate">{item.product.name}</p>
                                        <p className="text-[11px] text-gray-500">{formatPrice(item.product.price)} c/u</p>
                                    </div>

                                    {/* Quantity */}
                                    <div className="flex items-center gap-1 shrink-0">
                                        <button
                                            onClick={() => updateQuantity(item.product.id, -1)}
                                            className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                                        >
                                            <Minus className="w-3 h-3" />
                                        </button>
                                        <span className="w-8 text-center text-sm font-black">{item.quantity}</span>
                                        <button
                                            onClick={() => updateQuantity(item.product.id, 1)}
                                            className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                                        >
                                            <Plus className="w-3 h-3" />
                                        </button>
                                    </div>

                                    {/* Subtotal */}
                                    <div className="text-right shrink-0 w-20">
                                        <p className="text-sm font-black text-gray-900">
                                            {formatPrice(item.product.price * item.quantity)}
                                        </p>
                                    </div>

                                    {/* Remove */}
                                    <button
                                        onClick={() => removeFromCart(item.product.id)}
                                        className="p-1 text-gray-300 hover:text-red-500 transition-colors shrink-0"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Cart Footer */}
                {cart.length > 0 && (
                    <div className="border-t px-4 py-4 space-y-4 shrink-0 bg-gray-50/50">
                        {/* Customer type */}
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                                Tipo de cliente
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => { setCustomerType('particular'); setCompanyName('') }}
                                    className={`flex items-center justify-center gap-1.5 py-2 rounded-xl border-2 text-xs font-bold transition-all ${
                                        customerType === 'particular'
                                            ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                                            : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                                    }`}
                                >
                                    <User className="w-3.5 h-3.5" />
                                    Particular
                                </button>
                                <button
                                    onClick={() => setCustomerType('empresa')}
                                    className={`flex items-center justify-center gap-1.5 py-2 rounded-xl border-2 text-xs font-bold transition-all ${
                                        customerType === 'empresa'
                                            ? 'border-blue-400 bg-blue-50 text-blue-700'
                                            : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                                    }`}
                                >
                                    <Building2 className="w-3.5 h-3.5" />
                                    Empresa
                                </button>
                            </div>
                        </div>

                        {/* Company name (only when empresa) */}
                        {customerType === 'empresa' && (
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
                                    Empresa <span className="text-rose-500">*</span>
                                </label>
                                <div className="relative">
                                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
                                    <input
                                        type="text"
                                        value={companyName}
                                        onChange={(e) => setCompanyName(e.target.value)}
                                        placeholder="Nombre de la empresa"
                                        className="w-full pl-10 pr-3 py-2 bg-white border border-blue-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 outline-none"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Customer name */}
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
                                {customerType === 'empresa' ? 'Empleado / Contacto (opcional)' : 'Cliente (opcional)'}
                            </label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    placeholder={customerType === 'empresa' ? 'Nombre del empleado' : 'Nombre del cliente'}
                                    className="w-full pl-10 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 outline-none"
                                />
                            </div>
                        </div>

                        {/* Payment method */}
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                                Método de pago
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                {PAYMENT_METHODS.map(pm => {
                                    const Icon = pm.icon
                                    const selected = paymentMethod === pm.id
                                    return (
                                        <button
                                            key={pm.id}
                                            onClick={() => setPaymentMethod(pm.id)}
                                            className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl border-2 transition-all text-[10px] font-bold ${
                                                selected
                                                    ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                                                    : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                                            }`}
                                        >
                                            <Icon className="w-5 h-5" />
                                            {pm.label}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Total */}
                        <div className="flex items-center justify-between py-3 border-t border-dashed border-gray-300">
                            <span className="text-sm font-bold text-gray-600">Total</span>
                            <span className="text-2xl font-black text-gray-900">{formatPrice(cartTotal)}</span>
                        </div>

                        {/* Register sale */}
                        <button
                            onClick={handleSale}
                            disabled={processing}
                            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm uppercase tracking-widest rounded-2xl shadow-lg shadow-emerald-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98]"
                        >
                            {processing ? (
                                <RefreshCw className="w-5 h-5 animate-spin" />
                            ) : (
                                <CheckCircle2 className="w-5 h-5" />
                            )}
                            {processing ? 'Registrando...' : 'Registrar Venta'}
                        </button>
                    </div>
                )}
            </div>

            {/* ─── TICKET MODAL ─── */}
            {showTicket && lastOrder && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowTicket(false)}>
                    <div
                        className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-fade-in"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Ticket header */}
                        <div className="bg-emerald-600 text-white px-6 py-4 text-center">
                            <CheckCircle2 className="w-10 h-10 mx-auto mb-2" />
                            <h3 className="text-lg font-black">Venta Registrada</h3>
                            <p className="text-emerald-200 text-xs font-medium">#{lastOrder.order_number}</p>
                        </div>

                        {/* Printable ticket */}
                        <div ref={ticketRef} className="px-6 py-4">
                            <div className="text-center mb-3">
                                <p className="font-bold text-sm">{storeName}</p>
                                <p className="text-[10px] text-gray-500">
                                    {lastOrder.date.toLocaleDateString('es-AR')} {lastOrder.date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                                <p className="text-[10px] text-gray-500">Ticket: {lastOrder.order_number}</p>
                                {lastOrder.companyName && (
                                    <p className="text-[10px] text-gray-500">Empresa: {lastOrder.companyName}</p>
                                )}
                                {lastOrder.customerName !== 'Venta POS' && (
                                    <p className="text-[10px] text-gray-500">
                                        {lastOrder.companyName ? 'Empleado' : 'Cliente'}: {lastOrder.customerName}
                                    </p>
                                )}
                            </div>

                            <div className="border-t border-dashed border-gray-300 my-2" />

                            {/* Items */}
                            <div className="space-y-1.5">
                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                {lastOrder.items.map((item: any, i: number) => (
                                    <div key={i} className="flex justify-between text-xs">
                                        <div className="flex-1 min-w-0">
                                            <span className="font-medium text-gray-800">{item.quantity}x</span>{' '}
                                            <span className="text-gray-700">{item.name}</span>
                                        </div>
                                        <span className="font-bold text-gray-900 shrink-0 ml-2">
                                            {formatPrice(item.subtotal)}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <div className="border-t border-dashed border-gray-300 my-2" />

                            <div className="flex justify-between items-center">
                                <span className="text-sm font-bold text-gray-700">TOTAL</span>
                                <span className="text-lg font-black text-gray-900">{formatPrice(lastOrder.total)}</span>
                            </div>

                            <div className="mt-1 text-right">
                                <span className="text-[10px] text-gray-500 capitalize">
                                    Pago: {lastOrder.paymentMethod}
                                </span>
                            </div>

                            <div className="border-t border-dashed border-gray-300 mt-2 pt-2">
                                <p className="text-[9px] text-gray-400 text-center">
                                    Este comprobante no es una factura fiscal
                                </p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="px-6 pb-4 flex gap-2">
                            <button
                                onClick={handlePrint}
                                className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-bold text-gray-700 transition-colors"
                            >
                                <Printer className="w-4 h-4" />
                                Imprimir
                            </button>
                            <button
                                onClick={() => setShowTicket(false)}
                                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 rounded-xl text-sm font-bold text-white transition-colors"
                            >
                                Nueva Venta
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
