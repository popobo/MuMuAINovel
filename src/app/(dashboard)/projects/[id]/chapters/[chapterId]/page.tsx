import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ProjectService } from '@/services/project.service'
import { ChapterService } from '@/services/chapter.service'

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
      <aside className="w-64 bg-white dark:bg-gray-800 border-r overflow-y-auto">
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

          {/* Actions */}
          <div className="space-y-2">
            <Link
              href={`/projects/${id}`}
              className="block px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Project Overview
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">{chapter.title}</h1>
            {chapter.summary && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="text-sm text-blue-800 dark:text-blue-200 mb-1">
                  Chapter Summary
                </div>
                <p className="text-gray-700 dark:text-gray-300">{chapter.summary}</p>
              </div>
            )}
          </div>

          {/* Editor */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border">
            <div className="border-b p-4 flex justify-between items-center">
              <span className="text-sm text-gray-500">Chapter Content</span>
              <div className="flex gap-2">
                <button className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600">
                  AI Generate
                </button>
                <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
                  Save
                </button>
              </div>
            </div>

            <textarea
              className="w-full h-[calc(100vh-400px)] p-6 resize-none focus:outline-none"
              placeholder="Start writing your chapter here..."
              defaultValue={chapter.content || ''}
            />
          </div>

          {/* Stats Footer */}
          <div className="mt-4 flex justify-between text-sm text-gray-500">
            <span>Chapter {chapter.chapterNumber}</span>
            <span>{chapter.wordCount} words</span>
          </div>
        </div>
      </main>
    </div>
  )
}
