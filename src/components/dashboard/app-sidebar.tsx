'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronsLeft, ChevronsRight, FolderKanban, Sparkles } from 'lucide-react'
import { useI18n } from '@/i18n/context'
import {
  APP_SIDEBAR_STORAGE_KEY,
  usePersistedSidebarCollapse,
} from '@/hooks/use-persisted-sidebar-collapse'

const navInactive =
  'block rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
const navActive =
  'block rounded-md px-3 py-2 text-sm font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'

const iconNavBase =
  'flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
const iconNavActive =
  'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'

export function AppSidebar() {
  const pathname = usePathname()
  const { t } = useI18n()
  const { collapsed, toggle } = usePersistedSidebarCollapse(
    APP_SIDEBAR_STORAGE_KEY,
  )
  const projectsActive = pathname === '/projects'

  return (
    <aside
      className={`flex shrink-0 flex-col overflow-hidden border-r border-gray-200 bg-white transition-[width] duration-200 ease-out dark:border-gray-700 dark:bg-gray-800 ${
        collapsed ? 'w-14' : 'w-64'
      }`}
    >
      <div
        className={`flex shrink-0 items-center border-b border-gray-200 dark:border-gray-700 ${
          collapsed ? 'flex-col gap-2 py-3' : 'justify-between gap-2 px-4 py-4'
        }`}
      >
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {t('sidebar.appTitle')}
            </p>
            <p className="mt-1 truncate text-lg font-bold text-gray-900 dark:text-gray-100">
              {t('brand')}
            </p>
          </div>
        )}
        <button
          type="button"
          onClick={toggle}
          className="shrink-0 rounded-md p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
          title={
            collapsed ? t('sidebar.expandSidebar') : t('sidebar.collapseSidebar')
          }
          aria-label={
            collapsed ? t('sidebar.expandSidebar') : t('sidebar.collapseSidebar')
          }
          aria-expanded={!collapsed}
        >
          {collapsed ? (
            <ChevronsRight className="h-5 w-5" aria-hidden />
          ) : (
            <ChevronsLeft className="h-5 w-5" aria-hidden />
          )}
        </button>
      </div>

      {collapsed ? (
        <nav className="flex flex-col items-center gap-1 overflow-y-auto py-2">
          <Link
            href="/projects"
            className={`${iconNavBase} ${projectsActive ? iconNavActive : ''}`}
            title={t('nav.projects')}
            aria-label={t('nav.projects')}
          >
            <FolderKanban className="h-5 w-5 shrink-0" aria-hidden />
          </Link>
          <Link
            href="/wizard"
            className={iconNavBase}
            title={t('projects.wizard')}
            aria-label={t('projects.wizard')}
          >
            <Sparkles className="h-5 w-5 shrink-0" aria-hidden />
          </Link>
        </nav>
      ) : (
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          <Link
            href="/projects"
            className={projectsActive ? navActive : navInactive}
          >
            {t('nav.projects')}
          </Link>
          <Link href="/wizard" className={navInactive}>
            {t('projects.wizard')}
          </Link>
        </nav>
      )}
    </aside>
  )
}
