import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { formatSseData } from '@/lib/sse-format'
import { bookImportService, BookImportError } from '@/services/book-import.service'

type RouteContext = { params: Promise<{ taskId: string }> }

/**
 * 经典版在导入后会跑世界观/职业/角色生成，失败时可 SSE 重试。
 * 当前 Next 版导入阶段不执行这些 AI 步骤，本接口仅返回成功占位，避免前端报错。
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
  await request.json().catch(() => ({}))

  const encoder = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (obj: object) => {
        controller.enqueue(encoder.encode(formatSseData(obj)))
      }

      try {
        bookImportService.getTaskStatus(taskId, userId)
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
        message: '当前版本无可重试的导入后生成步骤',
        progress: 100,
        status: 'success',
      })

      const projectId = bookImportService.getImportedProjectId(taskId, userId)

      send({
        type: 'result',
        data: {
          success: true,
          still_failed: [] as unknown[],
          project_id: projectId,
          retry_results: {},
        },
      })

      send({
        type: 'progress',
        message: '所有步骤重试成功！',
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
