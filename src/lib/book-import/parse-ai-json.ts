/**
 * 从模型输出中提取 JSON（去 markdown 代码块、截取平衡括号）
 */

function extractBalanced(
  text: string,
  open: string,
  close: string,
): string {
  const start = text.indexOf(open)
  if (start === -1) {
    console.error('[book-import] extractBalanced: No delimiter', open, 'found in text. First 500 chars:', text.slice(0, 500))
    throw new Error(`No ${open} in model output`)
  }
  let depth = 0
  for (let i = start; i < text.length; i++) {
    const c = text[i]
    if (c === open) depth++
    else if (c === close) {
      depth--
      if (depth === 0) {
        return text.slice(start, i + 1)
      }
    }
  }
  console.error('[book-import] extractBalanced: Unbalanced delimiters. Depth:', depth, 'Text length:', text.length, 'Last 500 chars:', text.slice(-500))
  throw new Error('Unbalanced JSON delimiters')
}

function stripCodeFence(text: string): string {
  const t = text.trim()
  const m = /^```(?:json)?\s*([\s\S]*?)```$/im.exec(t)
  return m ? m[1]!.trim() : t
}

export function parseJsonObjectFromModelText(text: string): Record<string, unknown> {
  console.log('[book-import] parseJsonObjectFromModelText input (first 500 chars):', text.slice(0, 500))
  const body = stripCodeFence(text)
  console.log('[book-import] After stripCodeFence (first 500 chars):', body.slice(0, 500))
  const slice = extractBalanced(body, '{', '}')
  console.log('[book-import] Extracted balanced JSON (first 500 chars):', slice.slice(0, 500))
  return JSON.parse(slice) as Record<string, unknown>
}

export function parseJsonArrayFromModelText(text: string): unknown[] {
  const body = stripCodeFence(text)
  const slice = extractBalanced(body, '[', ']')
  const parsed = JSON.parse(slice) as unknown
  if (!Array.isArray(parsed)) {
    throw new Error('Expected JSON array')
  }
  return parsed
}
