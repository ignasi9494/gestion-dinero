'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { endOfMonth, format, startOfMonth, parseISO } from 'date-fns'
import type { Budget, Category } from '@/lib/supabase/types'

// ─── Query keys ────────────────────────────────────────────────────

export const budgetKeys = {
  all: ['budgets'] as const,
  list: () => [...budgetKeys.all, 'list'] as const,
  progress: (month: string) => [...budgetKeys.all, 'progress', month] as const,
}

// ─── Fetch budgets ─────────────────────────────────────────────────

export function useBudgets() {
  const supabase = createClient()

  return useQuery<Budget[]>({
    queryKey: budgetKeys.list(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true })

      if (error) throw error
      return data ?? []
    },
  })
}

// ─── Budget progress for a month ──────────────────────────────────

export interface BudgetProgress {
  budgetId: string
  categoryId: string
  categoryName: string
  categoryIcon: string | null
  categoryColor: string | null
  limit: number
  spent: number
  percentage: number
  isOverBudget: boolean
}

export function useBudgetProgress(month: string, categories: Category[]) {
  const supabase = createClient()

  return useQuery<BudgetProgress[]>({
    queryKey: budgetKeys.progress(month),
    queryFn: async () => {
      // 1. Fetch active budgets
      const { data: budgets, error: budgetError } = await supabase
        .from('budgets')
        .select('*')
        .eq('is_active', true)

      if (budgetError) throw budgetError
      if (!budgets || budgets.length === 0) return []

      // 2. Fetch expense transactions for this month
      const monthDate = parseISO(month + '-01')
      const dateFrom = format(startOfMonth(monthDate), 'yyyy-MM-dd')
      const dateToVal = format(endOfMonth(monthDate), 'yyyy-MM-dd')

      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('category_id, amount')
        .gte('date', dateFrom)
        .lte('date', dateToVal)
        .lt('amount', 0)
        .eq('is_excluded', false)

      if (txError) throw txError

      // 3. Aggregate spending by category
      const spendingByCategory = new Map<string, number>()
      for (const tx of transactions ?? []) {
        if (tx.category_id) {
          const current = spendingByCategory.get(tx.category_id) || 0
          spendingByCategory.set(tx.category_id, current + Math.abs(tx.amount))
        }
      }

      // 4. Build progress data
      const categoryMap = new Map(categories.map((c) => [c.id, c]))

      return budgets.map((budget) => {
        const cat = categoryMap.get(budget.category_id)
        const spent = spendingByCategory.get(budget.category_id) || 0
        const percentage = budget.monthly_limit > 0
          ? (spent / budget.monthly_limit) * 100
          : 0

        return {
          budgetId: budget.id,
          categoryId: budget.category_id,
          categoryName: cat?.name ?? 'Desconocida',
          categoryIcon: cat?.icon ?? null,
          categoryColor: cat?.color ?? '#6366f1',
          limit: budget.monthly_limit,
          spent,
          percentage,
          isOverBudget: percentage > 100,
        }
      }).sort((a, b) => b.percentage - a.percentage) // Highest usage first
    },
    enabled: categories.length > 0,
  })
}

// ─── Create budget ─────────────────────────────────────────────────

export function useCreateBudget() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      categoryId,
      monthlyLimit,
    }: {
      categoryId: string
      monthlyLimit: number
    }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('budgets')
        .upsert(
          {
            user_id: user.id,
            category_id: categoryId,
            monthly_limit: monthlyLimit,
            is_active: true,
          },
          { onConflict: 'user_id,category_id' }
        )
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.all })
    },
  })
}

// ─── Update budget ─────────────────────────────────────────────────

export function useUpdateBudget() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      monthlyLimit,
      isActive,
    }: {
      id: string
      monthlyLimit?: number
      isActive?: boolean
    }) => {
      const updates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      }
      if (monthlyLimit !== undefined) updates.monthly_limit = monthlyLimit
      if (isActive !== undefined) updates.is_active = isActive

      const { data, error } = await supabase
        .from('budgets')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.all })
    },
  })
}

// ─── Delete budget ─────────────────────────────────────────────────

export function useDeleteBudget() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.all })
    },
  })
}
