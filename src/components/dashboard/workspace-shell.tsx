'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { AppSidebar } from '@/components/dashboard/app-sidebar'

const APP_SIDEBAR_PREFIXES = [
  '/settings',
  '/prompt-templates',
  '/mcp-plugins',
  '/wizard',
  '/inspiration',
  '/book-import',
] as const

function shouldShowAppSidebar(pathname: string | null): boolean {
  if (!pathname) return false
  if (pathname === '/projects') return true
  return APP_SIDEBAR_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const show = shouldShowAppSidebar(pathname)

  if (!show) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-0 w-full flex-1">
      <AppSidebar />
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto px-6 py-0 md:px-8">
        {children}
      </div>
    </div>
  )
}
