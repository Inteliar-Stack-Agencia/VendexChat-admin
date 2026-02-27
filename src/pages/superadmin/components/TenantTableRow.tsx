import { Trash2, MoreHorizontal, Store, CheckCircle, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Tenant } from '../../../types'

interface TenantTableRowProps {
    tenant: Tenant
    onDelete: (tenant: Tenant) => void
}

export default function TenantTableRow({ tenant, onDelete }: TenantTableRowProps) {
    const getStatusBadge = (tenant: Tenant) => {
        if (tenant.is_active) {
            return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-100"><CheckCircle className="w-3 h-3" /> Online</span>
        }
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-600 border border-rose-100"><X className="w-3 h-3" /> Offline</span>
    }

    const getPlanBadge = (tenant: Tenant) => {
        const plan = (tenant.metadata?.plan_type || 'free').toLowerCase();
        const styles: Record<string, string> = {
            free: 'bg-slate-100 text-slate-500 border-slate-200',
            pro: 'bg-indigo-50 text-indigo-600 border-indigo-100',
            vip: 'bg-amber-50 text-amber-600 border-amber-100',
            ultra: 'bg-purple-50 text-purple-600 border-purple-100'
        };
        return (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest border ${styles[plan] || styles.free}`}>
                {plan}
            </span>
        );
    }

    const countryEmoji = (country?: string | null) => {
        if (!country) return '🌐';
        const maps: Record<string, string> = {
            'Argentina': '🇦🇷',
            'Chile': '🇨🇱',
            'México': '🇲🇽',
            'Uruguay': '🇺🇾',
            'Colombia': '🇨🇴',
            'España': '🇪🇸'
        };
        return maps[country] || '🌐';
    }

    return (
        <tr className="group hover:bg-slate-50/50 transition-colors">
            <td className="px-8 py-6">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                        <Store className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="font-bold text-slate-900">{tenant.name}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{new Date(tenant.created_at || '').toLocaleDateString()}</p>
                    </div>
                </div>
            </td>
            <td className="px-8 py-6">
                <code className="text-[10px] font-bold text-slate-400 italic">/{tenant.slug}</code>
            </td>
            <td className="px-8 py-6">
                <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                    {countryEmoji(tenant.country)} {tenant.country || 'N/A'}
                </span>
            </td>
            <td className="px-8 py-5">
                {getStatusBadge(tenant)}
            </td>
            <td className="px-8 py-5 text-center">
                {getPlanBadge(tenant)}
            </td>
            <td className="px-8 py-5 text-right">
                <div className="flex items-center justify-end gap-2">
                    <button
                        onClick={() => onDelete(tenant)}
                        className="p-2 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                        title="Eliminar Tienda"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                    <Link
                        to={`/sa/tenants/${tenant.id}`}
                        className="inline-block p-2 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <MoreHorizontal className="w-5 h-5" />
                    </Link>
                </div>
            </td>
        </tr>
    );
}
