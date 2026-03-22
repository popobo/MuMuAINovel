import { getTranslator } from '@/i18n/server'
import { AiSettingsForm } from '@/components/settings/ai-settings-form'

export default async function SettingsPage() {
  const { t } = await getTranslator()

  return (
    <div className="py-8">
      <div className="mx-auto mb-8 max-w-2xl">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          {t('settings.pageTitle')}
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          {t('settings.pageSubtitle')}
        </p>
      </div>
      <AiSettingsForm />
    </div>
  )
}
