import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { getRelationshipGraphData } from '@/lib/relationship-graph-data'

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

    const graph = await getRelationshipGraphData(id)
    return NextResponse.json(graph)
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
