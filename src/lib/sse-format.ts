/**
 * SSE 消息格式（与经典版 FastAPI SSEResponse 一致，供 fetch 流式读取）
 */

export type SseProgressMessage = {
  type: 'progress'
  message: string
  progress: number
  status: string
}

export type SseResultMessage = {
  type: 'result'
  data: Record<string, unknown>
}

export type SseErrorMessage = {
  type: 'error'
  error: string
  code: number
}

export type SseDoneMessage = {
  type: 'done'
}

export function formatSseData(data: object): string {
  return `data: ${JSON.stringify(data)}\n\n`
}
