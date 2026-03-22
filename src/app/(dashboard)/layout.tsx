import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getTranslator } from '@/i18n/server'
import { LocaleSwitcher } from '@/components/locale-switcher'
import { WorkspaceShell } from '@/components/dashboard/workspace-shell'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login')
  }

  const { t } = await getTranslator()

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900">
      <header className="shrink-0 border-b bg-white dark:bg-gray-800">
        <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-4">
          <Link href="/projects" className="text-2xl font-bold hover:opacity-90">
            {t('brand')}
          </Link>
          <div className="flex flex-wrap items-center justify-end gap-4">
            <LocaleSwitcher />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {session.user.name || session.user.email}
            </span>
            <form action="/api/auth/signout" method="POST">
              <Button variant="outline" type="submit">
                {t('nav.signOut')}
              </Button>
            </form>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col">
        <WorkspaceShell>{children}</WorkspaceShell>
      </div>
    </div>
  )
}
