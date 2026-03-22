import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import {
  bookImportService,
  BookImportError,
} from '@/services/book-import.service'

type RouteContext = { params: Promise<{ taskId: string }> }

export async function GET(_request: NextRequest, context: RouteContext) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ detail: '未登录' }, { status: 401 })
  }

  const { taskId } = await context.params

  try {
    const status = bookImportService.getTaskStatus(taskId, session.user.id)
    return NextResponse.json(status)
  } catch (e) {
    if (e instanceof BookImportError) {
      return NextResponse.json({ detail: e.message }, { status: e.statusCode })
    }
    throw e
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ detail: '未登录' }, { status: 401 })
  }

  const { taskId } = await context.params

  try {
    const result = bookImportService.cancelTask(taskId, session.user.id)
    return NextResponse.json(result)
  } catch (e) {
    if (e instanceof BookImportError) {
      return NextResponse.json({ detail: e.message }, { status: e.statusCode })
    }
    throw e
  }
}
