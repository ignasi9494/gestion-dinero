'use client'

import { createClient } from '@/lib/supabase/client'
import { getSyncQueue, removeSyncQueueEntry } from './db'

export async function syncPendingChanges(): Promise<{ synced: number; failed: number }> {
  const queue = await getSyncQueue()
  if (queue.length === 0) return { synced: 0, failed: 0 }

  const supabase = createClient()
  let synced = 0
  let failed = 0

  for (const entry of queue) {
    try {
      if (entry.operation === 'update') {
        const { error } = await supabase
          .from(entry.table as 'transactions')
          .update(entry.data)
          .eq('id', entry.recordId)

        if (error) {
          failed++
          continue
        }
      }

      await removeSyncQueueEntry(entry.id)
      synced++
    } catch {
      failed++
    }
  }

  return { synced, failed }
}

export function registerSyncListener(onSync?: (result: { synced: number; failed: number }) => void) {
  if (typeof window === 'undefined') return () => {}

  const handleOnline = async () => {
    const result = await syncPendingChanges()
    onSync?.(result)
  }

  window.addEventListener('online', handleOnline)
  return () => window.removeEventListener('online', handleOnline)
}
