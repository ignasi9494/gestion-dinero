'use client'

import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Repeat,
  Brain,
  Loader2,
} from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { usePredictions } from '@/lib/hooks/usePredictions'

export function PredictionsSection() {
  const { data, isLoading, error } = usePredictions()

  if (error) return null
  if (isLoading) {
    return (
      <div className="mt-6">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
            <Brain className="h-4 w-4 text-white" />
          </div>
          <h2 className="text-base font-bold text-foreground">Predicciones IA</h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Analizando datos...</span>
        </div>
      </div>
    )
  }

  if (!data) return null

  const { forecast, anomalies, recurring } = data
  const hasContent =
    forecast ||
    (anomalies?.anomalies && anomalies.anomalies.length > 0) ||
    (recurring?.recurring && recurring.recurring.length > 0)

  if (!hasContent) return null

  return (
    <div className="mt-6">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
          <Brain className="h-4 w-4 text-white" />
        </div>
        <h2 className="text-base font-bold text-foreground">Predicciones IA</h2>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {/* Forecast Card */}
        {forecast && forecast.avgMonthly > 0 && (
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
              {forecast.trend === 'up' ? (
                <TrendingUp className="h-4 w-4 text-danger" />
              ) : forecast.trend === 'down' ? (
                <TrendingDown className="h-4 w-4 text-success" />
              ) : (
                <Minus className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-sm font-semibold text-foreground">
                Prevision del mes
              </span>
            </div>

            <div className="mb-2">
              <span className="text-2xl font-bold tabular-nums text-foreground">
                {formatCurrency(-forecast.projectedTotal)}
              </span>
              <p className="text-xs text-muted-foreground mt-0.5">
                Proyectado al dia {forecast.daysInMonth}
              </p>
            </div>

            {/* Comparison bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Promedio mensual</span>
                <span className="font-medium text-foreground tabular-nums">
                  {formatCurrency(-forecast.avgMonthly)}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    forecast.trend === 'up' ? 'bg-danger' : forecast.trend === 'down' ? 'bg-success' : 'bg-primary'
                  )}
                  style={{
                    width: `${Math.min((forecast.projectedTotal / forecast.avgMonthly) * 100, 100)}%`,
                  }}
                />
              </div>
              <p
                className={cn(
                  'text-xs font-medium',
                  forecast.trend === 'up' ? 'text-danger' : forecast.trend === 'down' ? 'text-success' : 'text-muted-foreground'
                )}
              >
                {forecast.trend === 'up'
                  ? `+${Math.round((forecast.projectedTotal / forecast.avgMonthly - 1) * 100)}% vs promedio`
                  : forecast.trend === 'down'
                    ? `-${Math.round((1 - forecast.projectedTotal / forecast.avgMonthly) * 100)}% vs promedio`
                    : 'Dentro del promedio'}
              </p>
            </div>
          </div>
        )}

        {/* Anomaly Alerts */}
        {anomalies?.anomalies && anomalies.anomalies.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-semibold text-foreground">
                Gastos inusuales
              </span>
            </div>

            <div className="space-y-2.5">
              {anomalies.anomalies.slice(0, 3).map((anomaly, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div
                    className="mt-0.5 h-2.5 w-2.5 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: anomaly.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground">
                      {anomaly.categoryName}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatCurrency(-anomaly.amount)} vs {formatCurrency(-anomaly.avgAmount)} habitual
                    </p>
                  </div>
                  <span className="flex-shrink-0 rounded-full bg-amber-200 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                    +{Math.round((anomaly.ratio - 1) * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recurring Payments */}
        {recurring?.recurring && recurring.recurring.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Repeat className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">
                Pagos recurrentes
              </span>
            </div>

            <div className="space-y-2">
              {recurring.recurring.slice(0, 5).map((item, i) => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-xs text-foreground">
                    {item.concept}
                  </span>
                  <span className="flex-shrink-0 text-xs font-semibold tabular-nums text-foreground">
                    {formatCurrency(-item.avgAmount)}
                  </span>
                </div>
              ))}
            </div>

            {recurring.recurring.length > 5 && (
              <p className="mt-2 text-center text-[11px] text-muted-foreground">
                +{recurring.recurring.length - 5} mas detectados
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
