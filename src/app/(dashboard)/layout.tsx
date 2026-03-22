import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getTranslator } from '@/i18n/server'
import { LocaleSwitcher } from '@/components/locale-switcher'

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <h1 className="text-2xl font-bold">{t('brand')}</h1>
            <nav className="flex gap-4">
              <Link href="/projects">
                <Button variant="ghost">{t('nav.projects')}</Button>
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4 flex-wrap justify-end">
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

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
