'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Category, CategoryInsert, CategoryUpdate } from '@/lib/supabase/types'

// ─── Query keys ────────────────────────────────────────────────────

export const categoryKeys = {
  all: ['categories'] as const,
  lists: () => [...categoryKeys.all, 'list'] as const,
  list: (filters?: { type?: Category['type']; activeOnly?: boolean }) =>
    [...categoryKeys.lists(), filters] as const,
  detail: (id: string) => [...categoryKeys.all, 'detail', id] as const,
}

// ─── Fetch all categories ──────────────────────────────────────────

export function useCategories(options?: {
  type?: Category['type']
  activeOnly?: boolean
}) {
  const supabase = createClient()
  const { type, activeOnly = true } = options ?? {}

  return useQuery<Category[]>({
    queryKey: categoryKeys.list({ type, activeOnly }),
    queryFn: async () => {
      let query = supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true })

      if (type) {
        query = query.eq('type', type)
      }
      if (activeOnly) {
        query = query.eq('is_active', true)
      }

      const { data, error } = await query

      if (error) throw error
      return data ?? []
    },
  })
}

// ─── Create category ───────────────────────────────────────────────

export function useCreateCategory() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (category: Omit<CategoryInsert, 'user_id'>) => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')

      const { data, error } = await supabase
        .from('categories')
        .insert({ ...category, user_id: user.id })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all })
    },
  })
}

// ─── Update category ───────────────────────────────────────────────

export function useUpdateCategory() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string
      updates: CategoryUpdate
    }) => {
      const { data, error } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all })
    },
  })
}

// ─── Delete (soft-deactivate) category ─────────────────────────────

export function useDeleteCategory() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      // Soft delete: set is_active = false
      const { data, error } = await supabase
        .from('categories')
        .update({ is_active: false })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all })
    },
  })
}

// ─── Reorder categories ────────────────────────────────────────────

export function useReorderCategories() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      // Update sort_order for each category based on position
      const updates = orderedIds.map((id, index) =>
        supabase
          .from('categories')
          .update({ sort_order: index })
          .eq('id', id)
      )

      const results = await Promise.all(updates)
      const firstError = results.find((r) => r.error)
      if (firstError?.error) throw firstError.error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all })
    },
  })
}
