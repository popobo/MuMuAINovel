import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { bookImportService, BookImportError } from '@/services/book-import.service'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ detail: '未登录' }, { status: 401 })
  }

  try {
    const task = await bookImportService.getLatestActiveTaskStatus(session.user.id)
    return NextResponse.json(task)
  } catch (e) {
    if (e instanceof BookImportError) {
      return NextResponse.json({ detail: e.message }, { status: e.statusCode })
    }
    throw e
  }
}
