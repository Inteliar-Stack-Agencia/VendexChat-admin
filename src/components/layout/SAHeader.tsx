import { Menu, User, ShieldCheck } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

interface SAHeaderProps {
    onMenuClick: () => void
}

export default function SAHeader({ onMenuClick }: SAHeaderProps) {
    const { user } = useAuth()

    return (
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-6 lg:px-10 sticky top-0 z-30">
            <div className="flex items-center gap-4">
                <button onClick={onMenuClick} className="lg:hidden p-2 rounded-xl hover:bg-slate-100 transition-colors">
                    <Menu className="w-6 h-6 text-slate-600" />
                </button>
                <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                    <ShieldCheck className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Superadmin Mode</span>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="flex flex-col items-end hidden sm:block">
                    <span className="text-sm font-bold text-slate-900 leading-none">{user?.name}</span>
                    <span className="text-[10px] text-slate-500 font-medium">{user?.email}</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200 shadow-sm">
                    <User className="w-5 h-5 text-slate-600" />
                </div>
            </div>
        </header>
    )
}
