import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ProjectService } from '@/services/project.service'
import { ChapterService } from '@/services/chapter.service'

export default async function ChaptersPage({
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
    <div className="p-8">
      <div className="mx-auto max-w-4xl">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold">Chapters</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {chapters.length} chapters
              </p>
            </div>
            <Link
              href={`/projects/${id}/chapters/new`}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              + New Chapter
            </Link>
          </div>

          {/* Chapters List */}
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
            <div className="space-y-4">
              {chapters.map((chapter) => (
                <Link
                  key={chapter.id}
                  href={`/projects/${id}/chapters/${chapter.id}`}
                  className="block bg-white dark:bg-gray-800 rounded-lg p-6 border hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-sm text-gray-500">
                          Chapter {chapter.chapterNumber}
                        </span>
                        <h3 className="text-xl font-semibold">{chapter.title}</h3>
                      </div>
                      {chapter.summary && (
                        <p className="text-gray-600 dark:text-gray-400 line-clamp-2">
                          {chapter.summary}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">
                        {chapter.wordCount} words
                      </div>
                      {chapter.content && (
                        <div className="text-xs text-green-600 mt-1">
                          ✓ Written
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
      </div>
    </div>
  )
}
