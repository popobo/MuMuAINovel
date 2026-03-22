'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ChevronsLeft,
  ChevronsRight,
  FileSearch,
  FolderKanban,
  Lightbulb,
  Puzzle,
  Settings,
  Sparkles,
  Upload,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'
import {
  APP_SIDEBAR_STORAGE_KEY,
  usePersistedSidebarCollapse,
} from '@/hooks/use-persisted-sidebar-collapse'

const navInactiveTop =
  'block rounded-md px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700'
const navActiveTop =
  'block rounded-md px-3 py-2 text-sm font-semibold bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'

const navInactiveGrouped =
  'block rounded-md px-2 py-2 text-sm font-medium text-gray-800 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700'
const navActiveGrouped =
  'block rounded-md px-2 py-2 text-sm font-semibold bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'

/** 分组标题：更小、更淡，与可点击项明显区分（中文无 uppercase 效果时仍靠字号/颜色分层） */
const navGroupTitle =
  'mb-1.5 block px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500'

/** 组内链接：左侧参照线 + 缩进，表示从属于上一行的分组标题 */
const navGroupBody =
  'ml-2 space-y-0.5 border-l-2 border-gray-200 pl-3 dark:border-gray-600'

const iconNavBase =
  'flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
const iconNavActive =
  'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'

function isActive(pathname: string, href: string): boolean {
  if (href === '/projects') return pathname === '/projects'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function AppSidebar() {
  const pathname = usePathname()
  const { t } = useI18n()
  const { collapsed, toggle } = usePersistedSidebarCollapse(
    APP_SIDEBAR_STORAGE_KEY,
  )

  const creationLinks = [
    { href: '/wizard', labelKey: 'projects.wizard' as const, icon: Sparkles },
    {
      href: '/inspiration',
      labelKey: 'sidebar.workspaceNav.inspiration' as const,
      icon: Lightbulb,
    },
    {
      href: '/book-import',
      labelKey: 'sidebar.workspaceNav.bookImport' as const,
      icon: Upload,
    },
  ]

  const systemLinks = [
    {
      href: '/prompt-templates',
      labelKey: 'sidebar.workspaceNav.promptTemplates' as const,
      icon: FileSearch,
    },
    {
      href: '/mcp-plugins',
      labelKey: 'sidebar.workspaceNav.mcpPlugins' as const,
      icon: Puzzle,
    },
    {
      href: '/settings',
      labelKey: 'sidebar.workspaceNav.settings' as const,
      icon: Settings,
    },
  ]

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
            className={`${iconNavBase} ${isActive(pathname, '/projects') ? iconNavActive : ''}`}
            title={t('nav.projects')}
            aria-label={t('nav.projects')}
          >
            <FolderKanban className="h-5 w-5 shrink-0" aria-hidden />
          </Link>
          {creationLinks.map(({ href, labelKey, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`${iconNavBase} ${isActive(pathname, href) ? iconNavActive : ''}`}
              title={t(labelKey)}
              aria-label={t(labelKey)}
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden />
            </Link>
          ))}
          {systemLinks.map(({ href, labelKey, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`${iconNavBase} ${isActive(pathname, href) ? iconNavActive : ''}`}
              title={t(labelKey)}
              aria-label={t(labelKey)}
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden />
            </Link>
          ))}
        </nav>
      ) : (
        <nav className="flex-1 space-y-5 overflow-y-auto p-3">
          <div>
            <Link
              href="/projects"
              className={
                isActive(pathname, '/projects') ? navActiveTop : navInactiveTop
              }
            >
              {t('nav.projects')}
            </Link>
          </div>
          <div>
            <p className={navGroupTitle} role="presentation">
              {t('sidebar.workspaceNav.groupCreation')}
            </p>
            <div className={navGroupBody}>
              {creationLinks.map(({ href, labelKey }) => (
                <Link
                  key={href}
                  href={href}
                  className={
                    isActive(pathname, href)
                      ? navActiveGrouped
                      : navInactiveGrouped
                  }
                >
                  {t(labelKey)}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <p className={navGroupTitle} role="presentation">
              {t('sidebar.workspaceNav.groupSystem')}
            </p>
            <div className={navGroupBody}>
              {systemLinks.map(({ href, labelKey }) => (
                <Link
                  key={href}
                  href={href}
                  className={
                    isActive(pathname, href)
                      ? navActiveGrouped
                      : navInactiveGrouped
                  }
                >
                  {t(labelKey)}
                </Link>
              ))}
            </div>
          </div>
        </nav>
      )}
    </aside>
  )
}
