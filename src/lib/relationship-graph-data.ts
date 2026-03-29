import { db } from '@/lib/db'

/** Graph payload for React Flow; caller must ensure project access. */
export async function getRelationshipGraphData(projectId: string) {
  const characters = await db.character.findMany({
    where: { projectId },
    select: {
      id: true,
      name: true,
      role: true,
      avatar: true,
    },
  })

  const relationships = await db.relationship.findMany({
    where: {
      characterId: { in: characters.map((c) => c.id) },
    },
    include: {
      character: {
        select: {
          id: true,
          name: true,
        },
      },
      related: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })

  const nodes = characters.map((character, index) => ({
    id: character.id,
    type: 'character' as const,
    position: {
      x: 80 + (index % 3) * 240,
      y: 80 + Math.floor(index / 3) * 160,
    },
    data: {
      label: character.name,
      role: character.role,
      avatar: character.avatar,
    },
  }))

  const edges = relationships.map((rel) => ({
    id: rel.id,
    source: rel.characterId,
    target: rel.relatedId,
    label: rel.relationshipType,
    data: {
      type: rel.relationshipType,
      description: rel.description,
      strength: rel.strength,
    },
  }))

  return { nodes, edges }
}
