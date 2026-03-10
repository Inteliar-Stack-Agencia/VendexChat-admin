import { useState, useEffect } from 'react'
import { Search, X, Loader2, Sparkles, Image as ImageIcon, AlertCircle } from 'lucide-react'
import { Button, Card } from '../common'

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY
const GOOGLE_CX = import.meta.env.VITE_GOOGLE_CX || 'f2ec5d52f8cd24b2a'
const PEXELS_API_KEY = import.meta.env.VITE_PEXELS_API_KEY

interface SearchImage {
    url: string;
    thumb: string;
    title: string;
}

interface ImageSuggestionModalProps {
    isOpen: boolean
    onClose: () => void
    onSelect: (url: string) => void
    initialQuery?: string
}

export default function ImageSuggestionModal({ isOpen, onClose, onSelect, initialQuery = '' }: ImageSuggestionModalProps) {
    const [images, setImages] = useState<SearchImage[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [usingPexelsFallback, setUsingPexelsFallback] = useState(false)
    const [query, setQuery] = useState(initialQuery)

    const searchPexels = async (q: string): Promise<SearchImage[]> => {
        if (!PEXELS_API_KEY) throw new Error('Pexels API key no configurada')
        const res = await fetch(
            `https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=9&orientation=square`,
            { headers: { Authorization: PEXELS_API_KEY } }
        )
        if (!res.ok) throw new Error(`Pexels error ${res.status}`)
        const data = await res.json()
        return (data.photos || []).map((p: { src: { large: string; medium: string }; alt: string }) => ({
            url: p.src.large,
            thumb: p.src.medium,
            title: p.alt || q
        }))
    }

    const searchGoogle = async (q: string): Promise<SearchImage[]> => {
        if (!GOOGLE_API_KEY) throw new Error('Google API key no configurada')
        const res = await fetch(
            `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX}&q=${encodeURIComponent(q)}&searchType=image&num=9`
        )
        if (!res.ok) throw new Error(`Google error ${res.status}`)
        const data = await res.json()
        return (data.items || []).map((item: { link: string; image?: { thumbnailLink: string }; title: string }) => ({
            url: item.link,
            thumb: item.image?.thumbnailLink || item.link,
            title: item.title || q
        }))
    }

    const handleSearch = async (q: string) => {
        const trimmed = q.trim()
        if (!trimmed) return

        setLoading(true)
        setError(null)
        setUsingPexelsFallback(false)
        setImages([])

        try {
            let results: SearchImage[] = []

            try {
                results = await searchGoogle(trimmed)
            } catch (googleErr) {
                console.warn('Google Images falló, usando Pexels como fallback:', googleErr)
                results = await searchPexels(trimmed)
                setUsingPexelsFallback(true)
            }

            if (results.length === 0) {
                setError('No se encontraron imágenes para esta búsqueda.')
            } else {
                setImages(results)
            }
        } catch (err) {
            console.error('Error en búsqueda de imágenes:', err)
            setError('Error al buscar imágenes. Verificá tu conexión y las API keys.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (isOpen && initialQuery) {
            setQuery(initialQuery)
            handleSearch(initialQuery)
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
                            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Buscar Imagen</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Google Imágenes · Pexels como respaldo</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                <div className="p-6">
                    {/* Search Bar */}
                    <div className="relative mb-5">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch(query)}
                            placeholder="Ej: Hamburguesa artesanal, pizza napolitana..."
                            className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-100 border-2 border-transparent focus:border-indigo-500 focus:bg-white text-slate-700 font-medium transition-all outline-none"
                        />
                        <Button
                            type="button"
                            onClick={() => handleSearch(query)}
                            disabled={loading}
                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Buscar'}
                        </Button>
                    </div>

                    {/* Error banner */}
                    {error && (
                        <div className="mb-5 p-4 bg-red-50 rounded-2xl border border-red-100 flex items-center gap-3">
                            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                            <p className="text-xs font-bold text-red-700 uppercase tracking-tight">{error}</p>
                        </div>
                    )}

                    {/* Results Grid */}
                    <div className="max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-16 opacity-50">
                                <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mb-3" />
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Buscando imágenes...</p>
                            </div>
                        ) : images.length > 0 ? (
                            <div className="grid grid-cols-3 gap-3">
                                {images.map((img, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => onSelect(img.url)}
                                        className="group relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 border-transparent hover:border-indigo-500 hover:shadow-lg hover:scale-[1.03] transition-all"
                                    >
                                        <img
                                            src={img.thumb}
                                            alt={img.title}
                                            className="w-full h-full object-cover"
                                            onError={(e) => { (e.target as HTMLImageElement).src = img.url }}
                                        />
                                        <div className="absolute inset-0 bg-indigo-600/0 group-hover:bg-indigo-600/20 transition-all flex items-center justify-center">
                                            <div className="bg-white text-indigo-600 font-black text-[9px] uppercase tracking-widest px-3 py-1.5 rounded-full shadow-md opacity-0 group-hover:opacity-100 transform translate-y-3 group-hover:translate-y-0 transition-all">
                                                Seleccionar
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <ImageIcon className="w-12 h-12 text-slate-100 mb-4" />
                                <p className="text-slate-400 font-medium text-sm">Escribí el nombre del producto y presiona Buscar</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
                    {usingPexelsFallback ? (
                        <p className="text-[9px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 text-amber-600">
                            <AlertCircle className="w-3 h-3" />
                            Google no disponible · Mostrando resultados de <span className="font-black">PEXELS</span>
                        </p>
                    ) : images.length > 0 ? (
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                            Resultados de <span className="text-blue-600 font-black">GOOGLE IMÁGENES</span>
                        </p>
                    ) : (
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                            Busca imágenes reales para tus productos
                        </p>
                    )}
                </div>
            </Card>
        </div>
    )
}
