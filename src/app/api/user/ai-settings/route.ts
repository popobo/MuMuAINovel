import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { UserAiSettingsService } from '@/services/user-ai-settings.service'

const providerEnum = z.enum(['openai', 'openrouter', 'mumu', 'anthropic'])

const putBodySchema = z.object({
  apiProvider: providerEnum,
  apiBaseUrl: z.string().nullable().optional(),
  llmModel: z.string().min(1).max(256),
  temperature: z.number().min(0).max(2),
  maxTokens: z.number().int().min(64).max(200_000),
  /** New key; omit to keep existing */
  apiKey: z.string().optional(),
  clearApiKey: z.boolean().optional(),
})

const service = new UserAiSettingsService()

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const dto = await service.getByUserId(session.user.id)
  if (!dto) {
    return NextResponse.json({
      id: null,
      apiProvider: 'openai',
      apiBaseUrl: 'https://api.openai.com/v1',
      llmModel: 'gpt-4o-mini',
      temperature: 0.7,
      maxTokens: 2000,
      hasApiKey: false,
    })
  }

  return NextResponse.json(dto)
}

export async function PUT(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let json: unknown
  try {
    json = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = putBodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 422 },
    )
  }

  const body = parsed.data
  if (body.clearApiKey && body.apiKey !== undefined) {
    return NextResponse.json(
      { error: 'Cannot set apiKey and clearApiKey together' },
      { status: 422 },
    )
  }

  try {
    const dto = await service.upsert(session.user.id, {
      apiProvider: body.apiProvider,
      apiBaseUrl: body.apiBaseUrl,
      llmModel: body.llmModel,
      temperature: body.temperature,
      maxTokens: body.maxTokens,
      apiKey: body.apiKey,
      clearApiKey: body.clearApiKey,
    })
    return NextResponse.json(dto)
  } catch (e) {
    console.error('user ai-settings upsert', e)
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
  }
}

export async function DELETE() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await service.deleteByUserId(session.user.id)
  return NextResponse.json({ ok: true })
}
