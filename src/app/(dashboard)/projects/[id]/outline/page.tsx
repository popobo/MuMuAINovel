import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ProjectService } from '@/services/project.service'
import { ChapterService } from '@/services/chapter.service'

export default async function OutlinePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login')
  }

  const { id } = await params

  const projectService = new ProjectService()
  const chapterService = new ChapterService()

  const [project, chapters] = await Promise.all([
    projectService.getById(id, session.user.id),
    chapterService.listByProject(id),
  ])

  if (!project) {
    redirect('/projects')
  }

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-gray-800 border-r overflow-y-auto">
        <div className="p-4">
          <Link href={`/projects/${id}`}>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 mb-4">
              ← Back to Project
            </div>
          </Link>

          <h2 className="text-lg font-bold mb-1">{project.title}</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Story Outline
          </p>

          {/* Navigation */}
          <nav className="space-y-1">
            <Link
              href={`/projects/${id}`}
              className="block px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Overview
            </Link>
            <Link
              href={`/projects/${id}/chapters`}
              className="block px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Chapters
            </Link>
            <Link
              href={`/projects/${id}/characters`}
              className="block px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Characters
            </Link>
            <Link
              href={`/projects/${id}/outline`}
              className="block px-3 py-2 rounded-md text-sm font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
            >
              Outline
            </Link>
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold mb-2">Story Outline</h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Plan your novel structure
                </p>
              </div>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                AI Generate Outline
              </button>
            </div>
          </div>

          {/* Project Info */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border p-6 mb-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Genre:</span>
                <span className="ml-2 font-medium">{project.genre || 'Not set'}</span>
              </div>
              <div>
                <span className="text-gray-500">Perspective:</span>
                <span className="ml-2 font-medium">
                  {project.narrativePerspective || 'Not set'}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Target Words:</span>
                <span className="ml-2 font-medium">
                  {project.targetWords.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Main Characters:</span>
                <span className="ml-2 font-medium">
                  {project.characterCount}
                </span>
              </div>
            </div>
          </div>

          {/* Chapter Outline */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">Chapter Outline</h2>

            {chapters.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border">
                <p className="text-gray-500 mb-4">No chapters yet</p>
                <Link
                  href={`/projects/${id}/chapters/new`}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Create your first chapter →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {chapters.map((chapter, index) => (
                  <div
                    key={chapter.id}
                    className="bg-white dark:bg-gray-800 rounded-lg p-6 border"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 font-semibold">
                        {chapter.chapterNumber}
                      </div>
                      <div className="flex-1">
                        <Link
                          href={`/projects/${id}/chapters/${chapter.id}`}
                          className="text-lg font-semibold hover:text-blue-600"
                        >
                          {chapter.title}
                        </Link>
                        {chapter.summary && (
                          <p className="text-gray-600 dark:text-gray-400 mt-2">
                            {chapter.summary}
                          </p>
                        )}
                        <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
                          <span>{chapter.wordCount} words</span>
                          {chapter.content ? (
                            <span className="text-green-600">✓ Written</span>
                          ) : (
                            <span className="text-yellow-600">Not written</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Story Notes */}
          <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4">Story Notes</h2>
            <textarea
              className="w-full h-48 p-4 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Add your story notes, plot ideas, themes, motifs..."
            />
          </div>
        </div>
      </main>
    </div>
  )
}
