'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'

interface TooltipProps {
  children: React.ReactNode
  content: string
}

export function Tooltip({ children, content }: TooltipProps) {
  const [isVisible, setIsVisible] = React.useState(false)
  const [position, setPosition] = React.useState({ top: 0, left: 0 })
  const triggerRef = React.useRef<HTMLDivElement>(null)

  const updatePosition = React.useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setPosition({
        top: rect.top - 8, // 8px above the icon (mb-2 = 8px)
        left: rect.left + rect.width / 2 // Center horizontally
      })
    }
  }, [])

  React.useEffect(() => {
    if (isVisible) {
      updatePosition()
      window.addEventListener('scroll', updatePosition, true)
      window.addEventListener('resize', updatePosition)
      return () => {
        window.removeEventListener('scroll', updatePosition, true)
        window.removeEventListener('resize', updatePosition)
      }
    }
  }, [isVisible, updatePosition])

  return (
    <>
      <div
        ref={triggerRef}
        className="relative inline-block"
        onMouseEnter={() => {
          setIsVisible(true)
          updatePosition()
        }}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => {
          setIsVisible(true)
          updatePosition()
        }}
        onBlur={() => setIsVisible(false)}
      >
        <div className="cursor-help">
          {children}
        </div>
      </div>
      {isVisible && typeof window !== 'undefined' && createPortal(
        <div
          className="fixed z-[99999] px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-xl whitespace-normal w-64 pointer-events-none"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            transform: 'translate(-50%, -100%)'
          }}
        >
          {content}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
            <div className="border-4 border-transparent border-t-gray-900"></div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

