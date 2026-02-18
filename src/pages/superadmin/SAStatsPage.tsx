import { PieChart, TrendingUp, BarChart } from 'lucide-react'

export default function SAStatsPage() {
    return (
        <div className="space-y-8">
            <header>
                <h2 className="text-3xl font-bold text-slate-900 tracking-tight">KPIs & Estadísticas</h2>
                <p className="text-slate-500 mt-1">Análisis profundo del crecimiento y uso de la plataforma.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-10 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col items-center justify-center min-h-64 border-dashed">
                    <BarChart className="w-12 h-12 text-slate-200 mb-4" />
                    <p className="text-sm font-bold text-slate-400">Gráfico de Crecimiento Mensual (Cargando...)</p>
                </div>
                <div className="bg-white p-10 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col items-center justify-center min-h-64 border-dashed">
                    <PieChart className="w-12 h-12 text-slate-200 mb-4" />
                    <p className="text-sm font-bold text-slate-400">Distribución de Planes (Cargando...)</p>
                </div>
            </div>

            <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <TrendingUp className="w-6 h-6 text-emerald-600" />
                    <h3 className="font-bold text-xl text-slate-900">Métricas de Churn</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-10 bg-slate-100 rounded-xl animate-pulse" />
                    ))}
                </div>
            </div>
        </div>
    )
}
