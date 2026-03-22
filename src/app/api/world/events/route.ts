import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { EventService } from '@/services/event.service'

export async function GET(request: NextRequest) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const projectId = searchParams.get('projectId')

  if (!projectId) {
    return NextResponse.json({ error: 'Project ID required' }, { status: 400 })
  }

  const service = new EventService()
  const events = await service.listByProject(projectId)

  return NextResponse.json({ events })
}

export async function POST(request: NextRequest) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  const service = new EventService()
  const event = await service.create(body)

  return NextResponse.json(event, { status: 201 })
}
