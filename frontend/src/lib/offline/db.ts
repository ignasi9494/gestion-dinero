// IndexedDB wrapper for offline data storage

const DB_NAME = 'gestion-dinero-offline'
const DB_VERSION = 1

interface SyncQueueEntry {
  id: string
  table: string
  operation: 'update'
  recordId: string
  data: Record<string, unknown>
  timestamp: number
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      reject(new Error('IndexedDB not available'))
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      if (!db.objectStoreNames.contains('transactions')) {
        const txStore = db.createObjectStore('transactions', { keyPath: 'id' })
        txStore.createIndex('date', 'date', { unique: false })
        txStore.createIndex('category_id', 'category_id', { unique: false })
      }

      if (!db.objectStoreNames.contains('categories')) {
        db.createObjectStore('categories', { keyPath: 'id' })
      }

      if (!db.objectStoreNames.contains('sync-queue')) {
        const syncStore = db.createObjectStore('sync-queue', { keyPath: 'id' })
        syncStore.createIndex('timestamp', 'timestamp', { unique: false })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// ─── Transactions ──────────────────────────────────────────────────

export async function saveTransactions(transactions: unknown[]): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction('transactions', 'readwrite')
    const store = tx.objectStore('transactions')

    for (const item of transactions) {
      store.put(item)
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    // Silently fail - offline storage is best-effort
  }
}

export async function getTransactions(): Promise<unknown[]> {
  try {
    const db = await openDB()
    const tx = db.transaction('transactions', 'readonly')
    const store = tx.objectStore('transactions')
    const index = store.index('date')

    return new Promise((resolve, reject) => {
      const request = index.openCursor(null, 'prev')
      const results: unknown[] = []

      request.onsuccess = () => {
        const cursor = request.result
        if (cursor && results.length < 200) {
          results.push(cursor.value)
          cursor.continue()
        } else {
          resolve(results)
        }
      }
      request.onerror = () => reject(request.error)
    })
  } catch {
    return []
  }
}

// ─── Categories ────────────────────────────────────────────────────

export async function saveCategories(categories: unknown[]): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction('categories', 'readwrite')
    const store = tx.objectStore('categories')

    // Clear and re-add all
    store.clear()
    for (const item of categories) {
      store.put(item)
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    // Silently fail
  }
}

export async function getCategories(): Promise<unknown[]> {
  try {
    const db = await openDB()
    const tx = db.transaction('categories', 'readonly')
    const store = tx.objectStore('categories')

    return new Promise((resolve, reject) => {
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  } catch {
    return []
  }
}

// ─── Sync Queue ────────────────────────────────────────────────────

export async function addToSyncQueue(entry: Omit<SyncQueueEntry, 'id'>): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction('sync-queue', 'readwrite')
    const store = tx.objectStore('sync-queue')

    store.put({ ...entry, id: `${Date.now()}-${Math.random().toString(36).slice(2)}` })

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    // Silently fail
  }
}

export async function getSyncQueue(): Promise<SyncQueueEntry[]> {
  try {
    const db = await openDB()
    const tx = db.transaction('sync-queue', 'readonly')
    const store = tx.objectStore('sync-queue')
    const index = store.index('timestamp')

    return new Promise((resolve, reject) => {
      const request = index.getAll()
      request.onsuccess = () => resolve(request.result as SyncQueueEntry[])
      request.onerror = () => reject(request.error)
    })
  } catch {
    return []
  }
}

export async function clearSyncQueue(): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction('sync-queue', 'readwrite')
    const store = tx.objectStore('sync-queue')
    store.clear()

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    // Silently fail
  }
}

export async function removeSyncQueueEntry(id: string): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction('sync-queue', 'readwrite')
    const store = tx.objectStore('sync-queue')
    store.delete(id)

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    // Silently fail
  }
}

export type { SyncQueueEntry }
