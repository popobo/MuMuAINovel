import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ProjectService } from '@/services/project.service'
import { CharacterService } from '@/services/character.service'

export default async function CharactersPage({
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
  const characterService = new CharacterService()

  const [project, characters] = await Promise.all([
    projectService.getById(id, session.user.id),
    characterService.listByProject(id),
  ])

  if (!project) {
    redirect('/projects')
  }

  return (
    <div className="p-8">
      <div className="mx-auto max-w-6xl">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold">Characters</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {characters.length} characters
              </p>
            </div>
            <Link
              href={`/projects/${id}/characters/new`}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              + Add Character
            </Link>
          </div>

          {/* Characters Grid */}
          {characters.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border">
              <p className="text-gray-500 mb-4">No characters yet</p>
              <Link
                href={`/projects/${id}/characters/new`}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Add your first character →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {characters.map((character) => (
                <Link
                  key={character.id}
                  href={`/projects/${id}/characters/${character.id}`}
                  className="bg-white dark:bg-gray-800 rounded-lg p-6 border hover:shadow-md transition-shadow"
                >
                  <div className="mb-3">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                      {character.name.charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">
                    {character.name}
                  </h3>
                  {(character.background ?? character.personality) && (
                    <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-3">
                      {character.background ?? character.personality}
                    </p>
                  )}
                  {character.personality && (
                    <div className="mt-3">
                      <span className="text-xs text-gray-500">Personality:</span>
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {character.personality}
                      </p>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
      </div>
    </div>
  )
}
