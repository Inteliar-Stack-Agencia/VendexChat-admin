import { useState, useEffect } from 'react'
import { MessageSquareWarning, CheckCircle2, Loader2, RefreshCw, Lightbulb } from 'lucide-react'
import { Card } from '../../components/common'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import { showToast } from '../../components/common/Toast'

interface FeedbackItem {
    id: string
    question: string
    bot_context: string | null
    username: string | null
    chat_id: number | null
    resolved: boolean
    notes: string | null
    created_at: string
}

export default function BotFeedbackPage() {
    const { selectedStoreId } = useAuth()
    const [items, setItems] = useState<FeedbackItem[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<'all' | 'pending' | 'resolved'>('pending')
    const [editingNotes, setEditingNotes] = useState<Record<string, string>>({})

    useEffect(() => { load() }, [selectedStoreId, filter])

    const load = async () => {
        if (!selectedStoreId) return
        setLoading(true)
        try {
            let query = supabase
                .from('bot_feedback')
                .select('*')
                .eq('store_id', selectedStoreId)
                .order('created_at', { ascending: false })
                .limit(100)

            if (filter === 'pending') query = query.eq('resolved', false)
            if (filter === 'resolved') query = query.eq('resolved', true)

            const { data, error } = await query
            if (error) throw error
            setItems(data || [])
        } catch {
            showToast('error', 'Error al cargar feedback')
        } finally {
            setLoading(false)
        }
    }

    const resolve = async (id: string, notes: string) => {
        try {
            await supabase
                .from('bot_feedback')
                .update({ resolved: true, notes: notes || null })
                .eq('id', id)
            showToast('success', 'Marcado como resuelto')
            setItems(prev => prev.filter(i => i.id !== id))
        } catch {
            showToast('error', 'Error al actualizar')
        }
    }

    const pendingCount = items.filter(i => !i.resolved).length

    return (
        <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <MessageSquareWarning className="w-6 h-6 text-amber-500" />
                        Preguntas sin respuesta
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Preguntas que el bot de Telegram no pudo responder. Resolvelas para mejorar el entrenamiento.
                    </p>
                </div>
                <button
                    onClick={load}
                    className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors"
                >
                    <RefreshCw className="w-4 h-4" />
                    Actualizar
                </button>
            </div>

            {/* Filters */}
            <div className="flex gap-2">
                {(['pending', 'resolved', 'all'] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === f
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:text-foreground'}`}
                    >
                        {f === 'pending' ? `Pendientes${pendingCount > 0 && filter !== 'pending' ? ` (${pendingCount})` : ''}` : f === 'resolved' ? 'Resueltas' : 'Todas'}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex justify-center py-16">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
            ) : items.length === 0 ? (
                <Card className="p-12 text-center">
                    <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-3" />
                    <p className="font-medium text-foreground">
                        {filter === 'pending' ? '¡Todo resuelto! No hay preguntas pendientes.' : 'No hay registros.'}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                        Las preguntas aparecen cuando el bot indica que no tiene datos suficientes para responder.
                    </p>
                </Card>
            ) : (
                <div className="space-y-3">
                    {items.map(item => (
                        <Card key={item.id} className={`p-4 space-y-3 ${item.resolved ? 'opacity-60' : ''}`}>
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />
                                        <p className="font-medium text-foreground">{item.question}</p>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                        <span>{new Date(item.created_at).toLocaleString('es-AR')}</span>
                                        {item.username && <span>@{item.username}</span>}
                                        {item.resolved && <span className="text-green-600 font-medium">✓ Resuelto</span>}
                                    </div>
                                </div>
                            </div>

                            {item.bot_context && (
                                <div className="bg-muted rounded-lg p-3 text-xs text-muted-foreground">
                                    <span className="font-medium text-foreground">Respuesta del bot: </span>
                                    {item.bot_context}
                                </div>
                            )}

                            {item.notes && (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs text-green-800">
                                    <span className="font-medium">Nota: </span>{item.notes}
                                </div>
                            )}

                            {!item.resolved && (
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Agregá una nota (opcional) — ej: 'Agregar precio de delivery al bot'"
                                        value={editingNotes[item.id] ?? ''}
                                        onChange={e => setEditingNotes(prev => ({ ...prev, [item.id]: e.target.value }))}
                                        className="flex-1 text-sm px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                                    />
                                    <button
                                        onClick={() => resolve(item.id, editingNotes[item.id] ?? '')}
                                        className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
                                    >
                                        <CheckCircle2 className="w-4 h-4" />
                                        Resolver
                                    </button>
                                </div>
                            )}
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
