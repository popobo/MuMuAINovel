import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { ProjectService } from '@/services/project.service'

export async function GET(request: NextRequest) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = new ProjectService()
  const projects = await service.listByUser(session.user.id)

  return NextResponse.json({ projects })
}

export async function POST(request: NextRequest) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  const service = new ProjectService()
  const project = await service.create({
    userId: session.user.id,
    ...body,
  })

  return NextResponse.json(project, { status: 201 })
}
