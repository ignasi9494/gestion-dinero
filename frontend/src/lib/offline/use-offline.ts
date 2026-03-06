'use client'

import { useState, useEffect, useCallback } from 'react'
import { getSyncQueue } from './db'
import { syncPendingChanges } from './sync'

interface OfflineStatus {
  isOnline: boolean
  hasPendingSync: boolean
  pendingSyncCount: number
  isSyncing: boolean
  syncNow: () => Promise<void>
}

export function useOfflineStatus(): OfflineStatus {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  const [pendingSyncCount, setPendingSyncCount] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Check sync queue periodically
  useEffect(() => {
    const checkQueue = async () => {
      const queue = await getSyncQueue()
      setPendingSyncCount(queue.length)
    }

    checkQueue()
    const interval = setInterval(checkQueue, 5000)
    return () => clearInterval(interval)
  }, [])

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && pendingSyncCount > 0 && !isSyncing) {
      syncNowFn()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline])

  const syncNowFn = useCallback(async () => {
    if (isSyncing) return
    setIsSyncing(true)
    try {
      await syncPendingChanges()
      const queue = await getSyncQueue()
      setPendingSyncCount(queue.length)
    } finally {
      setIsSyncing(false)
    }
  }, [isSyncing])

  return {
    isOnline,
    hasPendingSync: pendingSyncCount > 0,
    pendingSyncCount,
    isSyncing,
    syncNow: syncNowFn,
  }
}
