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
    const preview = bookImportService.getPreview(taskId, session.user.id)
    return NextResponse.json(preview)
  } catch (e) {
    if (e instanceof BookImportError) {
      return NextResponse.json({ detail: e.message }, { status: e.statusCode })
    }
    throw e
  }
}
