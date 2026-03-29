import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ProjectService } from '@/services/project.service'
import { CharacterService } from '@/services/character.service'
import { RelationshipsWorkspace } from '@/components/relationships/relationships-workspace'
import { AddRelationshipDialog } from '@/components/relationships/add-relationship-dialog'
import { getRelationshipGraphData } from '@/lib/relationship-graph-data'
import { db } from '@/lib/db'

export default async function RelationshipsPage({
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

  // Load graph in-process: server-side fetch to absolute API URL does not forward session cookies, so the graph was always empty.
  const graphData = await getRelationshipGraphData(id)

  // Server action: same cookie issue as above — write via Prisma after auth.
  async function addRelationship(data: {
    characterId: string
    relatedId: string
    relationshipType: string
    description?: string
    strength?: number
  }) {
    'use server'

    const session = await auth()
    if (!session?.user?.id) {
      redirect('/login')
    }

    const project = await db.project.findFirst({
      where: { id, userId: session.user.id },
    })
    if (!project) {
      redirect('/projects')
    }

    const [fromChar, toChar] = await Promise.all([
      db.character.findFirst({
        where: { id: data.characterId, projectId: id },
      }),
      db.character.findFirst({
        where: { id: data.relatedId, projectId: id },
      }),
    ])
    if (!fromChar || !toChar || data.characterId === data.relatedId) {
      return
    }

    try {
      await db.relationship.create({
        data: {
          characterId: data.characterId,
          relatedId: data.relatedId,
          relationshipType: data.relationshipType,
          description: data.description,
          strength: data.strength ?? 50,
        },
      })
    } catch {
      return
    }

    redirect(`/projects/${id}/relationships`)
  }

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col">
      <div className="flex min-h-0 flex-1 flex-col">
          {/* Header */}
          <div className="flex-none p-6 bg-white dark:bg-gray-800 border-b">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold">Character Relationships</h1>
                <p className="mt-1 text-gray-600 dark:text-gray-400">
                  Visualize and manage character connections
                </p>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {characters.length} characters ·{' '}
                  {(Array.isArray(graphData.edges) ? graphData.edges.length : 0)}{' '}
                  relationships
                </p>
              </div>

              {characters.length >= 2 && (
                <AddRelationshipDialog
                  characters={characters}
                  onAdd={addRelationship}
                />
              )}
            </div>

            {/* Legend */}
            <div className="mt-6 flex flex-wrap gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded"></div>
                <span>Character Node</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-gray-400"></div>
                <span>Relationship Edge</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">
                  💡 Tip: Click and drag to rearrange the graph
                </span>
              </div>
            </div>
          </div>

          {/* Empty State */}
          {characters.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center bg-white dark:bg-gray-800 rounded-lg p-12 border">
                <div className="text-6xl mb-4">👥</div>
                <h3 className="text-xl font-semibold mb-2">No Characters Yet</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Create characters first to visualize their relationships
                </p>
                <Link
                  href={`/projects/${id}/characters/new`}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Add Your First Character →
                </Link>
              </div>
            </div>
          ) : (
            /* Graph */
            <div className="flex min-h-0 flex-1 flex-col p-6">
              <RelationshipsWorkspace
                projectId={id}
                initialNodes={graphData.nodes}
                initialEdges={graphData.edges}
                editable={true}
              />
            </div>
          )}
      </div>
    </div>
  )
}
