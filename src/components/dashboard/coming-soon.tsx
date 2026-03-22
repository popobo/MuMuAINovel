import type { MessageKey, Translator } from '@/i18n/translator'

type ComingSoonProps = {
  t: Translator
  titleKey: MessageKey
}

export function ComingSoon({ t, titleKey }: ComingSoonProps) {
  return (
    <div className="py-10">
      <div className="mx-auto max-w-lg rounded-xl border border-dashed border-gray-300 bg-white p-8 dark:border-gray-600 dark:bg-gray-800">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
          {t('workspace.comingSoon.badge')}
        </p>
        <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
          {t(titleKey)}
        </h1>
        <p className="mt-4 text-gray-600 dark:text-gray-400">
          {t('workspace.comingSoon.description')}
        </p>
      </div>
    </div>
  )
}
