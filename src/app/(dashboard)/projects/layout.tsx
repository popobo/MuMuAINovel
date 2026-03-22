'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { AppSidebar } from '@/components/dashboard/app-sidebar'

export default function ProjectsLayout({
  children,
}: {
  children: ReactNode
}) {
  const pathname = usePathname()
  const isProjectList = pathname === '/projects'

  if (!isProjectList) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-0 w-full flex-1">
      <AppSidebar />
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  )
}
