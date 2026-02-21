import { useState, useRef } from 'react'
import { Card, Button } from '../../components/common'
import { QrCode, Download, Printer, Share2 } from 'lucide-react'
import { useOutletContext } from 'react-router-dom'
import { Tenant } from '../../types'

export default function QRPage() {
    const { tenant } = useOutletContext<{ tenant: Tenant | null }>()
    const [loading, setLoading] = useState(false)
    const qrRef = useRef<HTMLDivElement>(null)

    const shopUrl = tenant ? `https://vendexchat.app/${tenant.slug}` : ''

    const handleDownload = () => {
        // En una implementación real usaríamos una librería como qrcode.react
        // Aquí simulamos el proceso
        setLoading(true)
        setTimeout(() => {
            setLoading(false)
            window.print()
        }, 1000)
    }

    return (
        <div className="max-w-2xl mx-auto space-y-8 animate-fade-in pb-20">
            <div className="text-center">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Menú QR</h1>
                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1">Impulsa tus ventas físicas con acceso directo digital</p>
            </div>

            <Card className="p-12 flex flex-col items-center justify-center text-center space-y-8 border-none shadow-2xl bg-white rounded-[3rem]">
                <div
                    ref={qrRef}
                    className="w-64 h-64 bg-slate-50 rounded-[2.5rem] flex items-center justify-center border-4 border-slate-100 shadow-inner relative overflow-hidden group"
                >
                    <QrCode className="w-40 h-40 text-slate-900" />
                    <div className="absolute inset-0 bg-indigo-600/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="bg-white text-indigo-600 text-[10px] font-black px-4 py-2 rounded-full uppercase shadow-lg">Scan Me</span>
                    </div>
                </div>

                <div className="space-y-2">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">URL de tu Tienda</p>
                    <div className="bg-slate-50 px-6 py-3 rounded-2xl border border-slate-100 font-bold text-slate-900 text-sm">
                        {shopUrl}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 w-full pt-4">
                    <Button onClick={handleDownload} loading={loading} className="bg-indigo-600 text-white font-black uppercase tracking-widest text-xs h-14 flex items-center justify-center gap-2 rounded-2xl">
                        <Download className="w-4 h-4" />
                        Descargar
                    </Button>
                    <Button variant="outline" onClick={() => window.print()} className="border-2 border-slate-100 text-slate-600 font-black uppercase tracking-widest text-xs h-14 flex items-center justify-center gap-2 rounded-2xl">
                        <Printer className="w-4 h-4" />
                        Imprimir
                    </Button>
                </div>

                <Button variant="ghost" className="text-slate-400 font-bold uppercase tracking-widest text-[10px] flex items-center gap-2">
                    <Share2 className="w-3 h-3" />
                    Compartir en Redes
                </Button>
            </Card>

            <div className="bg-amber-50 rounded-[2rem] p-6 border border-amber-100 flex items-start gap-4">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                    <span className="text-xl">💡</span>
                </div>
                <div>
                    <h4 className="font-black text-amber-900 uppercase text-xs tracking-tight mb-1">Tip de Ventas</h4>
                    <p className="text-amber-800/70 text-sm font-medium">Coloca este código QR en tus mesas, vitrina o empaques para que tus clientes puedan pedir sin esperas.</p>
                </div>
            </div>
        </div>
    )
}
