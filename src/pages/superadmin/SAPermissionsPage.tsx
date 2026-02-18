import { Shield, Lock, Users } from 'lucide-react'

export default function SAPermissionsPage() {
    return (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[3rem] border border-slate-100 shadow-sm border-dashed">
            <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mb-6">
                <Lock className="w-10 h-10 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Gestión de Roles</h2>
            <p className="text-slate-500 mt-2 max-w-sm text-center">
                Este módulo permitirá asignar roles de Owner, Soporte y Auditoría a los usuarios de VendexChat.
            </p>
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-2xl px-6">
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                    <Shield className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                    <h4 className="font-bold text-slate-800">Owner</h4>
                    <p className="text-[10px] text-slate-400 mt-1 uppercase font-black">Full Access</p>
                </div>
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                    <Users className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                    <h4 className="font-bold text-slate-800">Soporte</h4>
                    <p className="text-[10px] text-slate-400 mt-1 uppercase font-black">Limited Access</p>
                </div>
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                    <Lock className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                    <h4 className="font-bold text-slate-800">Read Only</h4>
                    <p className="text-[10px] text-slate-400 mt-1 uppercase font-black">No edits</p>
                </div>
            </div>
        </div>
    )
}
