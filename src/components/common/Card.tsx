import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  padding?: boolean
  hFull?: boolean
}

export default function Card({ children, className = '', padding = true, hFull = false }: CardProps) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm ${padding ? 'p-6' : ''} ${hFull ? 'h-full' : ''} ${className}`}>
      {children}
    </div>
  )
}
