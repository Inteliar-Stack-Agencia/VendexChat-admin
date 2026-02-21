import { useState, useEffect } from 'react'
import { Search, X, Loader2, Sparkles, Image as ImageIcon, Settings, AlertCircle, ExternalLink } from 'lucide-react'
import { Button, Card, Input } from '../common'

interface UnsplashImage {
    id: string
    urls: {
        regular: string
        small: string
        thumb: string
    }
    alt_description: string
    user: {
        name: string
        links: {
            html: string
        }
    }
}

interface ImageSuggestionModalProps {
    isOpen: boolean
    onClose: () => void
    onSelect: (url: string) => void
    initialQuery?: string
}

export default function ImageSuggestionModal({ isOpen, onClose, onSelect, initialQuery = '' }: ImageSuggestionModalProps) {
    const [images, setImages] = useState<UnsplashImage[]>([])
    const [loading, setLoading] = useState(false)
    const [showSettings, setShowSettings] = useState(false)
    const [apiKey, setApiKey] = useState(() => localStorage.getItem('vendex_unsplash_key') || '')
    const [query, setQuery] = useState(initialQuery)
    const [error, setError] = useState<string | null>(null)

    const searchImages = async (searchQuery: string, isFallback = false) => {
        if (!searchQuery.trim()) return
        setLoading(true)

        // Diccionario simple de traducción/optimización para Unsplash (funciona mejor en inglés)
        const commonTerms: Record<string, string> = {
            'ron': 'rum',
            'cerveza': 'beer',
            'vino': 'wine',
            'gaseosa': 'soda',
            'hamburguesa': 'burger',
            'pizza': 'pizza',
            'papas fritas': 'french fries',
            'empanada': 'pastry',
            'helado': 'ice cream',
            'cafe': 'coffee',
            'agua': 'water bottle',
            'jugo': 'juice',
            'licuado': 'smoothie',
            'milanesa': 'schnitzel',
            'ensalada': 'salad',
            'pollo': 'chicken food',
            'carne': 'meat beef',
            'pastel': 'cake',
            'torta': 'cake',
            'postre': 'dessert',
            'fernet': 'liquor herbal',
            'whisky': 'whiskey',
            'gin': 'gin tonic',
            'vodka': 'vodka bottle'
        }

        // Limpiar la query y buscar traducciones
        let optimizedQuery = searchQuery.toLowerCase().trim()

        // Si no es un fallback, intentamos optimizar la búsqueda
        if (!isFallback) {
            Object.keys(commonTerms).forEach(key => {
                if (optimizedQuery.includes(key)) {
                    optimizedQuery = optimizedQuery.replace(key, commonTerms[key])
                }
            })
        }

        try {
            setError(null)
            const response = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(optimizedQuery)}&per_page=12&client_id=${apiKey}`)

            if (response.status === 401) {
                setError('Llave de Unsplash inválida.')
                setShowSettings(true)
                return
            }
            if (response.status === 403) {
                setError('Límite de la API alcanzado. Intenta en una hora.')
                return
            }

            const data = await response.json()

            if (data.results && data.results.length > 0) {
                setImages(data.results)
            } else if (!isFallback && searchQuery.split(' ').length > 1) {
                // Si falla y la query tiene varias palabras, intentamos solo con la primera (ej: "ron bacardi" -> "ron")
                searchImages(searchQuery.split(' ')[0], true)
                return
            } else if (!isFallback && optimizedQuery !== searchQuery) {
                // Si falla la optimizada, intentamos la original pura
                searchImages(searchQuery, true)
                return
            } else {
                setImages([])
            }
        } catch (err) {
            console.error('Error buscando imágenes:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (isOpen && initialQuery) {
            setQuery(initialQuery)
            searchImages(initialQuery)
        }
    }, [isOpen, initialQuery])

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <Card className="w-full max-w-2xl bg-white overflow-hidden shadow-2xl border-0 rounded-3xl animate-scale-in">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Sugerencias de IA</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Fotos profesionales para tu producto</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowSettings(!showSettings)}
                            className={`p-2 rounded-full transition-colors ${showSettings ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-slate-200 text-slate-400'}`}
                        >
                            <Settings className="w-5 h-5" />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>
                </div>

                {/* Settings Panel */}
                {showSettings && (
                    <div className="p-6 bg-indigo-50 border-b border-indigo-100 animate-slide-down">
                        <div className="flex items-center gap-2 mb-2">
                            <AlertCircle className="w-4 h-4 text-indigo-600" />
                            <h4 className="text-xs font-black text-indigo-900 uppercase tracking-widest">Configuración de API</h4>
                        </div>
                        <p className="text-[10px] text-indigo-700/70 font-bold uppercase mb-4">
                            Necesitas una Unsplash Access Key (gratis) para que las sugerencias funcionen.
                        </p>
                        <div className="flex gap-2">
                            <input
                                type="password"
                                value={apiKey}
                                onChange={(e) => {
                                    setApiKey(e.target.value)
                                    localStorage.setItem('vendex_unsplash_key', e.target.value)
                                }}
                                placeholder="Pega tu Unsplash Access Key aquí..."
                                className="flex-1 px-4 py-2 rounded-xl bg-white border border-indigo-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                            <a
                                href="https://unsplash.com/developers"
                                target="_blank"
                                rel="noreferrer"
                                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 hover:bg-indigo-700"
                            >
                                <ExternalLink className="w-3 h-3" /> Crear Key
                            </a>
                        </div>
                    </div>
                )}

                {/* Search Bar */}
                <div className="p-6">
                    {!apiKey && !showSettings && (
                        <div className="mb-6 p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-center gap-3">
                            <AlertCircle className="w-5 h-5 text-amber-600" />
                            <div className="flex-1">
                                <p className="text-xs font-black text-amber-900 uppercase tracking-widest">API no configurada</p>
                                <p className="text-[10px] text-amber-700 font-bold uppercase">Haz clic en el engranaje arriba para activar tus sugerencias.</p>
                            </div>
                            <Button
                                onClick={() => setShowSettings(true)}
                                className="bg-amber-600 hover:bg-amber-700 text-white text-[9px] font-black uppercase px-4 py-2 rounded-xl"
                            >
                                Configurar
                            </Button>
                        </div>
                    )}
                    <div className="relative mb-6">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && searchImages(query)}
                            placeholder="Buscar comida, objeto, estilo..."
                            className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-100 border-2 border-transparent focus:border-indigo-500 focus:bg-white text-slate-700 font-medium transition-all outline-none"
                        />
                        <Button
                            onClick={() => searchImages(query)}
                            disabled={loading || !apiKey}
                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Buscar'}
                        </Button>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 rounded-2xl border border-red-100 flex items-center gap-3 animate-shake">
                            <AlertCircle className="w-5 h-5 text-red-500" />
                            <p className="text-xs font-bold text-red-700 uppercase tracking-tight">{error}</p>
                            <button
                                onClick={() => setShowSettings(true)}
                                className="ml-auto text-[9px] font-black uppercase text-red-600 hover:underline"
                            >
                                Revisar Configuración
                            </button>
                        </div>
                    )}

                    {/* Results Grid */}
                    <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 grayscale opacity-50">
                                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Conectando con la galería mágica...</p>
                            </div>
                        ) : images.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                {images.map((img) => (
                                    <div
                                        key={img.id}
                                        onClick={() => onSelect(img.urls.regular)}
                                        className="group relative aspect-square rounded-2xl overflow-hidden cursor-pointer border-2 border-transparent hover:border-indigo-500 transition-all shadow-sm hover:shadow-xl hover:scale-[1.02]"
                                    >
                                        <img
                                            src={img.urls.small}
                                            alt={img.alt_description}
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        />
                                        <div className="absolute inset-0 bg-indigo-600/0 group-hover:bg-indigo-600/20 transition-all flex items-center justify-center">
                                            <div className="bg-white text-indigo-600 font-black text-[10px] uppercase tracking-widest px-3 py-1 rounded-full opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all">
                                                Seleccionar
                                            </div>
                                        </div>
                                        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
                                            <p className="text-[8px] text-white/80 font-medium truncate">por {img.user.name}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : query ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <ImageIcon className="w-12 h-12 text-slate-200 mb-4" />
                                <p className="text-slate-400 font-medium text-sm">No encontramos fotos para "{query}"</p>
                                <p className="text-slate-300 text-[10px] mt-1 font-bold uppercase">Prueba con palabras en inglés para mejores resultados</p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <ImageIcon className="w-12 h-12 text-slate-100 mb-4" />
                                <p className="text-slate-400 font-medium text-sm">Escribe algo para buscar fotos profesionales</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-slate-50 text-center">
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                        Imágenes libres de derechos vía Unsplash
                    </p>
                </div>
            </Card>
        </div>
    )
}
