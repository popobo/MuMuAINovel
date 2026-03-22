'use client'

import { useState, useEffect } from 'react'
import { X, Maximize2, Minimize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface FocusModeProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
}

export function FocusMode({ isOpen, onClose, children }: FocusModeProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    if (isFullscreen) {
      document.documentElement.requestFullscreen()
    } else {
      document.exitFullscreen?.()
    }
  }, [isFullscreen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900 flex flex-col">
      {/* Top Bar */}
      <div className="flex-none border-b px-4 py-2 flex items-center justify-between bg-gray-50 dark:bg-gray-800">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Focus Mode
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  )
}
