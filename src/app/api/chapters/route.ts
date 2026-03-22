import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ChapterService } from '@/services/chapter.service'

export async function GET(request: NextRequest) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const projectId = searchParams.get('projectId')

  if (!projectId) {
    return NextResponse.json({ error: 'Project ID required' }, { status: 400 })
  }

  const service = new ChapterService()
  const chapters = await service.listByProject(projectId)

  return NextResponse.json({ chapters })
}

export async function POST(request: NextRequest) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  const service = new ChapterService()
  const chapter = await service.create(body)

  return NextResponse.json(chapter, { status: 201 })
}
