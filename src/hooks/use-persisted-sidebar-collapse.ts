'use client'

import { useCallback, useState } from 'react'

export const APP_SIDEBAR_STORAGE_KEY = 'mumu-dashboard-app-sidebar-collapsed'
export const PROJECT_SIDEBAR_STORAGE_KEY =
  'mumu-dashboard-project-sidebar-collapsed'

export function usePersistedSidebarCollapse(storageKey: string) {
  // Initialize state from localStorage to avoid setting state in effect
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(storageKey) === '1'
    } catch {
      return false
    }
  })

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
