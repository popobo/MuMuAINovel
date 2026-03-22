import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { CharacterService } from '@/services/character.service'

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

  const service = new CharacterService()
  const characters = await service.listByProject(projectId)

  return NextResponse.json({ characters })
}

export async function POST(request: NextRequest) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  const service = new CharacterService()
  const character = await service.create(body)

  return NextResponse.json(character, { status: 201 })
}
