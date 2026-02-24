import React from 'react'

export default function RouteLoader() {
    return (
        <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm animate-in fade-in duration-500">
            <div className="relative flex items-center justify-center">
                {/* Outer Ring */}
                <div className="w-16 h-16 rounded-full border-4 border-slate-100" />
                {/* Spinning Ring */}
                <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
                {/* Center Dot */}
                <div className="absolute w-2 h-2 bg-indigo-600 rounded-full animate-pulse" />
            </div>
            <div className="mt-8 flex flex-col items-center gap-2">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] animate-pulse">
                    Cargando
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Preparando tu experiencia...
                </p>
            </div>
        </div>
    )
}
