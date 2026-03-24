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
  const searchParams = _request.nextUrl.searchParams
  const pageRaw = searchParams.get('page')
  const pageSizeRaw = searchParams.get('pageSize')

  const page = pageRaw ? Number(pageRaw) : undefined
  const pageSize = pageSizeRaw ? Number(pageSizeRaw) : undefined

  try {
    const preview = await bookImportService.getPreviewPage(taskId, session.user.id, {
      page: Number.isFinite(page) ? page : undefined,
      pageSize: Number.isFinite(pageSize) ? pageSize : undefined,
    })
    return NextResponse.json(preview)
  } catch (e) {
    if (e instanceof BookImportError) {
      return NextResponse.json({ detail: e.message }, { status: e.statusCode })
    }
    throw e
  }
}
