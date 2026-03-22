import { useState, useCallback } from 'react'
import { AIService } from '@/lib/ai'
import type { AIMessage } from '@/lib/ai'

export function useAIStream() {
  const [content, setContent] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const stream = useCallback(async (messages: AIMessage[]) => {
    setIsLoading(true)
    setError(null)
    setContent('')

    try {
      const service = new AIService()

      // Use the callback-based streaming API
      await service.stream(messages, (chunk: string) => {
        setContent(prev => prev + chunk)
      }, { stream: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { content, isLoading, error, stream }
}
