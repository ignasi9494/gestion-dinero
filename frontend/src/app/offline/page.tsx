'use client'

import { WifiOff, RefreshCw } from 'lucide-react'

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50 px-6">
      <div className="flex flex-col items-center text-center">
        {/* Icon */}
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-200">
          <WifiOff className="h-10 w-10 text-white" />
        </div>

        {/* Title */}
        <h1 className="mb-2 text-2xl font-bold text-slate-900">
          Sin conexion
        </h1>

        {/* Description */}
        <p className="mb-8 max-w-sm text-slate-500">
          No se ha podido conectar con el servidor. Comprueba tu conexion a internet e intentalo de nuevo.
        </p>

        {/* Retry button */}
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-200 transition-all hover:shadow-lg hover:shadow-indigo-300 active:scale-95"
        >
          <RefreshCw className="h-4 w-4" />
          Reintentar
        </button>

        {/* App branding */}
        <div className="mt-12 flex items-center gap-2 text-slate-400">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-xs font-bold text-white">
            GD
          </div>
          <span className="text-sm font-medium">GestionDinero</span>
        </div>
      </div>
    </div>
  )
}
