'use client'

import { WifiOff, Loader2, CloudUpload } from 'lucide-react'
import { useOfflineStatus } from '@/lib/offline/use-offline'
import { cn } from '@/lib/utils'

export function OfflineIndicator() {
  const { isOnline, hasPendingSync, pendingSyncCount, isSyncing } = useOfflineStatus()

  if (isOnline && !hasPendingSync && !isSyncing) return null

  return (
    <div
      className={cn(
        'fixed left-0 right-0 top-0 z-[70] flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium transition-all md:left-64',
        !isOnline
          ? 'bg-amber-500 text-white'
          : isSyncing
            ? 'bg-blue-500 text-white'
            : 'bg-green-500 text-white'
      )}
    >
      {!isOnline ? (
        <>
          <WifiOff className="h-3.5 w-3.5" />
          Sin conexion - Modo offline
          {hasPendingSync && ` (${pendingSyncCount} cambios pendientes)`}
        </>
      ) : isSyncing ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Sincronizando {pendingSyncCount} cambio{pendingSyncCount !== 1 ? 's' : ''}...
        </>
      ) : hasPendingSync ? (
        <>
          <CloudUpload className="h-3.5 w-3.5" />
          {pendingSyncCount} cambio{pendingSyncCount !== 1 ? 's' : ''} por sincronizar
        </>
      ) : null}
    </div>
  )
}
