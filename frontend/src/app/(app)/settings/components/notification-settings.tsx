'use client'

import { useState } from 'react'
import {
  Bell,
  BellOff,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Send,
  Calendar,
  Clock,
  Shield,
  TrendingUp,
  Newspaper,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  isPushSupported,
  usePushSubscription,
  useSubscribePush,
  useUnsubscribePush,
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  useSendTestNotification,
} from '@/lib/hooks/usePushNotifications'

const DAY_NAMES = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miercoles',
  'Jueves',
  'Viernes',
  'Sabado',
]

export function NotificationSettings() {
  const { data: subscriptionStatus, isLoading: statusLoading } =
    usePushSubscription()
  const { data: preferences } = useNotificationPreferences()
  const subscribePush = useSubscribePush()
  const unsubscribePush = useUnsubscribePush()
  const updatePreferences = useUpdateNotificationPreferences()
  const sendTest = useSendTestNotification()
  const [testSent, setTestSent] = useState(false)

  const supported = isPushSupported()
  const subscribed = subscriptionStatus?.subscribed ?? false
  const permission = subscriptionStatus?.permission ?? 'default'

  const handleToggleSubscription = async () => {
    if (subscribed) {
      await unsubscribePush.mutateAsync()
    } else {
      await subscribePush.mutateAsync()
    }
  }

  const handleTestNotification = async () => {
    await sendTest.mutateAsync()
    setTestSent(true)
    setTimeout(() => setTestSent(false), 3000)
  }

  return (
    <section className="overflow-hidden rounded-xl bg-white shadow-sm dark:bg-gray-800/60">
      <div className="border-b border-gray-100 px-5 py-3 dark:border-gray-700/50">
        <h2 className="text-sm font-semibold text-foreground">
          Notificaciones
        </h2>
      </div>
      <div className="space-y-4 px-5 py-4">
        {/* Not supported warning */}
        {!supported && (
          <div className="flex items-center gap-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <p className="text-xs">
              Las notificaciones push no estan soportadas en este navegador.
              Prueba con Chrome, Edge o Firefox.
            </p>
          </div>
        )}

        {/* Permission denied warning */}
        {supported && permission === 'denied' && (
          <div className="flex items-center gap-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            <BellOff className="h-4 w-4 flex-shrink-0" />
            <p className="text-xs">
              Has bloqueado las notificaciones. Para habilitarlas, cambia los
              permisos del sitio en la configuracion de tu navegador.
            </p>
          </div>
        )}

        {/* Main toggle */}
        {supported && permission !== 'denied' && (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-xl',
                    subscribed ? 'bg-primary/10' : 'bg-muted'
                  )}
                >
                  {subscribed ? (
                    <Bell className="h-5 w-5 text-primary" />
                  ) : (
                    <BellOff className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Notificaciones push
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {subscribed
                      ? 'Recibiras notificaciones semanales'
                      : 'Activa para recibir resumen semanal'}
                  </p>
                </div>
              </div>

              <button
                onClick={handleToggleSubscription}
                disabled={
                  statusLoading ||
                  subscribePush.isPending ||
                  unsubscribePush.isPending
                }
                className={cn(
                  'relative h-7 w-12 rounded-full transition-colors duration-200',
                  subscribed ? 'bg-primary' : 'bg-muted-foreground/30'
                )}
              >
                {subscribePush.isPending || unsubscribePush.isPending ? (
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                  </div>
                ) : (
                  <div
                    className={cn(
                      'absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform duration-200',
                      subscribed ? 'translate-x-5.5 left-0' : 'left-0.5'
                    )}
                    style={{
                      transform: subscribed
                        ? 'translateX(22px)'
                        : 'translateX(0)',
                    }}
                  />
                )}
              </button>
            </div>

            {/* Preference toggles (only when subscribed) */}
            {subscribed && preferences && (
              <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
                {/* Weekly summary */}
                <ToggleRow
                  icon={<Newspaper className="h-4 w-4 text-blue-500" />}
                  label="Resumen semanal"
                  description="Analisis de tus gastos de la semana"
                  checked={preferences.weekly_summary ?? true}
                  onChange={(val) =>
                    updatePreferences.mutate({ weekly_summary: val })
                  }
                />

                {/* Budget alerts */}
                <ToggleRow
                  icon={<Shield className="h-4 w-4 text-amber-500" />}
                  label="Alertas de presupuesto"
                  description="Aviso al 80% y 100% del limite"
                  checked={preferences.budget_alerts ?? true}
                  onChange={(val) =>
                    updatePreferences.mutate({ budget_alerts: val })
                  }
                />

                {/* Anomaly alerts */}
                <ToggleRow
                  icon={<TrendingUp className="h-4 w-4 text-red-500" />}
                  label="Gastos inusuales"
                  description="Detecta gastos fuera de lo normal"
                  checked={preferences.anomaly_alerts ?? true}
                  onChange={(val) =>
                    updatePreferences.mutate({ anomaly_alerts: val })
                  }
                />

                {/* Preferred day & hour */}
                <div className="border-t border-border pt-3">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    Horario del resumen semanal
                  </p>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="mb-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Calendar className="h-3 w-3" /> Dia
                      </label>
                      <select
                        value={preferences.preferred_day ?? 1}
                        onChange={(e) =>
                          updatePreferences.mutate({
                            preferred_day: parseInt(e.target.value) as any,
                          })
                        }
                        className="h-9 w-full rounded-lg border border-border bg-card px-3 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        {DAY_NAMES.map((name, i) => (
                          <option key={i} value={i}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="mb-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Clock className="h-3 w-3" /> Hora
                      </label>
                      <select
                        value={preferences.preferred_hour ?? 9}
                        onChange={(e) =>
                          updatePreferences.mutate({
                            preferred_hour: parseInt(e.target.value) as any,
                          })
                        }
                        className="h-9 w-full rounded-lg border border-border bg-card px-3 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        {Array.from({ length: 24 }, (_, i) => (
                          <option key={i} value={i}>
                            {String(i).padStart(2, '0')}:00
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Test notification button */}
            {subscribed && (
              <button
                onClick={handleTestNotification}
                disabled={sendTest.isPending || testSent}
                className={cn(
                  'flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all',
                  testSent
                    ? 'border-success/30 bg-success/5 text-success'
                    : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {sendTest.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : testSent ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {sendTest.isPending
                  ? 'Enviando...'
                  : testSent
                    ? 'Notificacion enviada!'
                    : 'Enviar notificacion de prueba'}
              </button>
            )}
          </>
        )}
      </div>
    </section>
  )
}

// ─── Toggle Row ──────────────────────────────────────────────────

function ToggleRow({
  icon,
  label,
  description,
  checked,
  onChange,
}: {
  icon: React.ReactNode
  label: string
  description: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        {icon}
        <div>
          <p className="text-xs font-medium text-foreground">{label}</p>
          <p className="text-[11px] text-muted-foreground">{description}</p>
        </div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-6 w-10 rounded-full transition-colors duration-200',
          checked ? 'bg-primary' : 'bg-muted-foreground/30'
        )}
      >
        <div
          className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200"
          style={{
            transform: checked ? 'translateX(18px)' : 'translateX(2px)',
          }}
        />
      </button>
    </div>
  )
}
