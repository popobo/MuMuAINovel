export const LOCALE_COOKIE = 'mumu-locale'

export const locales = ['en', 'zh'] as const

export type AppLocale = (typeof locales)[number]

export const defaultLocale: AppLocale = 'en'

export function isAppLocale(value: string): value is AppLocale {
  return (locales as readonly string[]).includes(value)
}
