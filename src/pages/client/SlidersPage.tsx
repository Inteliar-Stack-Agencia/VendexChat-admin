import { useState, useEffect, useRef } from 'react'
import { Card, Button, Input, LoadingSpinner } from '../../components/common'
import { Image as ImageIcon, Plus, Trash2, Save, Upload } from 'lucide-react'
import { showToast } from '../../components/common/Toast'
import { tenantApi, storageApi } from '../../services/api'
import { Slider } from '../../types'

export default function SlidersPage() {
    const [sliders, setSliders] = useState<Slider[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [uploadingId, setUploadingId] = useState<string | number | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        loadSliders()
    }, [])

    const loadSliders = async () => {
        try {
            const tenant = await tenantApi.getMe()
            setSliders(tenant.sliders || [])
        } catch (err) {
            showToast('error', 'Error al cargar los sliders')
        } finally {
            setLoading(false)
        }
    }

    const handleAdd = () => {
        setSliders([...sliders, { id: Date.now(), url: '', link: '', active: true }])
    }

    const handleDelete = (id: string | number) => {
        setSliders(sliders.filter(s => s.id !== id))
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            await tenantApi.updateMe({ sliders })
            showToast('success', 'Sliders actualizados correctamente')
        } catch (err) {
            showToast('error', 'Error al guardar los sliders')
        } finally {
            setSaving(false)
        }
    }

    const handleUpload = async (file: File, sliderId: string | number) => {
        setUploadingId(sliderId)
        try {
            const tenant = await tenantApi.getMe()
            const extension = file.name.split('.').pop()
            const path = `${tenant.id}/sliders/${sliderId}_${Date.now()}.${extension}`
            const url = await storageApi.uploadImage(file, 'stores', path, 'slider')

            const newSliders = sliders.map(s => s.id === sliderId ? { ...s, url } : s)
            setSliders(newSliders)
            await tenantApi.updateMe({ sliders: newSliders })
            showToast('success', 'Imagen subida y guardada correctamente')
        } catch (err) {
            console.error('Error uploading image (Sliders):', err)
            showToast('error', 'Error al subir la imagen')
        } finally {
            setUploadingId(null)
        }
    }

    if (loading) return <LoadingSpinner text="Cargando sliders..." />

    return (
        <div className="space-y-8 animate-fade-in pb-20">
            <div className="px-1 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Sliders</h1>
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1">Gestiona los banners promocionales de tu tienda</p>
                </div>
                <Button onClick={handleAdd} size="sm" className="bg-indigo-600">
                    <Plus className="w-4 h-4 mr-2" />
                    Añadir Slider
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {sliders.map((slider) => (
                    <Card key={slider.id} className="p-0 overflow-hidden group shadow-sm hover:shadow-xl transition-all duration-300">
                        <div className="aspect-[21/9] bg-slate-50 relative border-b border-slate-100">
                            {slider.url ? (
                                <img src={slider.url} alt="Slider" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                                    <ImageIcon className="w-12 h-12 mb-2" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Sin imagen cargada</span>
                                </div>
                            )}
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => handleDelete(slider.id)}
                                    className="bg-white/90 p-2 rounded-xl text-rose-500 hover:bg-rose-500 hover:text-white transition-all shadow-lg"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex items-end gap-2">
                                <div className="flex-1">
                                    <Input
                                        label="URL de la imagen"
                                        value={slider.url}
                                        onChange={(e) => {
                                            const newSliders = [...sliders]
                                            const idx = newSliders.findIndex(n => n.id === slider.id)
                                            newSliders[idx].url = e.target.value
                                            setSliders(newSliders)
                                        }}
                                        placeholder="https://..."
                                    />
                                </div>
                                <Button
                                    variant="outline"
                                    className="mb-[2px] h-[42px] px-3 border-dashed border-2 hover:border-indigo-600 hover:bg-indigo-50"
                                    onClick={() => {
                                        setUploadingId(slider.id)
                                        fileInputRef.current?.click()
                                    }}
                                    loading={uploadingId === slider.id}
                                >
                                    <Upload className="w-4 h-4" />
                                </Button>
                            </div>
                            <Input
                                label="Enlace al hacer clic"
                                value={slider.link}
                                onChange={(e) => {
                                    const newSliders = [...sliders]
                                    const idx = newSliders.findIndex(n => n.id === slider.id)
                                    newSliders[idx].link = e.target.value
                                    setSliders(newSliders)
                                }}
                                placeholder="/products/..."
                            />
                        </div>
                    </Card>
                ))}
            </div>

            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file && uploadingId) {
                        handleUpload(file, uploadingId)
                    }
                }}
            />

            <div className="flex justify-end pt-4">
                <Button onClick={handleSave} loading={saving} className="bg-indigo-600 px-10 h-14 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-indigo-100">
                    <Save className="w-4 h-4 mr-2" />
                    Guardar Cambios
                </Button>
            </div>

            <Card className="bg-indigo-50 border-indigo-100 p-6 rounded-[2rem]">
                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
                        <span className="text-xl">✨</span>
                    </div>
                    <div>
                        <h4 className="font-black text-indigo-900 uppercase text-xs tracking-tight mb-1">Dato de interés</h4>
                        <p className="text-indigo-800/70 text-sm font-medium">Usa imágenes de 1920x800px para una mejor visualización tanto en móviles como en computadoras.</p>
                    </div>
                </div>
            </Card>
        </div>
    )
}
