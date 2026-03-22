import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    // Get the relationship to verify ownership
    const relationship = await db.relationship.findUnique({
      where: { id },
      include: {
        character: {
          include: {
            project: true,
          },
        },
      },
    })

    if (!relationship) {
      return NextResponse.json({ error: 'Relationship not found' }, { status: 404 })
    }

    // Verify project belongs to user
    if (relationship.character.project.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Delete relationship
    await db.relationship.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete relationship:', error)
    return NextResponse.json(
      { error: 'Failed to delete relationship' },
      { status: 500 }
    )
  }
}
