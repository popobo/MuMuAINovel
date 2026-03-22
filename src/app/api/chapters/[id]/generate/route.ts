import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ChapterService } from '@/services/chapter.service'
import { ProjectService } from '@/services/project.service'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const chapterService = new ChapterService()
    const projectService = new ProjectService()
    const chapter = await chapterService.getById(id)

    if (!chapter) {
      return NextResponse.json({ error: 'Chapter not found' }, { status: 404 })
    }

    const project = await projectService.getById(
      chapter.projectId,
      session.user.id,
    )
    if (!project) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Generate content using AI
    const content = await chapterService.generateContent({
      projectId: chapter.projectId,
      userId: session.user.id,
      title: chapter.title,
      summary: chapter.summary ?? undefined,
      contextNotes: undefined,
    })

    // Update chapter with generated content
    const updatedChapter = await chapterService.updateContent(id, content)

    return NextResponse.json({
      content,
      wordCount: updatedChapter.wordCount,
    })
  } catch (error) {
    console.error('AI generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate content' },
      { status: 500 }
    )
  }
}
