import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ProjectService } from '@/services/project.service'
import { ChapterService } from '@/services/chapter.service'
import { ChapterEditorWrapper } from '@/components/editor/chapter-editor-wrapper'

export default async function ChapterEditorPage({
  params,
}: {
  params: Promise<{ id: string; chapterId: string }>
}) {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login')
  }

  const { id, chapterId } = await params

  const projectService = new ProjectService()
  const chapterService = new ChapterService()

  const [project, chapter] = await Promise.all([
    projectService.getById(id, session.user.id),
    chapterService.getById(chapterId),
  ])

  if (!project || !chapter) {
    redirect(`/projects/${id}`)
  }

  return (
    <div className="p-8">
      <div className="mx-auto mb-4 flex max-w-5xl flex-wrap items-end justify-between gap-4 border-b border-gray-200 pb-4 dark:border-gray-700">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {project.title} · Chapter {chapter.chapterNumber}
          </p>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {chapter.title}
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {chapter.wordCount.toLocaleString()} words
          </p>
        </div>
        <Link
          href={`/projects/${id}/chapters`}
          className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
        >
          ← Back to chapters
        </Link>
      </div>
      <div className="mx-auto max-w-5xl">
          <ChapterEditorWrapper
            chapterId={chapterId}
            projectId={id}
            initialContent={chapter.content || ''}
            title={chapter.title}
            summary={chapter.summary}
            chapterNumber={chapter.chapterNumber}
          />
      </div>
    </div>
  )
}
