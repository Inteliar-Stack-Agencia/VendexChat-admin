import { useState, useEffect, useRef } from 'react'
import {
    Wand2,
    ClipboardList,
    Image as ImageIcon,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Trash2,
    Plus,
    Save,
    FolderPlus,
    Download,
    Upload,
    Sparkles,
    ScanLine,
    Camera
} from 'lucide-react'
import { Card, Button, showToast, Badge } from '../../components/common'
import ImageSuggestionModal from '../../components/products/ImageSuggestionModal'
import FeatureGuard from '../../components/FeatureGuard'
import { supabase } from '../../supabaseClient'
import { getStoreId } from '../../services/api'
import Tesseract from 'tesseract.js'
import { normalizeProductData } from '../../utils/helpers'

interface TempProduct {
    id: string
    name: string
    price: number
    description: string
    category_id: string | null
    category_name?: string
    image_url?: string
}

export default function AIImporterPage() {
    const [rawText, setRawText] = useState('')
    const [isProcessing, setIsProcessing] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [ocrProgress, setOcrProgress] = useState(0)
    const [isScanning, setIsScanning] = useState(false)
    const [results, setResults] = useState<TempProduct[]>([])
    const [categories, setCategories] = useState<{ id: string, name: string }[]>([])
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>('')
    const [step, setStep] = useState<1 | 2>(1) // 1: Input, 2: Review
    const [isDragging, setIsDragging] = useState(false)
    const [isImageModalOpen, setIsImageModalOpen] = useState(false)
    const [activeProductId, setActiveProductId] = useState<string | null>(null)

    const fileInputRef = useRef<HTMLInputElement>(null)

    // Cargar categorías al inicio
    const loadCategories = async () => {
        try {
            const storeId = await getStoreId()
            const { data, error } = await supabase
                .from('categories')
                .select('id, name')
                .eq('store_id', storeId)
                .order('name')

            if (error) throw error
            if (data && data.length > 0) {
                setCategories(data)
                setSelectedCategoryId(data[0].id)
            }
        } catch (err) {
            console.error('Error cargando categorías:', err)
        }
    }

    useEffect(() => {
        loadCategories()
    }, [])

    // Generar y descargar plantilla CSV
    const downloadTemplate = () => {
        if (categories.length === 0) {
            showToast('error', 'Crea al menos una categoría primero para generar la plantilla.')
            return
        }

        const headers = 'Categoria;Producto;Precio;Descripcion\n'
        const rows = categories.map(cat => `${cat.name};Ejemplo ${cat.name};1200;Sabor increíble`).join('\n')
        const csvContent = headers + rows

        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        const url = URL.createObjectURL(blob)

        link.setAttribute('href', url)
        link.setAttribute('download', 'plantilla_VENDEx_pro.csv')
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        showToast('success', 'Plantilla generada con tus categorías')
    }

    // Procesar archivo CSV
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
        if ('preventDefault' in e) e.preventDefault()

        let file: File | null = null
        if ('target' in e && 'files' in e.target && e.target.files) {
            file = e.target.files[0]
        } else if ('dataTransfer' in e && e.dataTransfer.files) {
            file = e.dataTransfer.files[0]
        }

        if (!file) return

        const fileName = file.name.toLowerCase()
        if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
            showToast('error', 'Excel directo (.xlsx) no compatible. Guardalo como "CSV" y subilo de nuevo.')
            return
        }

        // Si es una imagen... OCR
        if (file.type.startsWith('image/')) {
            handleImageScan(file)
            return
        }

        const reader = new FileReader()
        reader.onload = (event) => {
            const text = event.target?.result as string
            if (text) {
                if (text.includes('\u0000') || text.includes('\u0001')) {
                    showToast('error', 'El archivo parece binario. Asegúrate de exportarlo como CSV.')
                    return
                }
                parseCSV(text)
            }
        }
        reader.readAsText(file)
    }

    const handleImageScan = async (file: File) => {
        setIsScanning(true)
        setOcrProgress(0)

        try {
            const result = await Tesseract.recognize(
                file,
                'spa', // Español
                {
                    logger: m => {
                        if (m.status === 'recognizing text') {
                            setOcrProgress(Math.round(m.progress * 100))
                        }
                    }
                }
            )

            const text = result.data.text
            if (text.trim().length < 5) {
                showToast('error', 'No se pudo leer texto claro de la imagen.')
                return
            }

            setRawText(text)
            showToast('success', 'Imagen escaneada con éxito.')
            // No procesamos con IA automáticamente para que el usuario pueda ver el texto primero si quiere,
            // o lo hacemos por comodidad. Vamos a procesarlo directamente para el efecto "Magia".
            await processWithAI(text)
        } catch (err) {
            console.error('OCR Error:', err)
            showToast('error', 'Ocurrió un error al escanear la imagen.')
        } finally {
            setIsScanning(false)
            setOcrProgress(0)
        }
    }

    const parseCSV = (text: string) => {
        setIsProcessing(true)
        try {
            const cleanText = text.replace(/\r/g, '').replace(/^\uFEFF/, '')
            const lines = cleanText.split('\n').filter(l => l.trim().length > 0)
            const extracted: TempProduct[] = []

            const firstLine = lines[0]
            const separator = firstLine.includes(';') ? ';' : ','
            const startIndex = (firstLine.toLowerCase().includes('categoria') || firstLine.toLowerCase().includes('producto')) ? 1 : 0

            for (let i = startIndex; i < lines.length; i++) {
                const parts = lines[i].split(separator).map(s => s?.trim().replace(/^"|"$/g, ''))
                if (parts.length < 2) continue

                const [catName, prodName, price, desc] = parts
                if (prodName) {
                    const category = categories.find(c => c.name.toLowerCase() === catName?.toLowerCase())
                    const normalized = normalizeProductData(prodName, desc || `Importado vía Excel: ${catName}`)
                    extracted.push({
                        id: crypto.randomUUID(),
                        name: normalized.name,
                        price: price ? parseFloat(price.replace('$', '').replace(/\./g, '').replace(',', '.')) : 0,
                        description: normalized.description,
                        category_id: category?.id || selectedCategoryId,
                        category_name: category?.name || 'Genérica'
                    })
                }
            }

            if (extracted.length > 0) {
                setResults(extracted)
                setStep(2)
                showToast('success', `¡Archivo procesado! ${extracted.length} productos listos.`)
            } else {
                showToast('error', 'No se detectaron productos válidos.')
            }
        } catch (err) {
            showToast('error', 'Error al leer el archivo CSV.')
        } finally {
            setIsProcessing(false)
        }
    }

    const processWithAI = async (textToProcess?: string) => {
        const textToUse = textToProcess || rawText
        if (!textToUse.trim()) {
            showToast('error', 'Pega primero alguna lista de productos o subí una foto.')
            return
        }

        setIsProcessing(true)

        try {
            const systemPrompt = `Actúa como un experto en extracción de datos de menús y catálogos comerciales.
            Tu objetivo es convertir texto desordenado en una lista estructurada de productos de ecommerce.
            
            REGLAS CRÍTICAS:
            1. Devuelve EXCLUSIVAMENTE un array de objetos JSON válido.
            2. Cada objeto debe tener: "name" (string, máx 70 chars), "price" (number), "description" (string).
            3. Si el texto tiene saltos de línea (ej: el nombre arriba y el precio abajo como "Nombre \\n 1500"), únelos como un solo producto.
            4. Si detectas ingredientes o detalles después del nombre, ponlos en "description".
            5. Si no hay precio, usa 0.
            6. Limpia viñetas (- • *) y espacios innecesarios.
            7. Responde SOLO el JSON, sin texto adicional, sin bloques de código markdown, solo el array [{},{}].
            
            TEXTO PARA PROCESAR:
            ${textToUse}`;

            const response = await fetch('https://text.pollinations.ai/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: 'Procesa esta lista ahora. Devuelve solo un array JSON [].' }
                    ],
                    model: 'openai',
                    seed: 42
                })
            });

            if (!response.ok) throw new Error('Error en el servicio de IA');

            const resultText = await response.text();

            // Limpieza robusta de JSON
            let cleanJson = resultText.trim();
            if (cleanJson.includes('```')) {
                const match = cleanJson.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
                if (match) cleanJson = match[1];
            }

            const jsonMatch = cleanJson.match(/\[\s*\{[\s\S]*\}\s*\]/);
            if (jsonMatch) cleanJson = jsonMatch[0];

            let extractedRaw = [];
            try {
                extractedRaw = JSON.parse(cleanJson);
            } catch (e) {
                console.error("Failed to parse AI JSON:", cleanJson);
                throw new Error('Formato JSON inválido de la IA');
            }

            if (!Array.isArray(extractedRaw)) throw new Error('La IA no devolvió una lista');

            const extracted: TempProduct[] = extractedRaw.map((item: any) => {
                const normalized = normalizeProductData(item.name || 'Sin nombre', item.description || '')
                return {
                    id: crypto.randomUUID(),
                    name: normalized.name.substring(0, 70),
                    price: typeof item.price === 'number' ? item.price : 0,
                    description: normalized.description || 'Procesado con IA de alta precisión',
                    category_id: selectedCategoryId || null
                }
            });

            if (extracted.length === 0) {
                // Si la IA devolvió lista vacía, forzar fallback heuristic
                throw new Error('IA no detectó productos');
            } else {
                setResults(extracted)
                setStep(2)
                showToast('success', `¡IA Mágica detectó ${extracted.length} productos!`)
            }
        } catch (err) {
            console.error('AI Processing Error:', err);
            showToast('info', 'IA ocupada o formato difícil. Usando extracción de emergencia...')

            const lines = textToUse.split('\n').map(l => l.trim()).filter(l => l.length > 2);
            const fallbackResults: TempProduct[] = [];
            let lastProduct: TempProduct | null = null;

            lines.forEach(line => {
                const priceRegex = /(?:\$|ARS|AR\$|USD)?\s?(\d+(?:\.\d{3})*(?:,\d{2})?)/i;
                const match = line.match(priceRegex);
                const priceValue = match ? parseFloat(match[1].replace(/\./g, '').replace(',', '.')) : null;
                const nameOnly = line.replace(priceRegex, '').replace(/^[-•*+]\s?/, '').trim();

                if (priceValue !== null && nameOnly.length < 2 && lastProduct) {
                    // Es probablemente el precio del producto anterior
                    lastProduct.price = priceValue;
                } else if (nameOnly.length > 2) {
                    const normalized = normalizeProductData(nameOnly, '');
                    lastProduct = {
                        id: crypto.randomUUID(),
                        name: normalized.name.substring(0, 70),
                        price: priceValue || 0,
                        description: 'Extracción de emergencia',
                        category_id: selectedCategoryId || null
                    };
                    fallbackResults.push(lastProduct);
                }
            });

            if (fallbackResults.length > 0) {
                setResults(fallbackResults);
                setStep(2);
                showToast('success', `Extracción de emergencia: ${fallbackResults.length} productos`);
            } else {
                showToast('error', 'No se pudo detectar nada. Intentá con un texto más claro.');
            }
        } finally {
            setIsProcessing(false)
        }
    }

    const removeItem = (id: string) => {
        setResults(prev => prev.filter(item => item.id !== id))
    }

    const saveProducts = async () => {
        if (!selectedCategoryId && results.some(r => !r.category_id)) {
            showToast('error', 'Seleccioná una categoría para continuar.')
            return
        }

        setIsSaving(true)
        try {
            const storeId = await getStoreId()
            const productsToInsert = results.map(item => {
                const { name, description } = normalizeProductData(item.name, item.description)
                return {
                    store_id: storeId,
                    category_id: item.category_id || selectedCategoryId,
                    name,
                    price: item.price,
                    description,
                    image_url: item.image_url || null,
                    is_active: true,
                    stock: 0,
                    unlimited_stock: true
                }
            })

            const { error } = await supabase.from('products').insert(productsToInsert)
            if (error) throw error

            showToast('success', '¡Productos importados con éxito!')
            setStep(1)
            setResults([])
            setRawText('')
        } catch (err) {
            showToast('error', 'Error al guardar los productos.')
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <FeatureGuard feature="ai-importer" minPlan="vip">
            <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-20">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-1">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
                                <Wand2 className="w-6 h-6 text-white" />
                            </div>
                            <Badge className="bg-amber-100 text-amber-700 border-amber-200 font-black uppercase text-[9px]">VENDEx AI</Badge>
                        </div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Importador Mágico IA</h1>
                        <p className="text-slate-500 font-medium mt-1">Migra toda tu información en segundos pegando listas o subiendo fotos.</p>
                    </div>
                    <Button
                        onClick={downloadTemplate}
                        className="bg-slate-900 text-white font-black uppercase tracking-widest text-[9px] px-6 py-4 rounded-2xl flex items-center gap-2 hover:bg-slate-800 transition-all shadow-xl shadow-slate-100"
                    >
                        <Download className="w-4 h-4" /> Bajar Plantilla Excel
                    </Button>
                </div>

                {step === 1 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className={`lg:col-span-2 transition-all duration-300 ${isDragging ? 'scale-[1.01]' : ''}`}>
                            <Card className={`p-8 border-2 ${isDragging ? 'border-dashed border-indigo-500 bg-indigo-50/30 shadow-none' : 'border-indigo-100 shadow-2xl shadow-indigo-50/50'}`}>
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                    <div className="flex items-center gap-3">
                                        <ClipboardList className="w-6 h-6 text-indigo-500" />
                                        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Pega tu lista aquí o arrastra un archivo</h3>
                                    </div>
                                    <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-2xl border border-slate-200">
                                        <FolderPlus className="w-4 h-4 text-slate-500 ml-2" />
                                        <select
                                            value={selectedCategoryId}
                                            onChange={(e) => setSelectedCategoryId(e.target.value)}
                                            className="bg-transparent border-0 text-[10px] font-black uppercase tracking-widest text-slate-700 focus:ring-0 cursor-pointer pr-10"
                                        >
                                            {categories.map(cat => (
                                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                                            ))}
                                            {categories.length === 0 && <option value="">Sin categorías</option>}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-1.5 h-4 bg-indigo-500 rounded-full" />
                                            <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Opción 1: Pegar Texto</h4>
                                        </div>
                                        <textarea
                                            value={rawText}
                                            onChange={(e) => setRawText(e.target.value)}
                                            placeholder="REGLA: PRODUCTO - PRECIO - DESCRIPCIÓN&#10;&#10;Ejemplos:&#10;Hamburguesa Clásica - $2500 - Con lechuga y tomate&#10;Pizza Margarita - 5000 - Mucho queso y albahaca&#10;Limonada fresca | 1200 | Jengibre y menta"
                                            className="w-full h-64 p-6 rounded-3xl bg-slate-50 border-2 border-slate-100 text-slate-700 font-medium focus:border-indigo-500 focus:ring-0 transition-all resize-none placeholder:text-slate-300 text-sm"
                                        />
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-1.5 h-4 bg-emerald-500 rounded-full" />
                                            <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Opción 2: Subir Archivo / Foto</h4>
                                        </div>
                                        <div
                                            className={`relative h-64 border-2 border-dashed rounded-3xl transition-all flex flex-col items-center justify-center p-6 text-center group ${isDragging ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/30'}`}
                                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                                            onDragLeave={() => setIsDragging(false)}
                                            onDrop={(e) => { setIsDragging(false); handleFileUpload(e) }}
                                        >
                                            <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                                <Upload className="w-8 h-8 text-emerald-600" />
                                            </div>
                                            <p className="text-sm font-black text-slate-900 uppercase tracking-tight mb-1">Soltá tu archivo o foto aquí</p>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
                                                Formatos: <span className="text-emerald-600">CSV, EXCEL o Foto (JPG/PNG)</span><br />
                                                <span className="text-[8px] text-amber-600">(Si es foto activaremos el Escaneo Visual)</span>
                                            </p>
                                            <input
                                                type="file"
                                                accept=".csv,text/csv,.xlsx,.xls,image/*"
                                                onChange={handleFileUpload}
                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8 flex items-center justify-between gap-4 border-t border-slate-100 pt-8">
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 rounded-xl border border-indigo-100">
                                            <span className="text-[10px] font-black uppercase tracking-tight text-indigo-700">Modo Híbrido</span>
                                        </div>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                            WhatsApp, CSV o Fotos de Menús.
                                        </p>
                                    </div>
                                    <Button
                                        onClick={() => processWithAI()}
                                        disabled={isProcessing || isScanning}
                                        className="bg-indigo-600 hover:bg-slate-900 text-white font-black uppercase tracking-widest text-xs px-10 py-5 rounded-2xl shadow-xl shadow-indigo-100 flex items-center gap-3"
                                    >
                                        {isProcessing ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                Analizando Datos...
                                            </>
                                        ) : (
                                            <>
                                                <Wand2 className="w-5 h-5" />
                                                Procesar con IA
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </Card>
                        </div>
                        <div className="space-y-6">
                            <Card className={`p-6 bg-slate-900 text-white border-0 shadow-xl overflow-hidden relative transition-all duration-500 ${isScanning ? 'ring-4 ring-indigo-500 ring-offset-2 ring-offset-slate-900 scale-[1.02]' : ''}`}>
                                <div className="relative z-10">
                                    <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center mb-4">
                                        <Camera className={`w-5 h-5 ${isScanning ? 'text-indigo-400 animate-pulse' : 'text-indigo-300'}`} />
                                    </div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <h4 className="font-black uppercase text-[10px] tracking-widest text-indigo-400">Escaneo Visual</h4>
                                        {isScanning && <Badge className="bg-indigo-500 text-white border-0 text-[8px] animate-pulse">Analizando carta</Badge>}
                                    </div>
                                    <h3 className="text-xl font-bold mb-3 italic">OCR Inteligente</h3>
                                    <p className="text-xs text-slate-400 font-medium leading-relaxed mb-6">
                                        ¡Activado! Ahora podés subir una **foto de tu menú físico** y leeremos los productos automáticamente.
                                    </p>

                                    {isScanning ? (
                                        <div className="space-y-3">
                                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                                <span className="text-indigo-400">Escanendo Texto...</span>
                                                <span>{ocrProgress}%</span>
                                            </div>
                                            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-indigo-500 transition-all duration-300 shadow-[0_0_15px_rgba(99,102,241,0.5)]"
                                                    style={{ width: `${ocrProgress}%` }}
                                                />
                                            </div>
                                            <p className="text-[9px] text-slate-500 italic mt-2 text-center">IA Procesando imagen localmente...</p>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="w-full py-4 bg-white/5 hover:bg-white/10 border-2 border-white/10 hover:border-indigo-500/50 rounded-2xl flex items-center justify-center gap-3 transition-all group"
                                        >
                                            <ScanLine className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Subir Foto de Menú</span>
                                        </button>
                                    )}
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileUpload}
                                        className="hidden"
                                    />
                                </div>
                                <div className={`absolute -bottom-8 -right-8 transition-transform duration-1000 ${isScanning ? 'scale-150 rotate-12 opacity-10' : 'opacity-5'}`}>
                                    <Wand2 className="w-32 h-32 text-indigo-400" />
                                </div>
                            </Card>
                            <div className="bg-amber-50 rounded-3xl p-6 border border-amber-100 italic">
                                <div className="flex items-center gap-2 mb-3">
                                    <AlertCircle className="w-4 h-4 text-amber-600" />
                                    <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Tip pro de escaneo</span>
                                </div>
                                <p className="text-xs text-amber-800 font-medium leading-relaxed">
                                    Para fotos de menús, asegurate de que haya buena iluminación y que el texto no esté borroso para que la IA lea el 100%.
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6 animate-slide-up">
                        <Card className="overflow-hidden border-2 border-indigo-100 shadow-2xl">
                            <div className="bg-indigo-50/50 px-8 py-5 border-b border-indigo-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Resultados Detectados ({results.length})</h3>
                                </div>
                                <button onClick={() => setStep(1)} className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline">
                                    ← Volver a escanear
                                </button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                            <th className="px-8 py-4 text-center">Sugerir Foto</th>
                                            <th className="px-8 py-4">Nombre</th>
                                            <th className="px-8 py-4">Precio</th>
                                            <th className="px-8 py-4">Descripción / Origen</th>
                                            <th className="px-8 py-4 text-right">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {results.map((item) => (
                                            <tr key={item.id} className="group hover:bg-slate-50/50">
                                                <td className="px-8 py-4">
                                                    <div
                                                        onClick={() => { setActiveProductId(item.id); setIsImageModalOpen(true) }}
                                                        className="w-10 h-10 mx-auto rounded-lg bg-slate-100 flex items-center justify-center cursor-pointer hover:bg-indigo-50 transition-all border-2 border-transparent hover:border-indigo-200 overflow-hidden group/img relative"
                                                    >
                                                        {item.image_url ? (
                                                            <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <ImageIcon className="w-5 h-5 text-slate-300 group-hover/img:text-indigo-400" />
                                                        )}
                                                        <div className="absolute inset-0 bg-indigo-600/10 opacity-0 group-hover/img:opacity-100 flex items-center justify-center">
                                                            <Sparkles className="w-3 h-3 text-indigo-600" />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-4">
                                                    <input
                                                        type="text"
                                                        value={item.name}
                                                        onChange={(e) => setResults(prev => prev.map(i => i.id === item.id ? { ...i, name: e.target.value.toUpperCase() } : i))}
                                                        className="bg-transparent border-0 font-bold text-slate-900 focus:ring-1 focus:ring-indigo-500 rounded px-2 -ml-2 text-sm w-full"
                                                    />
                                                </td>
                                                <td className="px-8 py-4">
                                                    <div className="flex items-center gap-1 font-black text-indigo-600 text-sm">
                                                        <span>$</span>
                                                        <input
                                                            type="number"
                                                            value={item.price}
                                                            onChange={(e) => setResults(prev => prev.map(i => i.id === item.id ? { ...i, price: parseFloat(e.target.value) } : i))}
                                                            className="bg-transparent border-0 focus:ring-1 focus:ring-indigo-500 rounded px-1 -ml-1 text-sm w-24 font-black"
                                                        />
                                                    </div>
                                                </td>
                                                <td className="px-8 py-4">
                                                    <input
                                                        type="text"
                                                        value={item.description}
                                                        onChange={(e) => setResults(prev => prev.map(i => i.id === item.id ? { ...i, description: e.target.value.toLowerCase() } : i))}
                                                        className="bg-transparent border-0 text-slate-400 font-medium italic focus:ring-1 focus:ring-indigo-500 rounded px-2 -ml-2 text-xs w-full"
                                                    />
                                                </td>
                                                <td className="px-8 py-4 text-right">
                                                    <button onClick={() => removeItem(item.id)} className="w-8 h-8 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center hover:bg-rose-50 hover:text-rose-600 transition-all opacity-0 group-hover:opacity-100">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-6">
                                <div className="flex flex-col gap-1">
                                    <p className="text-xs text-slate-400 font-black uppercase tracking-widest">Paso final</p>
                                    <p className="text-[10px] text-slate-400 font-medium">Revisá bien los nombres y precios. ¡Podes sugerir fotos con IA también!</p>
                                </div>
                                <div className="flex items-center gap-4 w-full sm:w-auto">
                                    <Button
                                        variant="outline"
                                        onClick={() => setResults([...results, { id: crypto.randomUUID(), name: 'Nuevo Producto', price: 0, description: 'Agregado manualmente', category_id: null }])}
                                        className="flex-1 sm:flex-none border-2 border-slate-200 text-slate-600 font-black uppercase tracking-widest text-[10px] px-6 py-4 rounded-2xl flex items-center gap-2 hover:bg-white transition-all hover:scale-105 active:scale-95"
                                    >
                                        <Plus className="w-4 h-4" /> Agregar Fila
                                    </Button>
                                    <Button
                                        onClick={saveProducts}
                                        disabled={results.length === 0 || isSaving}
                                        className="flex-1 sm:flex-none bg-emerald-600 hover:bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] px-10 py-4 rounded-2xl shadow-xl shadow-emerald-100 flex items-center gap-3 transition-all hover:scale-105 active:scale-95"
                                    >
                                        {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Importando...</> : <><Save className="w-4 h-4" /> Confirmar e Importar</>}
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    </div>
                )}
            </div>
            <ImageSuggestionModal
                isOpen={isImageModalOpen}
                onClose={() => { setIsImageModalOpen(false); setActiveProductId(null) }}
                onSelect={(url) => {
                    if (activeProductId) {
                        setResults(prev => prev.map(item => item.id === activeProductId ? { ...item, image_url: url } : item))
                    }
                    setIsImageModalOpen(false); setActiveProductId(null)
                }}
                initialQuery={results.find(r => r.id === activeProductId)?.name || ''}
            />
        </FeatureGuard>
    )
}
