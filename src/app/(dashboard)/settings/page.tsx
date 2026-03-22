import { getTranslator } from '@/i18n/server'
import { ComingSoon } from '@/components/dashboard/coming-soon'

export default async function SettingsPage() {
  const { t } = await getTranslator()
  return <ComingSoon t={t} titleKey="sidebar.workspaceNav.settings" />
}
