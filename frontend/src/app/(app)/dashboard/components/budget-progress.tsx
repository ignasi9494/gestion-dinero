'use client'

import { useBudgetProgress } from '@/lib/hooks/useBudgets'
import { useCategories } from '@/lib/hooks/useCategories'
import { CategoryIcon } from '../../transactions/classification-modal'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Wallet } from 'lucide-react'

interface BudgetProgressProps {
  month: string // YYYY-MM format
}

export function BudgetProgress({ month }: BudgetProgressProps) {
  const { data: categories = [] } = useCategories()
  const { data: progress = [], isLoading } = useBudgetProgress(month, categories)

  if (isLoading || progress.length === 0) return null

  return (
    <div className="mb-6">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
          <Wallet className="h-4 w-4 text-primary" />
        </div>
        <h2 className="text-base font-bold text-foreground">Presupuestos</h2>
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {progress.map((item) => {
          const color = item.categoryColor || '#6366f1'
          const barColor =
            item.percentage > 100
              ? 'bg-danger'
              : item.percentage > 75
                ? 'bg-warning'
                : 'bg-success'

          return (
            <div
              key={item.budgetId}
              className="rounded-xl border border-border bg-card p-3"
            >
              <div className="flex items-center gap-2.5 mb-2">
                <div
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${color}20`, color }}
                >
                  <CategoryIcon iconName={item.categoryIcon} className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {item.categoryName}
                  </p>
                </div>
                <span
                  className={cn(
                    'text-xs font-bold tabular-nums',
                    item.isOverBudget ? 'text-danger' : 'text-muted-foreground'
                  )}
                >
                  {Math.round(item.percentage)}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn('h-full rounded-full transition-all duration-500', barColor)}
                  style={{ width: `${Math.min(item.percentage, 100)}%` }}
                />
              </div>

              <div className="mt-1.5 flex items-center justify-between">
                <span className="text-xs text-muted-foreground tabular-nums">
                  {formatCurrency(-item.spent)}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  / {formatCurrency(-item.limit)}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
