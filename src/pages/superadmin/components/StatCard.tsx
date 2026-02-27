import { LucideIcon } from 'lucide-react'

interface StatCardProps {
    name: string
    value: string | number
    icon: LucideIcon
    trend: string
    color: string
    bg: string
}

export default function StatCard({ name, value, icon: Icon, trend, color, bg }: StatCardProps) {
    const isPositive = trend.startsWith('+')

    return (
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow group cursor-default">
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-2xl ${bg} ${color} group-hover:scale-110 transition-transform`}>
                    <Icon className="w-6 h-6" />
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    {trend}
                </span>
            </div>
            <p className="text-xs font-black uppercase text-slate-400 tracking-widest">{name}</p>
            <h3 className="text-3xl font-black text-slate-900 mt-1">{value}</h3>
        </div>
    )
}
