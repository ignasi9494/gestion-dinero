'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { SavingsGoal, SavingsGoalInsert } from '@/lib/supabase/types'

export const goalKeys = {
  all: ['savings-goals'] as const,
  list: () => [...goalKeys.all, 'list'] as const,
  streak: () => [...goalKeys.all, 'streak'] as const,
}

// ─── Fetch goals ──────────────────────────────────────────────────

export function useSavingsGoals() {
  const supabase = createClient()

  return useQuery<SavingsGoal[]>({
    queryKey: goalKeys.list(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('savings_goals')
        .select('*')
        .order('is_completed', { ascending: true })
        .order('created_at', { ascending: false })

      if (error) throw error
      return data ?? []
    },
  })
}

// ─── Create goal ──────────────────────────────────────────────────

export function useCreateGoal() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (goal: Omit<SavingsGoalInsert, 'user_id'>) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('savings_goals')
        .insert({ ...goal, user_id: user.id })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalKeys.all })
    },
  })
}

// ─── Update goal ──────────────────────────────────────────────────

export function useUpdateGoal() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string
      updates: Partial<SavingsGoal>
    }) => {
      const { data, error } = await supabase
        .from('savings_goals')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalKeys.all })
    },
  })
}

// ─── Delete goal ──────────────────────────────────────────────────

export function useDeleteGoal() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('savings_goals')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalKeys.all })
    },
  })
}

// ─── Add savings to goal ──────────────────────────────────────────

export function useAddSavings() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      goalId,
      amount,
    }: {
      goalId: string
      amount: number
    }) => {
      // Get current goal
      const { data: goal, error: fetchError } = await supabase
        .from('savings_goals')
        .select('*')
        .eq('id', goalId)
        .single()

      if (fetchError) throw fetchError

      const newAmount = (goal.current_amount || 0) + amount
      const isCompleted = newAmount >= goal.target_amount

      const updates: Record<string, unknown> = {
        current_amount: newAmount,
        updated_at: new Date().toISOString(),
      }

      if (isCompleted && !goal.is_completed) {
        updates.is_completed = true
        updates.completed_at = new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('savings_goals')
        .update(updates)
        .eq('id', goalId)
        .select()
        .single()

      if (error) throw error
      return { ...data, justCompleted: isCompleted && !goal.is_completed }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalKeys.all })
    },
  })
}

// ─── Savings streak ───────────────────────────────────────────────

export function useSavingsStreak() {
  const supabase = createClient()

  return useQuery({
    queryKey: goalKeys.streak(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('savings_streaks')
        .select('*')
        .maybeSingle()

      if (error) throw error
      return data
    },
  })
}
