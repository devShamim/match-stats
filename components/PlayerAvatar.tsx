'use client'

import Image from 'next/image'
import { User } from 'lucide-react'

interface PlayerAvatarProps {
  imageUrl?: string | null
  name?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export default function PlayerAvatar({
  imageUrl,
  name,
  size = 'md',
  className = ''
}: PlayerAvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  }

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  }

  return (
    <div className={`relative ${sizeClasses[size]} rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200 ${className}`}>
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={name ? `${name}'s profile` : 'Player profile'}
          fill
          className="object-cover"
          onError={(e) => {
            // If image fails to load, show placeholder
            const target = e.target as HTMLImageElement
            target.style.display = 'none'
            const parent = target.parentElement
            if (parent) {
              const placeholder = parent.querySelector('.placeholder-icon')
              if (placeholder) {
                placeholder.classList.remove('hidden')
              }
            }
          }}
        />
      ) : null}

      {/* Placeholder icon - always present but hidden when image is shown */}
      <div className={`placeholder-icon absolute inset-0 flex items-center justify-center bg-gray-100 ${imageUrl ? 'hidden' : ''}`}>
        <User className={`${iconSizes[size]} text-gray-400`} />
      </div>
    </div>
  )
}
