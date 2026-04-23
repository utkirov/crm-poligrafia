import type { ClientType } from '../types'
import { getInitials } from '../utils/format'

interface AvatarProps {
  name: string
  type?: ClientType
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const bgColors: Record<ClientType, string> = {
  individual: 'bg-blue-100 text-blue-600',
  company: 'bg-purple-100 text-purple-600',
  agent: 'bg-teal-100 text-teal-600',
}

const sizes = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-lg',
}

export function Avatar({ name, type = 'individual', size = 'md', className = '' }: AvatarProps) {
  return (
    <div className={`${sizes[size]} ${bgColors[type]} rounded-full flex items-center justify-center font-semibold shrink-0 ${className}`}>
      {getInitials(name)}
    </div>
  )
}
