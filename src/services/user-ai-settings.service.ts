import { db } from '@/lib/db'

export type UserAiSettingsDTO = {
  id: string
  apiProvider: string
  apiBaseUrl: string | null
  llmModel: string
  temperature: number
  maxTokens: number
  hasApiKey: boolean
}

export type UserAiSettingsUpsert = {
  apiProvider: string
  apiBaseUrl?: string | null
  llmModel: string
  temperature: number
  maxTokens: number
  /** When set, updates stored key. Omit when leaving key unchanged. */
  apiKey?: string
  /** Remove stored key and fall back to server env */
  clearApiKey?: boolean
}

function toDto(row: {
  id: string
  apiProvider: string
  apiBaseUrl: string | null
  llmModel: string
  temperature: number
  maxTokens: number
  apiKey: string
}): UserAiSettingsDTO {
  return {
    id: row.id,
    apiProvider: row.apiProvider,
    apiBaseUrl: row.apiBaseUrl,
    llmModel: row.llmModel,
    temperature: row.temperature,
    maxTokens: row.maxTokens,
    hasApiKey: row.apiKey.trim().length > 0,
  }
}

export class UserAiSettingsService {
  async getByUserId(userId: string): Promise<UserAiSettingsDTO | null> {
    const row = await db.userAiSettings.findUnique({ where: { userId } })
    if (!row) return null
    return toDto(row)
  }

  /** Full row including apiKey — server-side only */
  async getFullByUserId(userId: string) {
    return db.userAiSettings.findUnique({ where: { userId } })
  }

  async upsert(userId: string, data: UserAiSettingsUpsert) {
    const existing = await db.userAiSettings.findUnique({ where: { userId } })

    let nextKey: string | undefined
    if (data.clearApiKey) {
      nextKey = ''
    } else if (data.apiKey !== undefined) {
      nextKey = data.apiKey
    }

    const payload = {
      apiProvider: data.apiProvider,
      apiBaseUrl: data.apiBaseUrl ?? null,
      llmModel: data.llmModel,
      temperature: data.temperature,
      maxTokens: data.maxTokens,
      ...(nextKey !== undefined ? { apiKey: nextKey } : {}),
    }

    if (existing) {
      const row = await db.userAiSettings.update({
        where: { userId },
        data: payload,
      })
      return toDto(row)
    }

    const row = await db.userAiSettings.create({
      data: {
        userId,
        apiKey: nextKey ?? '',
        ...payload,
      },
    })
    return toDto(row)
  }

  async deleteByUserId(userId: string): Promise<void> {
    await db.userAiSettings.deleteMany({ where: { userId } })
  }
}
