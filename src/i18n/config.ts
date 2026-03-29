export const LOCALE_COOKIE = 'mumu-locale'

export const locales = ['en', 'zh'] as const

export type AppLocale = (typeof locales)[number]

export const defaultLocale: AppLocale = 'en'

export function isAppLocale(value: string): value is AppLocale {
  return (locales as readonly string[]).includes(value)
}

export function getServerLocale(): AppLocale {
  // In a real implementation, you would read from cookies here
  // For now, we'll return the default locale
  return defaultLocale
}
