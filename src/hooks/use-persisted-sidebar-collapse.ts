'use client'

import { useCallback, useLayoutEffect, useState } from 'react'

export const APP_SIDEBAR_STORAGE_KEY = 'mumu-dashboard-app-sidebar-collapsed'
export const PROJECT_SIDEBAR_STORAGE_KEY =
  'mumu-dashboard-project-sidebar-collapsed'

export function usePersistedSidebarCollapse(storageKey: string) {
  const [collapsed, setCollapsed] = useState(false)

  useLayoutEffect(() => {
    try {
      setCollapsed(localStorage.getItem(storageKey) === '1')
    } catch {
      /* ignore */
    }
  }, [storageKey])

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(storageKey, next ? '1' : '0')
      } catch {
        /* ignore */
      }
      return next
    })
  }, [storageKey])

  return { collapsed, toggle }
}
