import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { createCompletionExecutor } from '@/lib/ai/complete-with-user-settings'
import type { AIMessage } from '@/lib/ai/types'
import { USE_STORED_API_KEY } from '@/lib/user-ai-api-constants'
import { UserAiSettingsService } from '@/services/user-ai-settings.service'

const providerEnum = z.enum(['openai', 'openrouter', 'mumu', 'anthropic'])

const bodySchema = z.object({
  apiProvider: providerEnum,
  apiKey: z.string().min(1),
  apiBaseUrl: z.string().nullable().optional(),
  llmModel: z.string().min(1).max(256),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().min(16).max(4096).optional(),
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
        { success: false, message: 'No saved API key. Enter a key or save settings first.' },
        { status: 400 },
      )
    }
    apiKey = row.apiKey
  }

  const messages: AIMessage[] = [
    {
      role: 'user',
      content:
        'Reply with exactly the single word OK and nothing else. No punctuation.',
    },
  ]

  const started = Date.now()
  try {
    const run = createCompletionExecutor({
      apiProvider: body.apiProvider,
      apiKey,
      apiBaseUrl: body.apiBaseUrl ?? null,
      llmModel: body.llmModel,
      temperature: body.temperature ?? 0.3,
      maxTokens: body.maxTokens ?? 32,
    })
    const res = await run(messages, {
      temperature: body.temperature ?? 0.3,
      maxTokens: body.maxTokens ?? 32,
    })
    const preview = res.content.slice(0, 200)
    return NextResponse.json({
      success: true,
      message: 'Connection OK',
      responseTimeMs: Date.now() - started,
      responsePreview: preview,
      model: res.model,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Request failed'
    return NextResponse.json({
      success: false,
      message: msg,
      responseTimeMs: Date.now() - started,
    })
  }
}
