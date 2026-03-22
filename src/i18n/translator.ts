import type { MessageTree } from './messages'

type NestedKeyOf<T> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends string
          ? K
          : `${K}.${NestedKeyOf<T[K]>}`
        : never
    }[keyof T]
  : never

export type MessageKey = NestedKeyOf<MessageTree>

function getLeaf(obj: unknown, path: string): string | undefined {
  const parts = path.split('.')
  let cur: unknown = obj
  for (const p of parts) {
    if (cur === null || cur === undefined || typeof cur !== 'object') {
      return undefined
    }
    cur = (cur as Record<string, unknown>)[p]
  }
  return typeof cur === 'string' ? cur : undefined
}

export function interpolate(
  template: string,
  vars: Record<string, string | number> | undefined,
): string {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const v = vars[key]
    return v === undefined ? `{${key}}` : String(v)
  })
}

export function createTranslator(messages: MessageTree) {
  return function t(
    key: MessageKey,
    vars?: Record<string, string | number>,
  ): string {
    const raw = getLeaf(messages, key)
    if (raw === undefined) {
      return String(key)
    }
    return interpolate(raw, vars)
  }
}

export type Translator = ReturnType<typeof createTranslator>
