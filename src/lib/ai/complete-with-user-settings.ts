import { AIService } from '@/lib/ai'
import { OpenAIProvider } from '@/lib/ai/providers/openai.provider'
import { AnthropicProvider } from '@/lib/ai/providers/anthropic.provider'
import type { AIMessage, AICompleteOptions, AICompleteResponse } from '@/lib/ai/types'
import { UserAiSettingsService } from '@/services/user-ai-settings.service'

export type ExecutorSettings = {
  apiProvider: string
  apiKey: string
  apiBaseUrl: string | null
  llmModel: string
  temperature: number
  maxTokens: number
}

const userAiSettingsService = new UserAiSettingsService()

export function resolveOpenAiCompatibleBaseUrl(
  provider: string,
  customUrl: string | null | undefined,
): string {
  const trimmed = customUrl?.trim()
  if (trimmed) {
    return trimmed.replace(/\/$/, '')
  }
  switch (provider) {
    case 'openrouter':
      return 'https://openrouter.ai/api/v1'
    case 'mumu':
      return 'https://api.mumuverse.space/v1'
    case 'openai':
    default:
      return 'https://api.openai.com/v1'
  }
}

/**
 * Build a one-shot completion using the same rules as saved user settings.
 */
export function createCompletionExecutor(settings: ExecutorSettings) {
  const key = settings.apiKey.trim()
  if (!key) {
    throw new Error('API key is required')
  }

  const model = settings.llmModel
  const temperature = settings.temperature
  const maxTokens = settings.maxTokens

  switch (settings.apiProvider) {
    case 'anthropic': {
      const baseURL = settings.apiBaseUrl?.trim() || undefined
      const client = new AnthropicProvider(key, {
        baseURL,
        defaultModel: model,
        defaultTemperature: temperature,
        defaultMaxTokens: maxTokens,
      })
      return (messages: AIMessage[], options?: AICompleteOptions) =>
        client.complete(messages, {
          ...options,
          model: options?.model ?? model,
          temperature: options?.temperature ?? temperature,
          maxTokens: options?.maxTokens ?? maxTokens,
        })
    }
    case 'openai':
    case 'openrouter':
    case 'mumu': {
      const baseURL = resolveOpenAiCompatibleBaseUrl(
        settings.apiProvider,
        settings.apiBaseUrl,
      )
      const client = new OpenAIProvider(key, {
        baseURL,
        defaultModel: model,
        defaultTemperature: temperature,
        defaultMaxTokens: maxTokens,
      })
      return (messages: AIMessage[], options?: AICompleteOptions) =>
        client.complete(messages, {
          ...options,
          model: options?.model ?? model,
          temperature: options?.temperature ?? temperature,
          maxTokens: options?.maxTokens ?? maxTokens,
        })
    }
    default:
      throw new Error(`Unknown API provider: ${settings.apiProvider}`)
  }
}

export async function completeWithUserOrEnv(
  userId: string | undefined,
  messages: AIMessage[],
  options?: AICompleteOptions,
): Promise<AICompleteResponse> {
  if (userId) {
    const row = await userAiSettingsService.getFullByUserId(userId)
    if (row?.apiKey?.trim()) {
      const run = createCompletionExecutor({
        apiProvider: row.apiProvider,
        apiKey: row.apiKey,
        apiBaseUrl: row.apiBaseUrl,
        llmModel: row.llmModel,
        temperature: row.temperature,
        maxTokens: row.maxTokens,
      })
      return run(messages, options)
    }
  }

  const service = new AIService()
  return service.complete(messages, options)
}
