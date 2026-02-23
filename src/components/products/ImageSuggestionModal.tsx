import { useState, useEffect } from 'react'
import { Search, X, Loader2, Sparkles, Image as ImageIcon, AlertCircle } from 'lucide-react'
import { Button, Card } from '../common'

interface SDImage {
    url: string;
    loading: boolean;
    error: boolean;
}

interface ImageSuggestionModalProps {
    isOpen: boolean
    onClose: () => void
    onSelect: (url: string) => void
    initialQuery?: string
}

export default function ImageSuggestionModal({ isOpen, onClose, onSelect, initialQuery = '' }: ImageSuggestionModalProps) {
    const [images, setImages] = useState<SDImage[]>([])
    const [loading, setLoading] = useState(false)
    const [query, setQuery] = useState(initialQuery)
    const [error, setError] = useState<string | null>(null)

    const generateImage = async (prompt: string) => {
        const rawPrompt = prompt.trim().replace(/[- \t]+$/, '').trim()
        if (!rawPrompt) return

        // Enhance prompt for better product results
        const enhancedPrompt = `${rawPrompt}, professional product photography, studio lighting, high resolution, 4k, sharp focus`

        setLoading(true)
        setError(null)

        try {
            // Stable Diffusion via Pollinations.ai (Keyless & Free)
            const seed = Math.floor(Math.random() * 1000000)

            // Generate variants using the canonical pollinations.ai/p/ format
            // We use 'flux' model which is more modern and often more stable
            const newImages: SDImage[] = [1, 2, 3].map(i => ({
                url: `https://pollinations.ai/p/${encodeURIComponent(enhancedPrompt)}?seed=${seed + i}&width=1024&height=1024&model=flux&nologo=true`,
                loading: true,
                error: false
            }))

            setImages(newImages)
        } catch (err) {
            console.error('Error preparando generación:', err)
            setError('Error al conectar con la IA.')
        } finally {
            setLoading(false)
        }
    }

    const handleImageLoad = (index: number) => {
        setImages(prev => prev.map((img, i) => i === index ? { ...img, loading: false } : img))
    }

    const handleImageError = (index: number) => {
        setImages(prev => prev.map((img, i) => i === index ? { ...img, loading: false, error: true } : img))
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
                            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Sugerencias de IA</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Generación profesional con Stable Diffusion</p>
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
                        <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && generateImage(query)}
                            placeholder="Ej: Hamburguesa con queso cheddar derretido, fondo oscuro, foto profesional..."
                            className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-100 border-2 border-transparent focus:border-indigo-500 focus:bg-white text-slate-700 font-medium transition-all outline-none"
                        />
                        <Button
                            type="button"
                            onClick={() => generateImage(query)}
                            disabled={loading}
                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Generar'}
                        </Button>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 rounded-2xl border border-red-100 flex items-center gap-3 animate-shake">
                            <AlertCircle className="w-5 h-5 text-red-500" />
                            <p className="text-xs font-bold text-red-700 uppercase tracking-tight">{error}</p>
                        </div>
                    )}

                    {/* Results Grid */}
                    <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 grayscale opacity-50">
                                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Preparando lienzos...</p>
                            </div>
                        ) : images.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {images.map((img, idx) => (
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
                                                <p className="text-[7px] text-red-300 font-bold uppercase cursor-pointer underline" onClick={(e) => {
                                                    e.stopPropagation();
                                                    generateImage(query);
                                                }}>Reintentar</p>
                                            </div>
                                        )}

                                        <img
                                            src={img.url}
                                            alt="AI Generated"
                                            className={`w-full h-full object-cover transition-all duration-700 ${img.loading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'} ${img.error ? 'hidden' : ''}`}
                                            onLoad={() => handleImageLoad(idx)}
                                            onError={() => handleImageError(idx)}
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
                        ) : query ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <ImageIcon className="w-12 h-12 text-slate-200 mb-4" />
                                <p className="text-slate-400 font-medium text-sm">Describe tu producto y presiona generar</p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <ImageIcon className="w-12 h-12 text-slate-100 mb-4" />
                                <p className="text-slate-400 font-medium text-sm">Introduce una descripción para crear tus fotos profesionales</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-slate-50 text-center">
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                        Potenciado por <span className="text-indigo-600 font-black">STABLE DIFFUSION</span> (Gratis e Ilimitado)
                    </p>
                </div>
            </Card>
        </div>
    )
}
