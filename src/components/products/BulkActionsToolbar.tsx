import { Trash2, FolderInput, X } from 'lucide-react'
import Button from '../common/Button'
import { Category } from '../../types'
import { useState } from 'react'

interface BulkActionsToolbarProps {
    selectedCount: number
    categories: Category[]
    onDelete: () => Promise<void>
    onMove: (categoryId: string) => Promise<void>
    onClear: () => void
}

export default function BulkActionsToolbar({
    selectedCount,
    categories,
    onDelete,
    onMove,
    onClear
}: BulkActionsToolbarProps) {
    const [isDeleting, setIsDeleting] = useState(false)
    const [isMoving, setIsMoving] = useState(false)
    const [showMoveMenu, setShowMoveMenu] = useState(false)

    if (selectedCount === 0) return null

    const handleDelete = async () => {
        if (confirm(`¿Estás seguro de eliminar ${selectedCount} productos?`)) {
            setIsDeleting(true)
            try {
                await onDelete()
            } finally {
                setIsDeleting(false)
            }
        }
    }

    const handleMove = async (categoryId: string) => {
        setIsMoving(true)
        setShowMoveMenu(false)
        try {
            await onMove(categoryId)
        } finally {
            setIsMoving(false)
        }
    }

    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] w-[90%] max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-slate-900 border border-slate-800 px-4 py-3 sm:px-6 sm:py-4 rounded-[2rem] shadow-2xl flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                {/* Contador */}
                <div className="flex items-center gap-3 pr-6 sm:border-r border-slate-800 w-full sm:w-auto justify-between sm:justify-start">
                    <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-7 h-7 bg-indigo-500 text-white text-[10px] font-black rounded-xl shadow-lg shadow-indigo-500/20">
                            {selectedCount}
                        </span>
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest whitespace-nowrap">
                            Seleccionados
                        </span>
                    </div>
                    <button
                        onClick={onClear}
                        className="sm:hidden p-2 text-slate-500 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                    <Button
                        variant="danger"
                        size="sm"
                        onClick={handleDelete}
                        loading={isDeleting}
                        disabled={isMoving}
                        className="flex-1 sm:flex-none rounded-2xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest gap-2 bg-rose-500 hover:bg-rose-600 border-0 shadow-lg shadow-rose-500/20"
                    >
                        {!isDeleting && <Trash2 className="w-3.5 h-3.5" />}
                        Eliminar
                    </Button>

                    <div className="relative flex-1 sm:flex-none">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowMoveMenu(!showMoveMenu)}
                            loading={isMoving}
                            disabled={isDeleting}
                            className="w-full sm:w-auto rounded-2xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest gap-2 bg-slate-800 border-0 text-white hover:bg-slate-700 shadow-lg"
                        >
                            {!isMoving && <FolderInput className="w-3.5 h-3.5" />}
                            Mover a...
                        </Button>

                        {showMoveMenu && (
                            <div className="absolute bottom-full left-0 mb-3 w-56 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                <div className="p-2 border-b border-slate-800">
                                    <p className="px-3 py-2 text-[9px] font-black text-slate-500 uppercase tracking-widest">Cambiar Categoría</p>
                                </div>
                                <div className="p-1 max-h-64 overflow-y-auto custom-scrollbar">
                                    {categories.map(cat => (
                                        <button
                                            key={cat.id}
                                            onClick={() => handleMove(cat.id)}
                                            className="w-full text-left px-4 py-3 text-[10px] font-bold text-slate-300 uppercase tracking-wider hover:bg-indigo-600 hover:text-white rounded-xl transition-all flex items-center justify-between group"
                                        >
                                            {cat.name}
                                            <FolderInput className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </button>
                                    ))}
                                    {categories.length === 0 && (
                                        <p className="px-4 py-3 text-[10px] text-slate-500 italic">No hay otras categorías</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Cerrar (Desktop) */}
                <button
                    onClick={onClear}
                    className="hidden sm:block p-2 text-slate-500 hover:text-white transition-colors"
                    title="Limpiar selección"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>
        </div>
    )
}
