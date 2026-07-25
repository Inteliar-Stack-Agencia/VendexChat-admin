import { useState, useEffect, useRef, useCallback } from 'react'
import { Tag, CheckCircle2, XCircle, ShoppingBag, Truck, ScanLine } from 'lucide-react'
import { Card } from '../../components/common'
import { labelsApi, type StockLabel } from '../../services/labelsApi'

const today = new Date().toISOString().split('T')[0]

const DESTINATION_LABEL: Record<StockLabel['destination'], { label: string; icon: typeof ShoppingBag; color: string }> = {
  venta_directa: { label: 'Venta directa', icon: ShoppingBag, color: 'text-emerald-600 bg-emerald-50' },
  despacho: { label: 'Despacho', icon: Truck, color: 'text-indigo-600 bg-indigo-50' },
}

interface ScanEvent {
  id: string
  ok: boolean
  message: string
  label?: StockLabel
  time: string
}

export default function ScanLabelsPage() {
  const [code, setCode] = useState('')
  const [scanning, setScanning] = useState(false)
  const [history, setHistory] = useState<ScanEvent[]>([])
  const [summary, setSummary] = useState<Record<StockLabel['destination'], { generado: number; escaneado: number }> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const loadSummary = useCallback(async () => {
    try {
      setSummary(await labelsApi.getDaySummary(today))
    } catch {
      // silencioso: el resumen es informativo, no bloquea el escaneo
    }
  }, [])

  useEffect(() => { loadSummary() }, [loadSummary])
  useEffect(() => { inputRef.current?.focus() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const value = code.trim()
    if (!value || scanning) return
    setScanning(true)
    try {
      const label = await labelsApi.scan(value)
      const dest = DESTINATION_LABEL[label.destination]
      setHistory(prev => [{
        id: label.id, ok: true, time: new Date().toLocaleTimeString('es-AR'),
        message: `${label.product_name}${label.comensal ? ` · ${label.comensal}` : ''} · ${dest.label}`,
        label,
      }, ...prev].slice(0, 20))
      loadSummary()
    } catch (err) {
      setHistory(prev => [{
        id: `err-${Date.now()}`, ok: false, time: new Date().toLocaleTimeString('es-AR'),
        message: err instanceof Error ? err.message : 'Error al escanear',
      }, ...prev].slice(0, 20))
    } finally {
      setCode('')
      setScanning(false)
      inputRef.current?.focus()
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center">
          <ScanLine className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-black text-gray-900">Escanear stock</h1>
          <p className="text-sm text-gray-400">Escaneá cada etiqueta al empaquetar · el destino ya viene en el código, no hay que elegir nada</p>
        </div>
      </div>

      {/* Scan input */}
      <Card>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={code}
            onChange={e => setCode(e.target.value)}
            placeholder="Escaneá o pegá el código..."
            disabled={scanning}
            autoComplete="off"
            className="flex-1 border-2 border-teal-200 rounded-xl px-4 py-3 text-lg font-mono focus:outline-none focus:ring-4 focus:ring-teal-100 focus:border-teal-400 disabled:opacity-50"
          />
          <button type="submit" disabled={!code.trim() || scanning}
            className="px-5 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold flex items-center gap-2 disabled:opacity-40 transition-colors">
            <Tag className="w-5 h-5" />
          </button>
        </form>
        <p className="text-[11px] text-gray-400 mt-2">Funciona con un lector físico (USB/Bluetooth) que escribe como teclado, o tipeando el código a mano.</p>
      </Card>

      {/* Today summary */}
      {summary && (
        <div className="grid grid-cols-2 gap-3">
          {(Object.keys(summary) as StockLabel['destination'][]).map(dest => {
            const s = summary[dest]
            const meta = DESTINATION_LABEL[dest]
            const Icon = meta.icon
            return (
              <Card key={dest} className="text-center py-3">
                <div className={`w-8 h-8 rounded-lg mx-auto mb-2 flex items-center justify-center ${meta.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{meta.label}</p>
                <p className="text-lg font-black text-gray-800">{s.escaneado} <span className="text-xs font-normal text-gray-400">/ {s.generado + s.escaneado}</span></p>
              </Card>
            )
          })}
        </div>
      )}

      {/* History */}
      <Card padding={false}>
        <div className="p-5 border-b border-gray-100">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Últimos escaneos</h3>
        </div>
        {history.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">Todavía no escaneaste nada</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {history.map(h => (
              <div key={h.id} className="flex items-center gap-3 px-5 py-3">
                {h.ok ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <XCircle className="w-4 h-4 text-rose-500 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate ${h.ok ? 'text-gray-800' : 'text-rose-600'}`}>{h.message}</p>
                </div>
                <span className="text-[10px] text-gray-300 shrink-0">{h.time}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
