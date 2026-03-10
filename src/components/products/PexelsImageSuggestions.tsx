import { useState, useEffect } from 'react'
import { Search, X, Loader2, Image as ImageIcon, AlertCircle, Camera } from 'lucide-react'
import { Button, Card } from '../common'
import { supabase } from '../../supabaseClient'

interface GoogleImageItem {
    link: string
    title: string
    image: {
        thumbnailLink: string
    }
}

interface ImageResult {
    url: string
    thumb: string
    credit: string
}

interface PexelsImageSuggestionsProps {
    isOpen: boolean
    onClose: () => void
    onSelect: (url: string) => void
    initialQuery?: string
}

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY
const GOOGLE_CX = import.meta.env.VITE_GOOGLE_CX

async function translateToEnglish(text: string): Promise<string> {
    try {
        const res = await fetch(
            `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=es|en`
        )
        const data = await res.json()
        if (data.responseStatus === 200 && data.responseData?.translatedText) {
            return data.responseData.translatedText
        }
    } catch {
        // fallback: return original
    }
    return text
}

async function searchGoogle(query: string): Promise<ImageResult[]> {
    const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX}&q=${encodeURIComponent(query)}&searchType=image&num=10`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Google error: ${res.status}`)
    const data = await res.json()
    return ((data.items as GoogleImageItem[]) || []).map(item => ({
        url: item.link,
        thumb: item.image?.thumbnailLink || item.link,
        credit: item.title || 'Google Images',
    }))
}

async function uploadImageToSupabase(imageUrl: string): Promise<string> {
    const res = await fetch(imageUrl)
    if (!res.ok) throw new Error('No se pudo descargar la imagen')
    const blob = await res.blob()
    const ext = blob.type.split('/')[1]?.split(';')[0] || 'jpg'
    const fileName = `google-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const filePath = `products/${fileName}`

    const { error } = await supabase.storage
        .from('product-images')
        .upload(filePath, blob, { upsert: true, cacheControl: '3600' })

    if (error) throw error

    const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath)

    return publicUrl
}

export default function PexelsImageSuggestions({
    isOpen,
    onClose,
    onSelect,
    initialQuery = ''
}: PexelsImageSuggestionsProps) {
    const [images, setImages] = useState<ImageResult[]>([])
    const [loading, setLoading] = useState(false)
    const [uploading, setUploading] = useState<number | null>(null)
    const [query, setQuery] = useState(initialQuery)
    const [error, setError] = useState<string | null>(null)

    const search = async (term: string) => {
        if (!term.trim()) return
        setLoading(true)
        setError(null)
        setImages([])

        try {
            const englishTerm = await translateToEnglish(term.trim())
            const results = await searchGoogle(englishTerm)

            if (results.length === 0) {
                setError('No se encontraron imágenes. Probá con otro término.')
            }

            setImages(results)
        } catch {
            setError('Error al buscar imágenes. Verificá que la API de Google esté configurada.')
        } finally {
            setLoading(false)
        }
    }

    const handleSelect = async (img: ImageResult, idx: number) => {
        if (uploading !== null) return
        setUploading(idx)
        try {
            const supabaseUrl = await uploadImageToSupabase(img.url)
            onSelect(supabaseUrl)
            onClose()
        } catch {
            onSelect(img.url)
            onClose()
        } finally {
            setUploading(null)
        }
    }

    useEffect(() => {
        if (isOpen && initialQuery) {
            setQuery(initialQuery)
            search(initialQuery)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, initialQuery])

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <Card className="w-full max-w-3xl bg-white overflow-hidden shadow-2xl border-0 rounded-3xl animate-scale-in">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200">
                            <Camera className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Buscar fotos reales</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Google Images</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Search Bar */}
                <div className="p-6">
                    <div className="relative mb-6">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && search(query)}
                            placeholder="Ej: Hamburguesa, Pizza margherita, Torta de chocolate..."
                            className="w-full pl-12 pr-28 py-4 rounded-2xl bg-slate-100 border-2 border-transparent focus:border-emerald-500 focus:bg-white text-slate-700 font-medium transition-all outline-none"
                        />
                        <Button
                            type="button"
                            onClick={() => search(query)}
                            disabled={loading}
                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Buscar'}
                        </Button>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 rounded-2xl border border-red-100 flex items-center gap-3">
                            <AlertCircle className="w-5 h-5 text-red-500" />
                            <p className="text-xs font-bold text-red-700 uppercase tracking-tight">{error}</p>
                        </div>
                    )}

                    {/* Results Grid */}
                    <div className="max-h-[420px] overflow-y-auto pr-2 custom-scrollbar">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 opacity-50">
                                <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mb-4" />
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Buscando imágenes...</p>
                            </div>
                        ) : images.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {images.map((img, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => uploading === null && handleSelect(img, idx)}
                                        className={`group relative aspect-square rounded-2xl overflow-hidden border-2 border-transparent hover:border-emerald-500 cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all shadow-sm bg-slate-100 ${uploading === idx ? 'pointer-events-none' : ''}`}
                                    >
                                        <img
                                            src={img.thumb}
                                            alt={img.credit}
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                        />

                                        {uploading === idx && (
                                            <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                                                <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
                                            </div>
                                        )}

                                        {uploading !== idx && (
                                            <>
                                                <div className="absolute inset-0 bg-emerald-600/0 group-hover:bg-emerald-600/20 transition-all flex items-center justify-center">
                                                    <div className="bg-white text-emerald-600 font-black text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all">
                                                        Seleccionar
                                                    </div>
                                                </div>
                                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <p className="text-[9px] text-white font-bold truncate">{img.credit}</p>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <ImageIcon className="w-12 h-12 text-slate-200 mb-4" />
                                <p className="text-slate-400 font-medium text-sm">Buscá el nombre del producto para encontrar fotos reales</p>
                                <p className="text-slate-300 text-xs mt-1">Podés buscar en español, lo traducimos automáticamente</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-slate-50 text-center">
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                        Fotos de <span className="text-blue-600 font-black">GOOGLE IMAGES</span>
                        <span className="text-slate-300">·</span>
                        Guardadas en tu tienda
                    </p>
                </div>
            </Card>
        </div>
    )
}
