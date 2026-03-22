'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setUserLocale } from '@/app/actions/locale'
import type { AppLocale } from '@/i18n/config'
import { useI18n } from '@/i18n/context'
import { Button } from '@/components/ui/button'

export function LocaleSwitcher({ className }: { className?: string }) {
  const { locale, t } = useI18n()
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function select(next: AppLocale) {
    if (next === locale) return
    startTransition(async () => {
      await setUserLocale(next)
      router.refresh()
    })
  }

  return (
    <div className={`flex items-center gap-1 ${className ?? ''}`}>
      <span className="text-xs text-muted-foreground mr-1">
        {t('locale.label')}
      </span>
      <Button
        type="button"
        variant={locale === 'en' ? 'default' : 'ghost'}
        size="sm"
        className="h-8 px-2 text-xs"
        disabled={pending}
        onClick={() => select('en')}
      >
        {t('locale.en')}
      </Button>
      <Button
        type="button"
        variant={locale === 'zh' ? 'default' : 'ghost'}
        size="sm"
        className="h-8 px-2 text-xs"
        disabled={pending}
        onClick={() => select('zh')}
      >
        {t('locale.zh')}
      </Button>
    </div>
  )
}
