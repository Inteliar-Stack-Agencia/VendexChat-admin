import { useState, useEffect } from 'react'
import { Search, X, Loader2, Sparkles, Image as ImageIcon, AlertCircle, Wand2 } from 'lucide-react'
import { Button, Card } from '../common'

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY
const GOOGLE_CX = import.meta.env.VITE_GOOGLE_CX || 'f2ec5d52f8cd24b2a'
const PEXELS_API_KEY = import.meta.env.VITE_PEXELS_API_KEY

interface SDImage {
    url: string;
    loading: boolean;
    error: boolean;
}

interface SearchImage {
    url: string;
    thumb: string;
    title: string;
}

type ActiveTab = 'ai' | 'search'
type SearchSource = 'google' | 'pexels'

interface ImageSuggestionModalProps {
    isOpen: boolean
    onClose: () => void
    onSelect: (url: string) => void
    initialQuery?: string
}

export default function ImageSuggestionModal({ isOpen, onClose, onSelect, initialQuery = '' }: ImageSuggestionModalProps) {
    const [activeTab, setActiveTab] = useState<ActiveTab>('ai')

    // --- AI tab state ---
    const [aiImages, setAiImages] = useState<SDImage[]>([])
    const [aiLoading, setAiLoading] = useState(false)
    const [aiError, setAiError] = useState<string | null>(null)

    // --- Search tab state ---
    const [searchImages, setSearchImages] = useState<SearchImage[]>([])
    const [searchLoading, setSearchLoading] = useState(false)
    const [searchError, setSearchError] = useState<string | null>(null)
    const [searchSource, setSearchSource] = useState<SearchSource>('google')
    const [usingPexelsFallback, setUsingPexelsFallback] = useState(false)

    const [query, setQuery] = useState(initialQuery)

    // ─── AI Generation ──────────────────────────────────────────────────────────
    const generateImage = async (prompt: string) => {
        const rawPrompt = prompt.trim().replace(/[- \t]+$/, '').trim()
        if (!rawPrompt) return

        const enhancedPrompt = `${rawPrompt}, professional product photography, studio lighting, high resolution, 4k, sharp focus`

        setAiLoading(true)
        setAiError(null)

        try {
            const seed = Math.floor(Math.random() * 1000000)
            const newImages: SDImage[] = [1, 2, 3].map(i => ({
                url: `https://pollinations.ai/p/${encodeURIComponent(enhancedPrompt)}?seed=${seed + i}&width=1024&height=1024&model=flux&nologo=true`,
                loading: true,
                error: false
            }))
            setAiImages(newImages)
        } catch (err) {
            console.error('Error preparando generación:', err)
            setAiError('Error al conectar con la IA.')
        } finally {
            setAiLoading(false)
        }
    }

    const handleAiImageLoad = (index: number) => {
        setAiImages(prev => prev.map((img, i) => i === index ? { ...img, loading: false } : img))
    }

    const handleAiImageError = (index: number) => {
        setAiImages(prev => prev.map((img, i) => i === index ? { ...img, loading: false, error: true } : img))
    }

    // ─── Pexels Search ───────────────────────────────────────────────────────────
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

    // ─── Google Image Search ─────────────────────────────────────────────────────
    const searchGoogle = async (q: string): Promise<SearchImage[]> => {
        if (!GOOGLE_API_KEY) throw new Error('Google API key no configurada')
        const res = await fetch(
            `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX}&q=${encodeURIComponent(q)}&searchType=image&num=9`
        )
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}))
            throw Object.assign(new Error(`Google error ${res.status}`), { status: res.status, data: errData })
        }
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

        setSearchLoading(true)
        setSearchError(null)
        setUsingPexelsFallback(false)
        setSearchImages([])

        try {
            let results: SearchImage[] = []

            if (searchSource === 'google') {
                try {
                    results = await searchGoogle(trimmed)
                    setSearchSource('google')
                } catch (googleErr: unknown) {
                    // Automatic fallback to Pexels on any Google failure (400, 403, network, etc.)
                    console.warn('Google Images falló, usando Pexels como fallback:', googleErr)
                    results = await searchPexels(trimmed)
                    setUsingPexelsFallback(true)
                }
            } else {
                results = await searchPexels(trimmed)
            }

            if (results.length === 0) {
                setSearchError('No se encontraron imágenes para esta búsqueda.')
            } else {
                setSearchImages(results)
            }
        } catch (err) {
            console.error('Error en búsqueda de imágenes:', err)
            setSearchError('Error al buscar imágenes. Verificá tu conexión.')
        } finally {
            setSearchLoading(false)
        }
    }

    useEffect(() => {
        if (isOpen && initialQuery) {
            setQuery(initialQuery)
            generateImage(initialQuery)
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
                            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Imágenes del Producto</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Generación IA o Búsqueda Web</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-100 bg-slate-50/30">
                    <button
                        onClick={() => setActiveTab('ai')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'ai' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <Wand2 className="w-4 h-4" /> Generar con IA
                    </button>
                    <button
                        onClick={() => setActiveTab('search')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'search' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <Search className="w-4 h-4" /> Buscar Imágenes
                    </button>
                </div>

                <div className="p-6">
                    {/* Search Bar — shared */}
                    <div className="relative mb-5">
                        <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    activeTab === 'ai' ? generateImage(query) : handleSearch(query)
                                }
                            }}
                            placeholder={activeTab === 'ai' ? 'Ej: Hamburguesa con queso cheddar, fondo oscuro...' : 'Ej: Hamburguesa artesanal...'}
                            className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-100 border-2 border-transparent focus:border-indigo-500 focus:bg-white text-slate-700 font-medium transition-all outline-none"
                        />
                        <Button
                            type="button"
                            onClick={() => activeTab === 'ai' ? generateImage(query) : handleSearch(query)}
                            disabled={activeTab === 'ai' ? aiLoading : searchLoading}
                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest disabled:opacity-50"
                        >
                            {(activeTab === 'ai' ? aiLoading : searchLoading)
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : activeTab === 'ai' ? 'Generar' : 'Buscar'}
                        </Button>
                    </div>

                    {/* Source selector (search tab only) */}
                    {activeTab === 'search' && (
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fuente:</span>
                            <button
                                onClick={() => setSearchSource('google')}
                                className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${searchSource === 'google' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                            >
                                Google Imágenes
                            </button>
                            <button
                                onClick={() => setSearchSource('pexels')}
                                className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${searchSource === 'pexels' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                            >
                                Pexels
                            </button>
                        </div>
                    )}

                    {/* Error banner */}
                    {(activeTab === 'ai' ? aiError : searchError) && (
                        <div className="mb-5 p-4 bg-red-50 rounded-2xl border border-red-100 flex items-center gap-3">
                            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                            <p className="text-xs font-bold text-red-700 uppercase tracking-tight">
                                {activeTab === 'ai' ? aiError : searchError}
                            </p>
                        </div>
                    )}

                    {/* Results Grid */}
                    <div className="max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
                        {/* ── AI Tab ── */}
                        {activeTab === 'ai' && (
                            aiLoading ? (
                                <div className="flex flex-col items-center justify-center py-16 opacity-50">
                                    <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mb-3" />
                                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Preparando lienzos...</p>
                                </div>
                            ) : aiImages.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {aiImages.map((img, idx) => (
                                        <div
                                            key={idx}
                                            onClick={() => !img.loading && !img.error && onSelect(img.url)}
                                            className={`group relative aspect-square rounded-2xl overflow-hidden border-2 transition-all shadow-sm ${img.loading ? 'bg-slate-50 border-slate-100' : img.error ? 'bg-red-50 border-red-100' : 'cursor-pointer border-transparent hover:border-indigo-500 hover:shadow-xl hover:scale-[1.02]'}`}
                                        >
                                            {img.loading && (
                                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                                                    <Loader2 className="w-6 h-6 text-indigo-300 animate-spin" />
                                                    <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Generando...</span>
                                                </div>
                                            )}
                                            {img.error && (
                                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center p-4">
                                                    <AlertCircle className="w-6 h-6 text-red-300" />
                                                    <span className="text-[8px] font-black text-red-400 uppercase tracking-widest leading-tight">Error de carga</span>
                                                    <p className="text-[7px] text-red-300 font-bold uppercase cursor-pointer underline" onClick={(e) => { e.stopPropagation(); generateImage(query) }}>Reintentar</p>
                                                </div>
                                            )}
                                            <img
                                                src={img.url}
                                                alt="AI Generated"
                                                className={`w-full h-full object-cover transition-all duration-700 ${img.loading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'} ${img.error ? 'hidden' : ''}`}
                                                onLoad={() => handleAiImageLoad(idx)}
                                                onError={() => handleAiImageError(idx)}
                                            />
                                            {!img.loading && !img.error && (
                                                <div className="absolute inset-0 bg-indigo-600/0 group-hover:bg-indigo-600/20 transition-all flex items-center justify-center">
                                                    <div className="bg-white text-indigo-600 font-black text-[10px] uppercase tracking-widest px-4 py-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all flex items-center gap-2">
                                                        <Sparkles className="w-3 h-3" /> Seleccionar
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                    <ImageIcon className="w-12 h-12 text-slate-100 mb-4" />
                                    <p className="text-slate-400 font-medium text-sm">Describe tu producto y presiona Generar</p>
                                </div>
                            )
                        )}

                        {/* ── Search Tab ── */}
                        {activeTab === 'search' && (
                            searchLoading ? (
                                <div className="flex flex-col items-center justify-center py-16 opacity-50">
                                    <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mb-3" />
                                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Buscando imágenes...</p>
                                </div>
                            ) : searchImages.length > 0 ? (
                                <div className="grid grid-cols-3 gap-3">
                                    {searchImages.map((img, idx) => (
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
                                    <Search className="w-12 h-12 text-slate-100 mb-4" />
                                    <p className="text-slate-400 font-medium text-sm">Escribí el nombre del producto y presiona Buscar</p>
                                </div>
                            )
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
                    {activeTab === 'ai' ? (
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                            Potenciado por <span className="text-indigo-600 font-black">STABLE DIFFUSION</span> (Gratis e Ilimitado)
                        </p>
                    ) : usingPexelsFallback ? (
                        <p className="text-[9px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 text-amber-600">
                            <AlertCircle className="w-3 h-3" />
                            Google no disponible · Mostrando resultados de <span className="font-black">PEXELS</span>
                        </p>
                    ) : searchSource === 'google' ? (
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                            Resultados de <span className="text-blue-600 font-black">GOOGLE IMÁGENES</span>
                        </p>
                    ) : (
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                            Fotos de <span className="text-emerald-600 font-black">PEXELS</span> (Licencia gratuita)
                        </p>
                    )}
                </div>
            </Card>
        </div>
    )
}
