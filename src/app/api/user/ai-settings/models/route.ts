import { NextResponse } from 'next/server'
import { z } from 'zod'
import OpenAI from 'openai'
import { auth } from '@/lib/auth'
import { resolveOpenAiCompatibleBaseUrl } from '@/lib/ai/complete-with-user-settings'
import { USE_STORED_API_KEY } from '@/lib/user-ai-api-constants'
import { UserAiSettingsService } from '@/services/user-ai-settings.service'

const providerEnum = z.enum(['openai', 'openrouter', 'mumu'])

const bodySchema = z.object({
  apiProvider: providerEnum,
  apiKey: z.string().min(1),
  apiBaseUrl: z.string().nullable().optional(),
})

const settingsService = new UserAiSettingsService()

export async function POST(request: Request) {
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

  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 422 },
    )
  }

  const body = parsed.data
  let apiKey = body.apiKey

  if (apiKey === USE_STORED_API_KEY) {
    const row = await settingsService.getFullByUserId(session.user.id)
    if (!row?.apiKey?.trim()) {
      return NextResponse.json(
        { error: 'No saved API key' },
        { status: 400 },
      )
    }
    apiKey = row.apiKey
  }

  const baseURL = resolveOpenAiCompatibleBaseUrl(
    body.apiProvider,
    body.apiBaseUrl,
  )

  try {
    const client = new OpenAI({
      apiKey,
      baseURL,
    })
    const list = await client.models.list()
    const models = list.data
      .map((m) => m.id)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b))
    return NextResponse.json({ models, count: models.length })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to list models'
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
