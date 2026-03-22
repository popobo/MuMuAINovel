'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ArrowLeft,
  BookOpen,
  ChevronsLeft,
  ChevronsRight,
  GitBranch,
  Globe,
  LayoutDashboard,
  ListOrdered,
  Settings,
  Users,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'
import {
  PROJECT_SIDEBAR_STORAGE_KEY,
  usePersistedSidebarCollapse,
} from '@/hooks/use-persisted-sidebar-collapse'

type ProjectSidebarProps = {
  projectId: string
  title: string
  genre: string
  chapterCount: number
  characterCount: number
}

const inactive =
  'block rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
const active =
  'block rounded-md px-3 py-2 text-sm font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'

const iconNavBase =
  'flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
const iconNavActive =
  'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'

export function ProjectSidebar({
  projectId,
  title,
  genre,
  chapterCount,
  characterCount,
}: ProjectSidebarProps) {
  const pathname = usePathname()
  const { t } = useI18n()
  const { collapsed, toggle } = usePersistedSidebarCollapse(
    PROJECT_SIDEBAR_STORAGE_KEY,
  )
  const base = `/projects/${projectId}`

  function linkClass(href: string, match: 'exact' | 'prefix'): string {
    const isOn =
      match === 'exact'
        ? pathname === href
        : pathname === href || pathname.startsWith(`${href}/`)
    return isOn ? active : inactive
  }

  function iconLinkClass(href: string, match: 'exact' | 'prefix'): string {
    const isOn =
      match === 'exact'
        ? pathname === href
        : pathname === href || pathname.startsWith(`${href}/`)
    return `${iconNavBase} ${isOn ? iconNavActive : ''}`
  }

  const backLabel = t('sidebar.project.backToProjects')

  return (
    <aside
      className={`flex shrink-0 flex-col overflow-hidden border-r border-gray-200 bg-white transition-[width] duration-200 ease-out dark:border-gray-700 dark:bg-gray-800 ${
        collapsed ? 'w-14' : 'w-64'
      }`}
    >
      <div
        className={`flex shrink-0 items-center border-b border-gray-200 dark:border-gray-700 ${
          collapsed ? 'justify-center py-2' : 'justify-end px-2 py-2'
        }`}
      >
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

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {collapsed ? (
          <nav className="flex flex-col items-center gap-1 px-0 py-2">
            <Link
              href="/projects"
              className={iconNavBase}
              title={backLabel}
              aria-label={backLabel}
            >
              <ArrowLeft className="h-5 w-5 shrink-0" aria-hidden />
            </Link>
            <Link
              href={base}
              className={iconLinkClass(base, 'exact')}
              title={t('sidebar.project.overview')}
              aria-label={t('sidebar.project.overview')}
            >
              <LayoutDashboard className="h-5 w-5 shrink-0" aria-hidden />
            </Link>
            <Link
              href={`${base}/chapters`}
              className={iconLinkClass(`${base}/chapters`, 'prefix')}
              title={`${t('sidebar.project.chapters')} (${chapterCount})`}
              aria-label={`${t('sidebar.project.chapters')} (${chapterCount})`}
            >
              <BookOpen className="h-5 w-5 shrink-0" aria-hidden />
            </Link>
            <Link
              href={`${base}/characters`}
              className={iconLinkClass(`${base}/characters`, 'prefix')}
              title={`${t('sidebar.project.characters')} (${characterCount})`}
              aria-label={`${t('sidebar.project.characters')} (${characterCount})`}
            >
              <Users className="h-5 w-5 shrink-0" aria-hidden />
            </Link>
            <Link
              href={`${base}/relationships`}
              className={iconLinkClass(`${base}/relationships`, 'prefix')}
              title={t('sidebar.project.relationships')}
              aria-label={t('sidebar.project.relationships')}
            >
              <GitBranch className="h-5 w-5 shrink-0" aria-hidden />
            </Link>
            <Link
              href={`${base}/world`}
              className={iconLinkClass(`${base}/world`, 'prefix')}
              title={t('sidebar.project.world')}
              aria-label={t('sidebar.project.world')}
            >
              <Globe className="h-5 w-5 shrink-0" aria-hidden />
            </Link>
            <Link
              href={`${base}/outline`}
              className={iconLinkClass(`${base}/outline`, 'prefix')}
              title={t('sidebar.project.outline')}
              aria-label={t('sidebar.project.outline')}
            >
              <ListOrdered className="h-5 w-5 shrink-0" aria-hidden />
            </Link>
            <Link
              href={`${base}/settings`}
              className={iconLinkClass(`${base}/settings`, 'prefix')}
              title={t('sidebar.project.settings')}
              aria-label={t('sidebar.project.settings')}
            >
              <Settings className="h-5 w-5 shrink-0" aria-hidden />
            </Link>
          </nav>
        ) : (
          <div className="p-4">
            <Link href="/projects">
              <span className="mb-4 block text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200">
                {backLabel}
              </span>
            </Link>

            <h2 className="mb-1 truncate text-lg font-bold text-gray-900 dark:text-gray-100">
              {title}
            </h2>
            <p className="mb-4 truncate text-sm text-gray-600 dark:text-gray-400">
              {genre || '—'}
            </p>

            <nav className="space-y-1">
              <Link href={base} className={linkClass(base, 'exact')}>
                {t('sidebar.project.overview')}
              </Link>
              <Link
                href={`${base}/chapters`}
                className={linkClass(`${base}/chapters`, 'prefix')}
              >
                {t('sidebar.project.chapters')} ({chapterCount})
              </Link>
              <Link
                href={`${base}/characters`}
                className={linkClass(`${base}/characters`, 'prefix')}
              >
                {t('sidebar.project.characters')} ({characterCount})
              </Link>
              <Link
                href={`${base}/relationships`}
                className={linkClass(`${base}/relationships`, 'prefix')}
              >
                {t('sidebar.project.relationships')}
              </Link>
              <Link
                href={`${base}/world`}
                className={linkClass(`${base}/world`, 'prefix')}
              >
                {t('sidebar.project.world')}
              </Link>
              <div className="ml-2 mt-0.5 space-y-0.5 border-l border-gray-200 pl-3 dark:border-gray-600">
                <Link
                  href={`${base}/world/locations`}
                  className={linkClass(`${base}/world/locations`, 'prefix')}
                >
                  {t('sidebar.project.worldLocations')}
                </Link>
                <Link
                  href={`${base}/world/organizations`}
                  className={linkClass(`${base}/world/organizations`, 'prefix')}
                >
                  {t('sidebar.project.worldOrganizations')}
                </Link>
                <Link
                  href={`${base}/world/events`}
                  className={linkClass(`${base}/world/events`, 'prefix')}
                >
                  {t('sidebar.project.worldEvents')}
                </Link>
              </div>
              <Link
                href={`${base}/outline`}
                className={linkClass(`${base}/outline`, 'prefix')}
              >
                {t('sidebar.project.outline')}
              </Link>
              <Link
                href={`${base}/settings`}
                className={linkClass(`${base}/settings`, 'prefix')}
              >
                {t('sidebar.project.settings')}
              </Link>
            </nav>
          </div>
        )}
      </div>
    </aside>
  )
}
