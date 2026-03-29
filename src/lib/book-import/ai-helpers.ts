import { completeWithUserOrEnv } from '@/lib/ai/complete-with-user-settings'
import { parseJsonArrayFromModelText, parseJsonObjectFromModelText } from '@/lib/book-import/parse-ai-json'

/**
 * Call AI with JSON object response parsing (with retry)
 */
export async function callWithJsonObject(
  userId: string,
  prompt: string,
  opts?: { maxTokens?: number; temperature?: number },
): Promise<Record<string, unknown>> {
  let lastErr: Error = new Error('AI JSON 解析失败')
  const maxTokens = opts?.maxTokens ?? 4096
  const temperature = opts?.temperature ?? 0.35
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { content } = await completeWithUserOrEnv(
        userId,
        [{ role: 'user', content: prompt }],
        { maxTokens, temperature },
      )
      return parseJsonObjectFromModelText(content)
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e))
    }
  }
  throw lastErr
}

/**
 * Call AI with JSON array response parsing (with retry)
 */
export async function callWithJsonArray(userId: string, prompt: string): Promise<unknown[]> {
  let lastErr: Error = new Error('AI JSON 解析失败')
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { content } = await completeWithUserOrEnv(
        userId,
        [{ role: 'user', content: prompt }],
        { maxTokens: 8192,
          temperature: 0.35 },
      )
      return parseJsonArrayFromModelText(content)
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e))
    }
  }
  throw lastErr
}
