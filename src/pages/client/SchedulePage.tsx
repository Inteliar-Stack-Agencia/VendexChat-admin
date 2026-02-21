import { useState, useEffect } from 'react'
import { Clock, Save, Plus, Trash2, Store, Globe } from 'lucide-react'
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
    const [activeType, setActiveType] = useState<'physical' | 'online'>('physical')
    const [physicalSchedule, setPhysicalSchedule] = useState<Record<string, ScheduleDay>>({})
    const [onlineSchedule, setOnlineSchedule] = useState<Record<string, ScheduleDay>>({})

    useEffect(() => {
        tenantApi.getMe()
            .then(data => {
                const initPhysical: Record<string, ScheduleDay> = {}
                const initOnline: Record<string, ScheduleDay> = {}

                DAYS.forEach(day => {
                    initPhysical[day.id] = data.physical_schedule?.[day.id] || data.schedule?.[day.id] || { open: false, intervals: [{ start: '09:00', end: '18:00' }] }
                    initOnline[day.id] = data.online_schedule?.[day.id] || data.schedule?.[day.id] || { open: true, intervals: [{ start: '00:00', end: '23:59' }] }
                })

                setPhysicalSchedule(initPhysical)
                setOnlineSchedule(initOnline)
            })
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    const schedule = activeType === 'physical' ? physicalSchedule : onlineSchedule
    const setSchedule = activeType === 'physical' ? setPhysicalSchedule : setOnlineSchedule

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

    const set24Hours = () => {
        const fullDay: Record<string, ScheduleDay> = {}
        DAYS.forEach(day => {
            fullDay[day.id] = { open: true, intervals: [{ start: '00:00', end: '23:59' }] }
        })
        setSchedule(fullDay)
        showToast('success', 'Horario configurado como 24 horas')
    }

    const handleSubmit = async () => {
        setSaving(true)
        try {
            await tenantApi.updateMe({
                physical_schedule: physicalSchedule,
                online_schedule: onlineSchedule
            })
            showToast('success', 'Horarios actualizados correctamente')
        } catch {
            showToast('error', 'Error al guardar los horarios')
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <LoadingSpinner text="Cargando horarios..." />

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Horarios de Atención</h1>
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1">Configura cuándo está abierta tu tienda para cada canal</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={set24Hours} className="text-[10px] font-black uppercase tracking-widest">
                        Configurar 24 Horas
                    </Button>
                    <Button onClick={handleSubmit} loading={saving} className="bg-slate-900 shadow-lg shadow-slate-100">
                        <Save className="w-4 h-4 mr-2" />
                        Guardar Cambios
                    </Button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl w-fit">
                <button
                    onClick={() => setActiveType('physical')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${activeType === 'physical'
                        ? 'bg-white text-indigo-600 shadow-sm'
                        : 'text-slate-400 hover:text-slate-600'}`}
                >
                    <Store className="w-4 h-4" />
                    Local Físico
                </button>
                <button
                    onClick={() => setActiveType('online')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${activeType === 'online'
                        ? 'bg-white text-emerald-600 shadow-sm'
                        : 'text-slate-400 hover:text-slate-600'}`}
                >
                    <Globe className="w-4 h-4" />
                    Tienda Online
                </button>
            </div>

            <div className="space-y-3">
                {DAYS.map((day) => {
                    const config = schedule[day.id] || { open: false, intervals: [] }
                    const intervals = config.intervals || []

                    return (
                        <Card key={day.id} className={`p-6 transition-all border ${config.open ? 'border-indigo-100 bg-white' : 'border-slate-100 bg-slate-50/50 opacity-60'}`}>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-6 min-w-[150px]">
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={config.open}
                                            onChange={() => handleToggle(day.id)}
                                        />
                                        <div className="w-12 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-500"></div>
                                    </label>
                                    <span className={`font-black uppercase text-xs tracking-wider ${config.open ? 'text-slate-900' : 'text-slate-400'}`}>
                                        {day.label}
                                    </span>
                                </div>

                                <div className="flex-1">
                                    {config.open ? (
                                        <div className="flex flex-wrap gap-3">
                                            {intervals.map((interval, idx) => (
                                                <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-100">
                                                    <input
                                                        type="time"
                                                        value={interval.start}
                                                        onChange={(e) => handleIntervalChange(day.id, idx, 'start', e.target.value)}
                                                        className="bg-transparent border-none text-sm font-bold text-slate-700 focus:ring-0 p-0 w-14"
                                                    />
                                                    <span className="text-slate-300">—</span>
                                                    <input
                                                        type="time"
                                                        value={interval.end}
                                                        onChange={(e) => handleIntervalChange(day.id, idx, 'end', e.target.value)}
                                                        className="bg-transparent border-none text-sm font-bold text-slate-700 focus:ring-0 p-0 w-14"
                                                    />
                                                    <div className="flex gap-1 ml-2 border-l border-slate-200 pl-2">
                                                        {intervals.length > 1 && (
                                                            <button
                                                                onClick={() => removeInterval(day.id, idx)}
                                                                className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                        {idx === intervals.length - 1 && intervals.length < 2 && (
                                                            <button
                                                                onClick={() => addInterval(day.id)}
                                                                className="p-1 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                            >
                                                                <Plus className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="text-[10px] font-black uppercase text-slate-300 tracking-[0.2em]">Cerrado</span>
                                    )}
                                </div>

                                <div className="hidden sm:block">
                                    <Clock className={`w-5 h-5 ${config.open ? (activeType === 'physical' ? 'text-indigo-400' : 'text-emerald-400') : 'text-slate-200'}`} />
                                </div>
                            </div>
                        </Card>
                    )
                })}
            </div>
        </div>
    )
}
