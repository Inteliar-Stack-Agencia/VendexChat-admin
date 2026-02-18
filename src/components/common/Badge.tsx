interface BadgeProps {
  children: string
  color?: string
  bg?: string
  className?: string
}

export default function Badge({ children, color = 'text-gray-800', bg = 'bg-gray-100', className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color} ${bg} ${className}`}>
      {children}
    </span>
  )
}
