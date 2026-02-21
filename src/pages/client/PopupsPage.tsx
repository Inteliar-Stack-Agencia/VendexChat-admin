import { useState } from 'react'
import { Card, Button, Input } from '../../components/common'
import { Bell, Save, Trash2, Plus, Layout, MessageSquare } from 'lucide-react'
import { showToast } from '../../components/common/Toast'

export default function PopupsPage() {
    const [popups, setPopups] = useState([
        { id: 1, title: '¡Envío Gratis!', message: 'Aprovecha envío gratis en compras mayores a $5000', active: true },
    ])

    const handleSave = () => {
        showToast('success', 'Mensajes emergentes actualizados')
    }

    return (
        <div className="space-y-8 animate-fade-in pb-20">
            <div className="px-1 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Popups</h1>
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1">Mensajes automáticos para tus clientes</p>
                </div>
                <Button size="sm" className="bg-indigo-600">
                    <Plus className="w-4 h-4 mr-2" />
                    Nuevo Popup
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {popups.map((popup) => (
                    <Card key={popup.id} className="relative overflow-hidden group shadow-sm hover:shadow-xl transition-all duration-300">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                                <Bell className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-black text-slate-900 uppercase text-xs">Configuración de Alerta</h3>
                                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Se mostrará al cargar la página</p>
                            </div>
                            <button className="text-slate-300 hover:text-rose-500 transition-colors">
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <Input label="Título del mensaje" value={popup.title} />
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Contenido</label>
                                <textarea
                                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-600 transition-all"
                                    rows={3}
                                    value={popup.message}
                                />
                            </div>
                            <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-slate-50 rounded-xl transition-colors">
                                <input type="checkbox" checked={popup.active} className="w-5 h-5 rounded-lg border-none bg-slate-200 text-indigo-600 focus:ring-0" />
                                <span className="text-xs font-bold text-slate-600 uppercase">Activar este mensaje</span>
                            </label>
                        </div>
                    </Card>
                ))}
            </div>

            <div className="flex justify-end pt-4">
                <Button onClick={handleSave} className="bg-indigo-600 px-10 h-14 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-indigo-100">
                    <Save className="w-4 h-4 mr-2" />
                    Guardar Cambios
                </Button>
            </div>

            <Card className="bg-indigo-50 border-indigo-100 p-8 rounded-[3rem]">
                <div className="flex gap-6 items-center">
                    <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center shadow-xl shrink-0">
                        <Layout className="w-8 h-8 text-indigo-600" />
                    </div>
                    <div>
                        <h4 className="font-black text-indigo-900 uppercase text-sm tracking-tight mb-2">Consejo de Conversión</h4>
                        <p className="text-indigo-800/70 text-sm font-medium leading-relaxed">Usa los popups para anunciar promociones relámpago o cambios de horario. No satures a tus clientes, un solo mensaje bien diseñado funciona mejor.</p>
                    </div>
                </div>
            </Card>
        </div>
    )
}
