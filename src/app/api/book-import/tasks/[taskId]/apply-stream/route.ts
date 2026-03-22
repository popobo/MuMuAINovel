import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import type { BookImportApplyRequest } from '@/lib/book-import/types'
import { formatSseData } from '@/lib/sse-format'
import {
  bookImportService,
  BookImportError,
} from '@/services/book-import.service'

type RouteContext = { params: Promise<{ taskId: string }> }

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
  const body = (await request.json()) as BookImportApplyRequest

  const encoder = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: object) => {
        controller.enqueue(encoder.encode(formatSseData(obj)))
      }

      send({
        type: 'progress',
        message: '开始导入拆书数据...',
        progress: 0,
        status: 'processing',
      })

      try {
        send({
          type: 'progress',
          message: '正在写入项目、大纲与章节...',
          progress: 40,
          status: 'processing',
        })

        const result = await bookImportService.applyImport(taskId, userId, body)

        send({
          type: 'result',
          data: {
            success: result.success,
            project_id: result.project_id,
            statistics: result.statistics,
          },
        })

        const careers = result.statistics.generated_careers ?? 0
        const entities = result.statistics.generated_entities ?? 0
        send({
          type: 'progress',
          message: `导入完成！（职业 ${careers}，角色/组织 ${entities}）`,
          progress: 100,
          status: 'success',
        })

        send({ type: 'done' })
      } catch (e) {
        if (e instanceof BookImportError) {
          send({
            type: 'error',
            error: e.message,
            code: e.statusCode,
          })
        } else {
          console.error('[book-import] apply-stream', e)
          send({
            type: 'error',
            error: '导入失败',
            code: 500,
          })
        }
      } finally {
        controller.close()
      }
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
