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
    <div className="flex h-[calc(100vh-64px)]">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-gray-800 border-r overflow-y-auto flex-shrink-0">
        <div className="p-4">
          <Link href={`/projects/${id}/chapters`}>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 mb-4">
              ← Back to Chapters
            </div>
          </Link>

          <h2 className="text-lg font-bold mb-1">{project.title}</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {chapter.title}
          </p>

          {/* Chapter Info */}
          <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-xs text-gray-500 mb-1">Word Count</div>
            <div className="text-lg font-semibold">{chapter.wordCount}</div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-2">
            <Link
              href={`/projects/${id}`}
              className="block px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Project Overview
            </Link>
            <Link
              href={`/projects/${id}/outline`}
              className="block px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Story Outline
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-8">
          <ChapterEditorWrapper
            chapterId={chapterId}
            projectId={id}
            initialContent={chapter.content || ''}
            title={chapter.title}
            summary={chapter.summary}
            chapterNumber={chapter.chapterNumber}
          />
        </div>
      </main>
    </div>
  )
}
