import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ProjectService } from '@/services/project.service'
import { CharacterService } from '@/services/character.service'

export default async function CharacterDetailPage({
  params,
}: {
  params: Promise<{ id: string; characterId: string }>
}) {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login')
  }

  const { id, characterId } = await params

  const projectService = new ProjectService()
  const characterService = new CharacterService()

  const [project, character] = await Promise.all([
    projectService.getById(id, session.user.id),
    characterService.getById(characterId),
  ])

  if (!project || !character) {
    redirect(`/projects/${id}/characters`)
  }

  return (
    <div className="p-8">
      <div className="mx-auto max-w-4xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">{character.name}</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Character Profile
            </p>
          </div>

          {/* Character Details */}
          <div className="space-y-6">
            {character.personality && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
                <h2 className="text-lg font-semibold mb-3">Personality</h2>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {character.personality}
                </p>
              </div>
            )}

            {character.background && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
                <h2 className="text-lg font-semibold mb-3">Background</h2>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {character.background}
                </p>
              </div>
            )}

            {character.appearance && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
                <h2 className="text-lg font-semibold mb-3">Appearance</h2>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {character.appearance}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-4">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Edit Character
              </button>
              <button className="px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                AI Expand Profile
              </button>
            </div>
          </div>
      </div>
    </div>
  )
}
