import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
    ArrowLeft,
    DollarSign,
    Save,
    Percent,
    RotateCcw,
    TrendingUp,
    TrendingDown,
    Check,
    AlertTriangle,
    Loader2,
    Package,
    CheckSquare,
    Square,
    MinusSquare
} from 'lucide-react'
import { Card, LoadingSpinner, Button } from '../../components/common'
import { productsApi, categoriesApi } from '../../services/api'
import { Product, Category } from '../../types'
import { formatPrice } from '../../utils/helpers'
import { showToast } from '../../components/common/Toast'

export default function BulkPriceEditorPage() {
    const [products, setProducts] = useState<Product[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [selectedCategory, setSelectedCategory] = useState<string>('all')
    const [editedPrices, setEditedPrices] = useState<Record<string, number>>({})
    const [percentAdjust, setPercentAdjust] = useState<string>('')
    const [roundAmount, setRoundAmount] = useState<string>('')
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        try {
            setLoading(true)
            const [prodsRes, catsRes] = await Promise.all([
                productsApi.list({ limit: 500 }),
                categoriesApi.list()
            ])
            setProducts(prodsRes.data || prodsRes)
            setCategories(Array.isArray(catsRes) ? catsRes : [])
        } catch (err) {
            console.error('Error loading data:', err)
            showToast('error', 'Error al cargar datos')
        } finally {
            setLoading(false)
        }
    }

    const filteredProducts = useMemo(() => {
        if (selectedCategory === 'all') return products
        return products.filter(p => String(p.category_id) === String(selectedCategory))
    }, [products, selectedCategory])

    // Products targeted by actions: selected ones, or all filtered if none selected
    const targetProducts = useMemo(() => {
        if (selectedIds.size === 0) return filteredProducts
        return filteredProducts.filter(p => selectedIds.has(p.id))
    }, [filteredProducts, selectedIds])

    const allFilteredSelected = filteredProducts.length > 0 && filteredProducts.every(p => selectedIds.has(p.id))
    const someFilteredSelected = filteredProducts.some(p => selectedIds.has(p.id))

    const toggleSelectAll = () => {
        if (allFilteredSelected) {
            setSelectedIds(prev => {
                const next = new Set(prev)
                filteredProducts.forEach(p => next.delete(p.id))
                return next
            })
        } else {
            setSelectedIds(prev => {
                const next = new Set(prev)
                filteredProducts.forEach(p => next.add(p.id))
                return next
            })
        }
    }

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const hasChanges = Object.keys(editedPrices).length > 0

    const changedCount = Object.keys(editedPrices).length

    const handlePriceChange = (productId: string, newPrice: string) => {
        const price = parseFloat(newPrice)
        if (isNaN(price) || price < 0) return

        const product = products.find(p => p.id === productId)
        if (!product) return

        // Si el precio es igual al original, quitarlo del mapa de edits
        if (price === product.price) {
            setEditedPrices(prev => {
                const next = { ...prev }
                delete next[productId]
                return next
            })
        } else {
            setEditedPrices(prev => ({ ...prev, [productId]: price }))
        }
    }

    const applyPercentAdjust = () => {
        const pct = parseFloat(percentAdjust)
        if (isNaN(pct) || pct === 0) return

        const multiplier = 1 + pct / 100
        const newEdits: Record<string, number> = { ...editedPrices }

        targetProducts.forEach(product => {
            const currentPrice = newEdits[product.id] ?? product.price
            const newPrice = Math.round(currentPrice * multiplier)
            if (newPrice !== product.price) {
                newEdits[product.id] = newPrice
            } else {
                delete newEdits[product.id]
            }
        })

        setEditedPrices(newEdits)
        setPercentAdjust('')
        showToast('success', `Ajuste de ${pct > 0 ? '+' : ''}${pct}% aplicado a ${targetProducts.length} productos`)
    }

    const roundPrices = (roundTo: number) => {
        const newEdits: Record<string, number> = { ...editedPrices }

        targetProducts.forEach(product => {
            const currentPrice = newEdits[product.id] ?? product.price
            const rounded = Math.round(currentPrice / roundTo) * roundTo
            if (rounded !== product.price) {
                newEdits[product.id] = rounded
            } else {
                delete newEdits[product.id]
            }
        })

        setEditedPrices(newEdits)
        showToast('success', `Precios redondeados a múltiplos de $${roundTo}`)
    }

    const resetChanges = () => {
        setEditedPrices({})
        setPercentAdjust('')
        showToast('success', 'Cambios descartados')
    }

    const handleSave = async () => {
        if (!hasChanges) return

        setSaving(true)
        try {
            const updates = Object.entries(editedPrices).map(([id, price]) =>
                productsApi.update(id, { price })
            )
            await Promise.all(updates)

            // Actualizar estado local
            setProducts(prev =>
                prev.map(p =>
                    editedPrices[p.id] !== undefined
                        ? { ...p, price: editedPrices[p.id] }
                        : p
                )
            )
            setEditedPrices({})
            showToast('success', `${updates.length} precios actualizados correctamente`)
        } catch (err: unknown) {
            console.error('Error saving prices:', err)
            showToast('error', err instanceof Error ? err.message : 'Error al guardar precios')
        } finally {
            setSaving(false)
        }
    }

    // Stats
    const stats = useMemo(() => {
        if (filteredProducts.length === 0) return { avgBefore: 0, avgAfter: 0, totalBefore: 0, totalAfter: 0 }

        let totalBefore = 0
        let totalAfter = 0

        filteredProducts.forEach(p => {
            totalBefore += p.price
            totalAfter += editedPrices[p.id] ?? p.price
        })

        return {
            avgBefore: Math.round(totalBefore / filteredProducts.length),
            avgAfter: Math.round(totalAfter / filteredProducts.length),
            totalBefore,
            totalAfter,
        }
    }, [filteredProducts, editedPrices])

    if (loading) {
        return <LoadingSpinner text="Cargando productos..." />
    }

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link to="/dashboard" className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors">
                        <ArrowLeft className="w-5 h-5 text-slate-600" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Editor de Precios</h1>
                        <p className="text-sm text-slate-500 font-medium">Editá precios masivamente por categoría</p>
                    </div>
                </div>

                {hasChanges && (
                    <div className="flex items-center gap-3">
                        <button
                            onClick={resetChanges}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-colors"
                        >
                            <RotateCcw className="w-4 h-4" />
                            Descartar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-black uppercase tracking-widest hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Guardar {changedCount} cambio{changedCount > 1 ? 's' : ''}
                        </button>
                    </div>
                )}
            </div>

            {/* Category Tabs */}
            <Card className="border-emerald-100 shadow-sm">
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setSelectedCategory('all')}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedCategory === 'all'
                            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200'
                            : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                            }`}
                    >
                        Todas ({products.length})
                    </button>
                    {categories.map(cat => {
                        const count = products.filter(p => String(p.category_id) === String(cat.id)).length
                        return (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(String(cat.id))}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${String(selectedCategory) === String(cat.id)
                                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200'
                                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                                    }`}
                            >
                                {cat.name} ({count})
                            </button>
                        )
                    })}
                </div>
            </Card>

            {/* Quick Actions */}
            <Card className="border-indigo-100 shadow-sm">
                {selectedIds.size > 0 && (
                    <div className="flex items-center gap-2 mb-3 pb-3 border-b border-indigo-100">
                        <CheckSquare className="w-4 h-4 text-indigo-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">
                            {selectedIds.size} producto{selectedIds.size > 1 ? 's' : ''} seleccionado{selectedIds.size > 1 ? 's' : ''}
                        </span>
                        <button
                            onClick={() => setSelectedIds(new Set())}
                            className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 ml-2"
                        >
                            Deseleccionar
                        </button>
                    </div>
                )}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="flex items-center gap-2 flex-1">
                        <Percent className="w-4 h-4 text-indigo-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Ajuste %</span>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                value={percentAdjust}
                                onChange={e => setPercentAdjust(e.target.value)}
                                placeholder="ej: 10 o -5"
                                className="w-24 px-3 py-2 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-bold text-center focus:border-indigo-500 transition-all"
                            />
                            <button
                                onClick={applyPercentAdjust}
                                disabled={!percentAdjust || parseFloat(percentAdjust) === 0}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-colors disabled:opacity-30 shadow-sm"
                            >
                                Aplicar
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Redondear a</span>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                value={roundAmount}
                                onChange={e => setRoundAmount(e.target.value)}
                                placeholder="ej: 100"
                                className="w-24 px-3 py-1.5 bg-slate-50 border-2 border-slate-100 rounded-xl text-[11px] font-bold text-center focus:border-indigo-500 transition-all outline-none"
                            />
                            <button
                                onClick={() => {
                                    const val = parseInt(roundAmount)
                                    if (!isNaN(val) && val > 0) {
                                        roundPrices(val)
                                        setRoundAmount('')
                                    }
                                }}
                                disabled={!roundAmount || parseInt(roundAmount) <= 0}
                                className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-slate-700 transition-colors disabled:opacity-30 shadow-sm"
                            >
                                Redondear
                            </button>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Stats Bar */}
            {hasChanges && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="bg-slate-50 rounded-2xl p-4 text-center">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Modificados</p>
                        <p className="text-xl font-black text-indigo-600">{changedCount}</p>
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-4 text-center">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Promedio Antes</p>
                        <p className="text-xl font-black text-slate-600">{formatPrice(stats.avgBefore)}</p>
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-4 text-center">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Promedio Después</p>
                        <p className="text-xl font-black text-emerald-600">{formatPrice(stats.avgAfter)}</p>
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-4 text-center">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Diferencia</p>
                        <p className={`text-xl font-black flex items-center justify-center gap-1 ${stats.avgAfter > stats.avgBefore ? 'text-emerald-600' : stats.avgAfter < stats.avgBefore ? 'text-rose-500' : 'text-slate-400'}`}>
                            {stats.avgAfter > stats.avgBefore ? <TrendingUp className="w-4 h-4" /> : stats.avgAfter < stats.avgBefore ? <TrendingDown className="w-4 h-4" /> : null}
                            {stats.avgAfter !== stats.avgBefore ? formatPrice(Math.abs(stats.avgAfter - stats.avgBefore)) : '—'}
                        </p>
                    </div>
                </div>
            )}

            {/* Products Table */}
            {filteredProducts.length === 0 ? (
                <Card className="text-center py-12">
                    <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-lg font-black text-slate-400">No hay productos en esta categoría</p>
                </Card>
            ) : (
                <Card padding={false} className="border-emerald-100 shadow-xl shadow-emerald-50/30 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">
                                    <th className="text-center px-3 py-4 w-10">
                                        <button onClick={toggleSelectAll} className="hover:text-indigo-600 transition-colors">
                                            {allFilteredSelected ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : someFilteredSelected ? <MinusSquare className="w-4 h-4 text-indigo-400" /> : <Square className="w-4 h-4" />}
                                        </button>
                                    </th>
                                    <th className="text-left px-4 py-4 w-10">#</th>
                                    <th className="text-left px-4 py-4">Producto</th>
                                    <th className="text-left px-4 py-4 hidden sm:table-cell">Categoría</th>
                                    <th className="text-right px-4 py-4 w-36">Precio Actual</th>
                                    <th className="text-right px-4 py-4 w-40">Nuevo Precio</th>
                                    <th className="text-right px-4 py-4 w-24">Dif.</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredProducts.map((product, idx) => {
                                    const editedPrice = editedPrices[product.id]
                                    const isEdited = editedPrice !== undefined
                                    const isSelected = selectedIds.has(product.id)
                                    const diff = isEdited ? editedPrice - product.price : 0
                                    const diffPct = isEdited && product.price > 0 ? ((diff / product.price) * 100).toFixed(1) : null

                                    return (
                                        <tr
                                            key={product.id}
                                            className={`group hover:bg-slate-50/50 transition-colors ${isEdited ? 'bg-indigo-50/30' : ''} ${isSelected ? 'bg-indigo-50/20' : ''}`}
                                        >
                                            <td className="text-center px-3 py-3">
                                                <button onClick={() => toggleSelect(product.id)} className="hover:text-indigo-600 transition-colors">
                                                    {isSelected ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4 text-slate-300" />}
                                                </button>
                                            </td>
                                            <td className="px-4 py-3 text-slate-300 font-bold text-xs">{idx + 1}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    {product.image_url ? (
                                                        <img src={product.image_url} alt="" className="w-8 h-8 rounded-lg object-cover ring-1 ring-slate-100" />
                                                    ) : (
                                                        <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-100">
                                                            <Package className="w-4 h-4 text-slate-300" />
                                                        </div>
                                                    )}
                                                    <span className="font-bold text-slate-800 text-sm">{product.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-slate-400 font-bold text-[10px] uppercase tracking-widest hidden sm:table-cell">
                                                {product.category_name || '—'}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <span className={`font-black ${isEdited ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                                                    {formatPrice(product.price)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="1"
                                                    value={isEdited ? editedPrice : product.price}
                                                    onChange={e => handlePriceChange(product.id, e.target.value)}
                                                    className={`w-full text-right px-3 py-1.5 rounded-xl border-2 text-sm font-black transition-all ${isEdited
                                                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 focus:border-indigo-500'
                                                        : 'bg-slate-50 border-transparent text-slate-700 focus:border-slate-200 hover:bg-white hover:border-slate-200'
                                                        }`}
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                {isEdited && (
                                                    <div className="flex flex-col items-end">
                                                        <span className={`text-xs font-black ${diff > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                                                            {diff > 0 ? '+' : ''}{formatPrice(diff)}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 font-bold">
                                                            {diff > 0 ? '+' : ''}{diffPct}%
                                                        </span>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* Floating Save Bar */}
            {hasChanges && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
                    <div className="bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-4 border border-slate-700">
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        <span className="text-sm font-bold">{changedCount} precio{changedCount > 1 ? 's' : ''} modificado{changedCount > 1 ? 's' : ''}</span>
                        <button
                            onClick={resetChanges}
                            className="px-3 py-1.5 rounded-lg bg-slate-700 text-slate-300 text-[10px] font-black uppercase tracking-widest hover:bg-slate-600 transition-colors"
                        >
                            Descartar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-4 py-1.5 rounded-lg bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-400 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                            Guardar
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
