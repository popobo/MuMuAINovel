import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import type { BookImportApplyRequest } from '@/lib/book-import/types'
import {
  bookImportService,
  BookImportError,
} from '@/services/book-import.service'

type RouteContext = { params: Promise<{ taskId: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ detail: '未登录' }, { status: 401 })
  }

  const { taskId } = await context.params
  const body = (await request.json()) as BookImportApplyRequest

  try {
    const result = await bookImportService.applyImport(
      taskId,
      session.user.id,
      body,
    )
    return NextResponse.json(result)
  } catch (e) {
    if (e instanceof BookImportError) {
      return NextResponse.json({ detail: e.message }, { status: e.statusCode })
    }
    console.error('[book-import] apply', e)
    return NextResponse.json({ detail: '导入失败' }, { status: 500 })
  }
}
