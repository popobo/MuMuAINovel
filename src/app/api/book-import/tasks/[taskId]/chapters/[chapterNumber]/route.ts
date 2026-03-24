import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { bookImportService, BookImportError } from '@/services/book-import.service'

type RouteContext = { params: Promise<{ taskId: string; chapterNumber: string }> }

export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ detail: '未登录' }, { status: 401 })
  }

  const { taskId, chapterNumber } = await context.params
  const body = (await request.json().catch(() => ({}))) as {
    title?: string
    summary?: string | null
    content?: string
  }

  const parsedChapterNumber = Number(chapterNumber)
  if (!Number.isInteger(parsedChapterNumber) || parsedChapterNumber <= 0) {
    return NextResponse.json({ detail: '非法章节号' }, { status: 400 })
  }

  try {
    await bookImportService.updateStagingChapter(
      taskId,
      session.user.id,
      parsedChapterNumber,
      body,
    )
    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof BookImportError) {
      return NextResponse.json({ detail: e.message }, { status: e.statusCode })
    }
    throw e
  }
}
