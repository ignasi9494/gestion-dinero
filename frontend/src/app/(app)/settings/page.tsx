'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  User,
  Mail,
  Save,
  LogOut,
  Loader2,
  FileDown,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  Info,
  Database,
} from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { useAuth } from '@/lib/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import type { Import, Profile } from '@/lib/supabase/types'

// ─── Main Page ───────────────────────────────────────────────────────

export default function SettingsPage() {
  const { user, loading: authLoading, logout } = useAuth()

  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Ajustes</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Configura tu cuenta y preferencias
        </p>
      </div>

      {/* Profile Section */}
      <ProfileSection userId={user?.id ?? null} email={user?.email ?? null} />

      {/* Data Management Section */}
      <DataManagementSection />

      {/* Account Section */}
      <section className="overflow-hidden rounded-xl bg-white shadow-sm dark:bg-gray-800/60">
        <div className="border-b border-gray-100 px-5 py-3 dark:border-gray-700/50">
          <h2 className="text-sm font-semibold text-foreground">Cuenta</h2>
        </div>
        <div className="px-5 py-4">
          <button
            onClick={logout}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesion
          </button>
        </div>
      </section>

      {/* About Section */}
      <section className="overflow-hidden rounded-xl bg-white shadow-sm dark:bg-gray-800/60">
        <div className="border-b border-gray-100 px-5 py-3 dark:border-gray-700/50">
          <h2 className="text-sm font-semibold text-foreground">Acerca de</h2>
        </div>
        <div className="px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-900/30">
              <Info className="h-5 w-5 text-indigo-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                GestionDinero
              </p>
              <p className="text-xs text-muted-foreground">
                Gestion de gastos familiares
              </p>
            </div>
            <span className="ml-auto rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-400">
              v1.0.0
            </span>
          </div>
        </div>
      </section>

      {/* Bottom spacing for mobile nav */}
      <div className="h-4" />
    </div>
  )
}

// ─── Profile Section ─────────────────────────────────────────────────

function ProfileSection({
  userId,
  email,
}: {
  userId: string | null
  email: string | null | undefined
}) {
  const supabase = createClient()

  const { data: profile, isLoading: profileLoading } = useQuery<Profile | null>({
    queryKey: ['profile', userId],
    queryFn: async () => {
      if (!userId) return null
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!userId,
  })

  const [displayName, setDisplayName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Sync profile data into local state
  useEffect(() => {
    if (profile?.display_name) {
      setDisplayName(profile.display_name)
    }
  }, [profile?.display_name])

  const handleSaveProfile = async () => {
    if (!userId) return
    setSaving(true)
    setSaveSuccess(false)

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)

      if (error) throw error
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch {
      // Silently handle - could add toast here
    } finally {
      setSaving(false)
    }
  }

  const hasChanges = displayName !== (profile?.display_name ?? '')

  return (
    <section className="overflow-hidden rounded-xl bg-white shadow-sm dark:bg-gray-800/60">
      <div className="border-b border-gray-100 px-5 py-3 dark:border-gray-700/50">
        <h2 className="text-sm font-semibold text-foreground">Perfil de usuario</h2>
      </div>
      <div className="space-y-4 px-5 py-4">
        {profileLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
          </div>
        ) : (
          <>
            {/* Display Name */}
            <div>
              <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-foreground">
                <User className="h-4 w-4 text-gray-400" />
                Nombre
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Tu nombre"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-foreground placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-700 dark:placeholder:text-gray-500"
              />
            </div>

            {/* Email (read-only) */}
            <div>
              <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-foreground">
                <Mail className="h-4 w-4 text-gray-400" />
                Email
              </label>
              <div className="flex items-center rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-500 dark:border-gray-600 dark:bg-gray-700/50 dark:text-gray-400">
                {email ?? '---'}
              </div>
            </div>

            {/* Save button */}
            <button
              onClick={handleSaveProfile}
              disabled={!hasChanges || saving}
              className={cn(
                'flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all',
                hasChanges && !saving
                  ? 'bg-indigo-600 text-white shadow-sm hover:bg-indigo-700'
                  : saveSuccess
                    ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'
                    : 'cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
              )}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : saveSuccess ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? 'Guardando...' : saveSuccess ? 'Guardado' : 'Guardar'}
            </button>
          </>
        )}
      </div>
    </section>
  )
}

// ─── Data Management Section ─────────────────────────────────────────

function DataManagementSection() {
  const supabase = createClient()

  const { data: imports = [], isLoading: importsLoading } = useQuery<Import[]>({
    queryKey: ['imports', 'recent'],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return []

      const { data, error } = await supabase
        .from('imports')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error
      return data ?? []
    },
  })

  const statusIcon = (status: Import['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'processing':
        return <Clock className="h-4 w-4 text-amber-500" />
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />
    }
  }

  const statusLabel = (status: Import['status']) => {
    switch (status) {
      case 'completed':
        return 'Completado'
      case 'processing':
        return 'Procesando'
      case 'failed':
        return 'Error'
    }
  }

  return (
    <section className="overflow-hidden rounded-xl bg-white shadow-sm dark:bg-gray-800/60">
      <div className="border-b border-gray-100 px-5 py-3 dark:border-gray-700/50">
        <h2 className="text-sm font-semibold text-foreground">
          Gestion de datos
        </h2>
      </div>
      <div className="px-5 py-4">
        {/* Import history */}
        <div className="mb-4">
          <div className="mb-2 flex items-center gap-2">
            <Database className="h-4 w-4 text-gray-400" />
            <h3 className="text-sm font-medium text-foreground">
              Historial de importaciones
            </h3>
          </div>

          {importsLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
            </div>
          ) : imports.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-gray-200 py-6 dark:border-gray-700">
              <FileText className="h-6 w-6 text-gray-300 dark:text-gray-600" />
              <p className="text-xs text-muted-foreground">
                No hay importaciones todavia
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {imports.map((imp) => (
                <div
                  key={imp.id}
                  className="flex items-start gap-3 rounded-xl bg-gray-50 px-3.5 py-3 dark:bg-gray-800/40"
                >
                  <div className="mt-0.5 flex-shrink-0">{statusIcon(imp.status)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-foreground">
                        {imp.filename}
                      </span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      <span>{formatDate(imp.created_at)}</span>
                      <span>{statusLabel(imp.status)}</span>
                    </div>
                    {imp.status === 'completed' && (
                      <div className="mt-1 flex items-center gap-3 text-xs">
                        <span className="text-green-600 dark:text-green-400">
                          {imp.new_rows} nuevas
                        </span>
                        <span className="text-gray-400">
                          {imp.duplicate_rows} duplicadas
                        </span>
                        {imp.auto_classified > 0 && (
                          <span className="text-indigo-500">
                            {imp.auto_classified} auto-clasificadas
                          </span>
                        )}
                      </div>
                    )}
                    {imp.status === 'failed' && imp.error_message && (
                      <p className="mt-1 text-xs text-red-500">
                        {imp.error_message}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Export button */}
        <div className="relative">
          <button
            disabled
            className="group flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-400 transition-colors dark:border-gray-600 dark:text-gray-500"
            title="Proximamente"
          >
            <FileDown className="h-4 w-4" />
            Exportar datos
            <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-400 dark:bg-gray-700 dark:text-gray-500">
              Proximamente
            </span>
          </button>
        </div>
      </div>
    </section>
  )
}
