import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { WizardService } from '@/services/wizard.service'

export async function POST(request: NextRequest) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const config = await request.json()

    const service = new WizardService()
    const result = await service.createProjectWithAI(session.user.id, config)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Wizard generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate project' },
      { status: 500 }
    )
  }
}
