'use client'

import { useEffect, useRef } from 'react'

interface StreamingTextProps {
  content: string
  isLoading?: boolean
}

export function StreamingText({ content, isLoading }: StreamingTextProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [content])

  return (
    <div
      ref={containerRef}
      className="prose dark:prose-invert max-w-none overflow-y-auto max-h-96"
    >
      {content || (isLoading && '...')}
      {isLoading && <span className="animate-pulse">▌</span>}
    </div>
  )
}
