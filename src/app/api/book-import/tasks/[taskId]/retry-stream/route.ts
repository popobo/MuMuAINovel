import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { formatSseData } from '@/lib/sse-format'
import { bookImportService, BookImportError } from '@/services/book-import.service'

type RouteContext = { params: Promise<{ taskId: string }> }

/**
 * 拆书 staging 中标记为 failed 的章节可经此接口重试恢复（SSE 进度流）。
 * 请求体可选 `chapter_numbers`，有值时仅重试指定章节号；省略则重试全部失败章节。
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) {
    return new Response(formatSseData({ type: 'error', error: '未登录', code: 401 }), {
      status: 401,
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    })
  }

  const { taskId } = await context.params
  const body = (await request.json().catch(() => ({}))) as {
    chapter_numbers?: number[]
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: object) => {
        controller.enqueue(encoder.encode(formatSseData(obj)))
      }

      try {
        await bookImportService.getTaskStatus(taskId, userId)
      } catch (e) {
        if (e instanceof BookImportError) {
          send({ type: 'error', error: e.message, code: e.statusCode })
          controller.close()
          return
        }
        send({ type: 'error', error: '任务校验失败', code: 500 })
        controller.close()
        return
      }

      send({
        type: 'progress',
        message: '正在重试失败章节...',
        progress: 30,
        status: 'processing',
      })

      const retried = await bookImportService.retryFailedChapters(
        taskId,
        userId,
        body.chapter_numbers,
      )

      const projectId = await bookImportService.getImportedProjectId(taskId, userId)

      send({
        type: 'result',
        data: {
          success: true,
          still_failed:
            retried.remaining_failed > 0 ? [{ count: retried.remaining_failed }] : [],
          project_id: projectId,
          retry_results: retried,
        },
      })

      send({
        type: 'progress',
        message:
          retried.remaining_failed > 0
            ? `已重试 ${retried.retried} 章，剩余失败 ${retried.remaining_failed} 章`
            : `重试完成，成功恢复 ${retried.retried} 章`,
        progress: 100,
        status: 'success',
      })

      send({ type: 'done' })
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
