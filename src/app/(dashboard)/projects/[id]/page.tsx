import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ProjectService } from '@/services/project.service'
import { ChapterService } from '@/services/chapter.service'
import { CharacterService } from '@/services/character.service'

export default async function ProjectDetailPage({
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
  const characterService = new CharacterService()

  const [project, chapters, characters] = await Promise.all([
    projectService.getById(id, session.user.id),
    chapterService.listByProject(id),
    characterService.listByProject(id),
  ])

  if (!project) {
    redirect('/projects')
  }

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-gray-800 border-r overflow-y-auto">
        <div className="p-4">
          <Link href="/projects">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 mb-4">
              ← Back to Projects
            </div>
          </Link>

          <h2 className="text-lg font-bold mb-1">{project.title}</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {project.genre}
          </p>

          {/* Navigation */}
          <nav className="space-y-1">
            <Link
              href={`/projects/${id}`}
              className="block px-3 py-2 rounded-md text-sm font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
            >
              Overview
            </Link>
            <Link
              href={`/projects/${id}/chapters`}
              className="block px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Chapters ({chapters.length})
            </Link>
            <Link
              href={`/projects/${id}/characters`}
              className="block px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Characters ({characters.length})
            </Link>
            <Link
              href={`/projects/${id}/relationships`}
              className="block px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Relationships
            </Link>
            <Link
              href={`/projects/${id}/world`}
              className="block px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              World
            </Link>
            <Link
              href={`/projects/${id}/outline`}
              className="block px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Outline
            </Link>
            <Link
              href={`/projects/${id}/settings`}
              className="block px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Settings
            </Link>
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">{project.title}</h1>
            {project.description && (
              <p className="text-gray-600 dark:text-gray-400">
                {project.description}
              </p>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Total Words
              </div>
              <div className="text-3xl font-bold">
                {project.currentWords.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500">
                of {project.targetWords.toLocaleString()} goal
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Chapters
              </div>
              <div className="text-3xl font-bold">{chapters.length}</div>
              <div className="text-sm text-gray-500">
                chapters created
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Characters
              </div>
              <div className="text-3xl font-bold">{characters.length}</div>
              <div className="text-sm text-gray-500">
                characters added
              </div>
            </div>
          </div>

          {/* Progress */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Writing Progress</h2>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {Math.round((project.currentWords / project.targetWords) * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all"
                style={{
                  width: `${Math.min(
                    (project.currentWords / project.targetWords) * 100,
                    100
                  )}%`,
                }}
              />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link
                href={`/projects/${id}/chapters/new`}
                className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-center font-medium"
              >
                + New Chapter
              </Link>
              <Link
                href={`/projects/${id}/characters/new`}
                className="px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-center font-medium"
              >
                + Add Character
              </Link>
            </div>
          </div>

          {/* Recent Chapters */}
          {chapters.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-semibold mb-4">Recent Chapters</h2>
              <div className="space-y-3">
                {chapters.slice(0, 5).map((chapter) => (
                  <Link
                    key={chapter.id}
                    href={`/projects/${id}/chapters/${chapter.id}`}
                    className="block bg-white dark:bg-gray-800 rounded-lg p-4 border hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">{chapter.title}</h3>
                        {chapter.summary && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                            {chapter.summary}
                          </p>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {chapter.wordCount} words
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Recent Characters */}
          {characters.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-semibold mb-4">Characters</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {characters.slice(0, 4).map((character) => (
                  <Link
                    key={character.id}
                    href={`/projects/${id}/characters/${character.id}`}
                    className="bg-white dark:bg-gray-800 rounded-lg p-4 border hover:shadow-md transition-shadow"
                  >
                    <h3 className="font-semibold">{character.name}</h3>
                    {(character.background ?? character.personality) && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                        {character.background ?? character.personality}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
