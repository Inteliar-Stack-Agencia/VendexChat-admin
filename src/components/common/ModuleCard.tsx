import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ModuleCardProps {
    title: string;
    icon: LucideIcon;
    href: string;
    color?: string;
    badge?: string | number;
    description?: string;
    isExternal?: boolean;
}

export default function ModuleCard({
    title,
    icon: Icon,
    href,
    color = 'bg-blue-600',
    badge,
    isExternal = false
}: ModuleCardProps) {
    const content = (
        <div className={`relative flex items-center gap-4 p-4 rounded-xl text-white transition-all hover:scale-[1.02] hover:shadow-lg active:scale-95 ${color}`}>
            <div className="w-12 h-12 flex items-center justify-center bg-white/20 rounded-lg shrink-0">
                <Icon className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
                <h3 className="font-bold text-base uppercase tracking-wide truncate">{title}</h3>
            </div>
            {badge && (
                <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white shadow-sm">
                    {badge}
                </span>
            )}
        </div>
    );

    if (isExternal) {
        return (
            <a href={href} target="_blank" rel="noopener noreferrer">
                {content}
            </a>
        );
    }

    return (
        <Link to={href}>
            {content}
        </Link>
    );
}
