'use client'

import { useState } from 'react'
import { Wallet, Plus, Trash2, Loader2 } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { useCategories } from '@/lib/hooks/useCategories'
import { useBudgets, useCreateBudget, useDeleteBudget } from '@/lib/hooks/useBudgets'
import { CategoryIcon } from '../../transactions/classification-modal'

export function BudgetManager() {
  const { data: categories = [] } = useCategories()
  const { data: budgets = [], isLoading } = useBudgets()
  const createBudget = useCreateBudget()
  const deleteBudget = useDeleteBudget()

  const [showAdd, setShowAdd] = useState(false)
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [amount, setAmount] = useState('')

  // Only show expense categories that don't already have a budget
  const budgetedCategoryIds = new Set(budgets.map((b) => b.category_id))
  const availableCategories = categories.filter(
    (c) => c.type === 'expense' && !budgetedCategoryIds.has(c.id)
  )

  const categoryMap = new Map(categories.map((c) => [c.id, c]))

  const handleAdd = async () => {
    if (!selectedCategoryId || !amount) return
    const val = parseFloat(amount)
    if (isNaN(val) || val <= 0) return

    await createBudget.mutateAsync({
      categoryId: selectedCategoryId,
      monthlyLimit: val,
    })

    setSelectedCategoryId('')
    setAmount('')
    setShowAdd(false)
  }

  const handleDelete = async (id: string) => {
    await deleteBudget.mutateAsync(id)
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <Wallet className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Presupuestos mensuales</h3>
            <p className="text-xs text-muted-foreground">Limites de gasto por categoria</p>
          </div>
        </div>
        {availableCategories.length > 0 && (
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
          >
            <Plus className="h-3.5 w-3.5" />
            Anadir
          </button>
        )}
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="mb-4 rounded-xl border border-primary/20 bg-accent/50 p-3 space-y-3">
          <select
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            className="h-9 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:border-primary focus:outline-none"
          >
            <option value="">Seleccionar categoria...</option>
            {availableCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Limite mensual (EUR)"
              step="10"
              min="1"
              className="h-9 flex-1 rounded-lg border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
            <button
              onClick={handleAdd}
              disabled={!selectedCategoryId || !amount || createBudget.isPending}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all',
                selectedCategoryId && amount
                  ? 'gradient-primary hover:shadow-md'
                  : 'cursor-not-allowed bg-muted text-muted-foreground'
              )}
            >
              {createBudget.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Guardar'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Budget list */}
      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : budgets.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          No tienes presupuestos configurados.
        </p>
      ) : (
        <div className="space-y-2">
          {budgets.map((budget) => {
            const cat = categoryMap.get(budget.category_id)
            const color = cat?.color || '#6366f1'

            return (
              <div
                key={budget.id}
                className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5"
              >
                <div
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${color}20`, color }}
                >
                  <CategoryIcon iconName={cat?.icon ?? null} className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {cat?.name ?? 'Desconocida'}
                  </p>
                </div>
                <span className="text-sm font-semibold text-foreground tabular-nums">
                  {formatCurrency(-budget.monthly_limit)}/mes
                </span>
                <button
                  onClick={() => handleDelete(budget.id)}
                  disabled={deleteBudget.isPending}
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
