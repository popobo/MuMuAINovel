import { cookies } from 'next/headers'
import { defaultLocale, isAppLocale, LOCALE_COOKIE } from './config'
import type { AppLocale } from './config'
import { getMessageTree } from './messages'
import { createTranslator } from './translator'

export async function getLocale(): Promise<AppLocale> {
  const jar = await cookies()
  const raw = jar.get(LOCALE_COOKIE)?.value
  if (raw && isAppLocale(raw)) {
    return raw
  }
  return defaultLocale
}

export async function getTranslator() {
  const locale = await getLocale()
  const messages = getMessageTree(locale)
  return { locale, t: createTranslator(messages), messages }
}
