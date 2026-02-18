import { useState, useEffect } from 'react'
import { Clock, Save, Plus, Trash2 } from 'lucide-react'
import { Card, Button, LoadingSpinner } from '../../components/common'
import { showToast } from '../../components/common/Toast'
import { tenantApi } from '../../services/api'
import { Tenant, ScheduleDay } from '../../types'

const DAYS = [
    { id: 'mon', label: 'Lunes' },
    { id: 'tue', label: 'Martes' },
    { id: 'wed', label: 'Miércoles' },
    { id: 'thu', label: 'Jueves' },
    { id: 'fri', label: 'Viernes' },
    { id: 'sat', label: 'Sábado' },
    { id: 'sun', label: 'Domingo' },
]

export default function SchedulePage() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [schedule, setSchedule] = useState<Record<string, ScheduleDay>>({})

    useEffect(() => {
        tenantApi.getMe()
            .then(data => {
                const initialSchedule: Record<string, ScheduleDay> = {}
                DAYS.forEach(day => {
                    initialSchedule[day.id] = data.schedule?.[day.id] || { open: false, intervals: [{ start: '09:00', end: '18:00' }] }
                })
                setSchedule(initialSchedule)
            })
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    const handleToggle = (dayId: string) => {
        setSchedule(prev => ({
            ...prev,
            [dayId]: { ...prev[dayId], open: !prev[dayId].open }
        }))
    }

    const handleIntervalChange = (dayId: string, index: number, field: 'start' | 'end', value: string) => {
        setSchedule(prev => {
            const newIntervals = [...prev[dayId].intervals]
            newIntervals[index] = { ...newIntervals[index], [field]: value }
            return {
                ...prev,
                [dayId]: { ...prev[dayId], intervals: newIntervals }
            }
        })
    }

    const addInterval = (dayId: string) => {
        setSchedule(prev => ({
            ...prev,
            [dayId]: {
                ...prev[dayId],
                intervals: [...prev[dayId].intervals, { start: '09:00', end: '18:00' }]
            }
        }))
    }

    const removeInterval = (dayId: string, index: number) => {
        setSchedule(prev => ({
            ...prev,
            [dayId]: {
                ...prev[dayId],
                intervals: prev[dayId].intervals.filter((_, i) => i !== index)
            }
        }))
    }

    const handleSubmit = async () => {
        setSaving(true)
        try {
            await tenantApi.updateMe({ schedule })
            showToast('success', 'Horarios actualizados correctamente')
        } catch {
            showToast('error', 'Error al guardar los horarios')
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <LoadingSpinner text="Cargando horarios..." />

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Horarios de Atención</h1>
                    <p className="text-sm text-gray-500">Configura cuándo está abierta tu tienda para recibir pedidos.</p>
                </div>
                <Button onClick={handleSubmit} loading={saving}>
                    <Save className="w-4 h-4" />
                    Guardar Cambios
                </Button>
            </div>

            <div className="space-y-4">
                {DAYS.map((day) => {
                    const config = schedule[day.id] || { open: false, intervals: [] }
                    return (
                        <Card key={day.id}>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-4 min-w-[120px]">
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={config.open}
                                            onChange={() => handleToggle(day.id)}
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                                    </label>
                                    <span className={`font-semibold ${config.open ? 'text-gray-900' : 'text-gray-400'}`}>
                                        {day.label}
                                    </span>
                                </div>

                                <div className="flex-1 space-y-2">
                                    {config.open ? (
                                        config.intervals.map((interval, idx) => (
                                            <div key={idx} className="flex items-center gap-2">
                                                <input
                                                    type="time"
                                                    value={interval.start}
                                                    onChange={(e) => handleIntervalChange(day.id, idx, 'start', e.target.value)}
                                                    className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-emerald-500"
                                                />
                                                <span className="text-gray-400">—</span>
                                                <input
                                                    type="time"
                                                    value={interval.end}
                                                    onChange={(e) => handleIntervalChange(day.id, idx, 'end', e.target.value)}
                                                    className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-emerald-500"
                                                />
                                                {config.intervals.length > 1 && (
                                                    <button
                                                        onClick={() => removeInterval(day.id, idx)}
                                                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {idx === config.intervals.length - 1 && config.intervals.length < 2 && (
                                                    <button
                                                        onClick={() => addInterval(day.id)}
                                                        className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <span className="text-sm text-gray-400 italic">Cerrado</span>
                                    )}
                                </div>

                                <div className="hidden sm:block">
                                    <Clock className={`w-5 h-5 ${config.open ? 'text-emerald-500' : 'text-gray-300'}`} />
                                </div>
                            </div>
                        </Card>
                    )
                })}
            </div>
        </div>
    )
}
