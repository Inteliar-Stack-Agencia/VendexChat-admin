import { useState, useRef, useEffect } from 'react'
import { Card, Button } from '../../components/common'
import { Download, Printer, Share2, CheckCircle } from 'lucide-react'
import { useOutletContext } from 'react-router-dom'
import { Tenant } from '../../types'
import QRCode from 'qrcode'

export default function QRPage() {
    const { tenant } = useOutletContext<{ tenant: Tenant | null }>()
    const [loading, setLoading] = useState(false)
    const [copied, setCopied] = useState(false)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    const shopUrl = tenant ? `https://vendexchat.app/${tenant.slug}` : ''

    // Generate real QR on canvas whenever the URL changes
    useEffect(() => {
        if (!shopUrl || !canvasRef.current) return
        QRCode.toCanvas(canvasRef.current, shopUrl, {
            width: 256,
            margin: 2,
            color: {
                dark: '#0f172a',  // slate-900
                light: '#f8fafc', // slate-50
            },
            errorCorrectionLevel: 'H',
        })
    }, [shopUrl])

    const handleDownload = () => {
        if (!canvasRef.current) return
        setLoading(true)
        try {
            const link = document.createElement('a')
            link.download = `qr-${tenant?.slug || 'tienda'}.png`
            link.href = canvasRef.current.toDataURL('image/png')
            link.click()
        } finally {
            setLoading(false)
        }
    }

    const handlePrint = () => {
        if (!canvasRef.current) return
        const dataUrl = canvasRef.current.toDataURL('image/png')
        const win = window.open('', '_blank')
        if (!win) return
        win.document.write(`
            <html><head><title>QR ${tenant?.name}</title>
            <style>
                body { display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:100vh; font-family:sans-serif; gap:16px; }
                img { width:256px; height:256px; }
                p { font-size:12px; color:#64748b; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; }
                h2 { font-size:20px; font-weight:900; color:#0f172a; margin:0; }
            </style></head>
            <body>
                <h2>${tenant?.name}</h2>
                <img src="${dataUrl}" />
                <p>${shopUrl}</p>
            </body></html>
        `)
        win.document.close()
        win.print()
    }

    const handleShare = async () => {
        if (navigator.share) {
            await navigator.share({ title: tenant?.name, url: shopUrl })
        } else {
            await navigator.clipboard.writeText(shopUrl)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    return (
        <div className="max-w-2xl mx-auto space-y-8 animate-fade-in pb-20">
            <div className="text-center">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Menú QR</h1>
                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1">Impulsa tus ventas físicas con acceso directo digital</p>
            </div>

            <Card className="p-12 flex flex-col items-center justify-center text-center space-y-8 border-none shadow-2xl bg-white rounded-[3rem]">
                {/* Real QR canvas */}
                <div className="w-64 h-64 bg-slate-50 rounded-[2.5rem] flex items-center justify-center border-4 border-slate-100 shadow-inner overflow-hidden">
                    <canvas
                        ref={canvasRef}
                        className="rounded-2xl"
                        style={{ width: 232, height: 232 }}
                    />
                </div>

                <div className="space-y-2">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">URL de tu Tienda</p>
                    <div className="bg-slate-50 px-6 py-3 rounded-2xl border border-slate-100 font-bold text-slate-900 text-sm break-all">
                        {shopUrl}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 w-full pt-4">
                    <Button
                        onClick={handleDownload}
                        loading={loading}
                        className="bg-indigo-600 text-white font-black uppercase tracking-widest text-xs h-14 flex items-center justify-center gap-2 rounded-2xl hover:bg-indigo-700 transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        Descargar
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handlePrint}
                        className="border-2 border-slate-100 text-slate-600 font-black uppercase tracking-widest text-xs h-14 flex items-center justify-center gap-2 rounded-2xl hover:bg-slate-50 transition-colors"
                    >
                        <Printer className="w-4 h-4" />
                        Imprimir
                    </Button>
                </div>

                <Button
                    variant="ghost"
                    onClick={handleShare}
                    className="text-slate-400 font-bold uppercase tracking-widest text-[10px] flex items-center gap-2 hover:text-indigo-600 transition-colors"
                >
                    {copied ? <CheckCircle className="w-3 h-3 text-emerald-500" /> : <Share2 className="w-3 h-3" />}
                    {copied ? '¡URL Copiada!' : 'Compartir en Redes'}
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
