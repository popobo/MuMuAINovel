import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ChapterService } from '@/services/chapter.service'

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
    const chapter = await chapterService.getById(id)

    if (!chapter) {
      return NextResponse.json({ error: 'Chapter not found' }, { status: 404 })
    }

    // Generate content using AI
    const content = await chapterService.generateContent({
      projectId: chapter.projectId,
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
