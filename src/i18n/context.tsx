'use client'

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react'
import type { AppLocale } from './config'
import type { MessageTree } from './messages'
import { createTranslator, type Translator } from './translator'

type I18nContextValue = {
  locale: AppLocale
  t: Translator
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function LocaleProvider({
  locale,
  messages,
  children,
}: {
  locale: AppLocale
  messages: MessageTree
  children: ReactNode
}) {
  const value = useMemo(() => {
    const t = createTranslator(messages)
    return { locale, t }
  }, [locale, messages])

  return (
    <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
  )
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    throw new Error('useI18n must be used within LocaleProvider')
  }
  return ctx
}
