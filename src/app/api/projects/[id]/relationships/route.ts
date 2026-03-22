import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    // Verify project belongs to user
    const project = await db.project.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Get all characters
    const characters = await db.character.findMany({
      where: { projectId: id },
      select: {
        id: true,
        name: true,
        role: true,
        avatar: true,
      },
    })

    // Get all relationships
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

    // Transform to graph format
    const nodes = characters.map((character) => ({
      id: character.id,
      type: 'character',
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

    return NextResponse.json({
      nodes,
      edges,
    })
  } catch (error) {
    console.error('Failed to fetch relationships:', error)
    return NextResponse.json(
      { error: 'Failed to fetch relationships' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()

  try {
    // Verify project belongs to user
    const project = await db.project.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const { characterId, relatedId, relationshipType, description, strength } =
      body

    // Create relationship
    const relationship = await db.relationship.create({
      data: {
        characterId,
        relatedId,
        relationshipType,
        description,
        strength: strength || 50,
      },
    })

    return NextResponse.json(relationship, { status: 201 })
  } catch (error) {
    console.error('Failed to create relationship:', error)
    return NextResponse.json(
      { error: 'Failed to create relationship' },
      { status: 500 }
    )
  }
}
