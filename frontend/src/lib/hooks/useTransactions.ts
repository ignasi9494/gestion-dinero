'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Transaction, TransactionUpdate } from '@/lib/supabase/types'

// ─── Filters ───────────────────────────────────────────────────────

export interface TransactionFilters {
  dateFrom?: string
  dateTo?: string
  categoryId?: string | null
  search?: string
  classificationSource?: Transaction['classification_source'] | 'all'
  isExcluded?: boolean
  page?: number
  pageSize?: number
}

interface TransactionsPage {
  data: Transaction[]
  count: number
  page: number
  pageSize: number
  totalPages: number
}

// ─── Query keys ────────────────────────────────────────────────────

export const transactionKeys = {
  all: ['transactions'] as const,
  lists: () => [...transactionKeys.all, 'list'] as const,
  list: (filters: TransactionFilters) => [...transactionKeys.lists(), filters] as const,
  unclassifiedCount: () => [...transactionKeys.all, 'unclassified-count'] as const,
}

// ─── Fetch paginated transactions ──────────────────────────────────

export function useTransactions(filters: TransactionFilters = {}) {
  const supabase = createClient()
  const {
    dateFrom,
    dateTo,
    categoryId,
    search,
    classificationSource = 'all',
    isExcluded,
    page = 1,
    pageSize = 50,
  } = filters

  return useQuery<TransactionsPage>({
    queryKey: transactionKeys.list(filters),
    queryFn: async () => {
      let query = supabase
        .from('transactions')
        .select('*', { count: 'exact' })
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })

      if (dateFrom) {
        query = query.gte('date', dateFrom)
      }
      if (dateTo) {
        query = query.lte('date', dateTo)
      }
      if (categoryId === null) {
        // Explicitly filter for unclassified (null category)
        query = query.is('category_id', null)
      } else if (categoryId) {
        query = query.eq('category_id', categoryId)
      }
      if (search) {
        query = query.ilike('concept', `%${search}%`)
      }
      if (classificationSource !== 'all') {
        query = query.eq('classification_source', classificationSource)
      }
      if (isExcluded !== undefined) {
        query = query.eq('is_excluded', isExcluded)
      }

      // Pagination
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1
      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) throw error

      return {
        data: data ?? [],
        count: count ?? 0,
        page,
        pageSize,
        totalPages: Math.ceil((count ?? 0) / pageSize),
      }
    },
  })
}

// ─── Unclassified count ────────────────────────────────────────────

export function useUnclassifiedCount() {
  const supabase = createClient()

  return useQuery<number>({
    queryKey: transactionKeys.unclassifiedCount(),
    queryFn: async () => {
      const { count, error } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('classification_source', 'unclassified')

      if (error) throw error
      return count ?? 0
    },
  })
}

// ─── Update a single transaction's category ────────────────────────

export function useUpdateTransactionCategory() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      transactionId,
      categoryId,
      classificationSource = 'manual' as const,
    }: {
      transactionId: string
      categoryId: string | null
      classificationSource?: Transaction['classification_source']
    }) => {
      const update: TransactionUpdate = {
        category_id: categoryId,
        classification_source: categoryId ? classificationSource : 'unclassified',
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await supabase
        .from('transactions')
        .update(update)
        .eq('id', transactionId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all })
    },
  })
}

// ─── Bulk update categories ────────────────────────────────────────

export function useBulkUpdateCategory() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      transactionIds,
      categoryId,
      classificationSource = 'manual' as const,
    }: {
      transactionIds: string[]
      categoryId: string
      classificationSource?: Transaction['classification_source']
    }) => {
      const update: TransactionUpdate = {
        category_id: categoryId,
        classification_source: classificationSource,
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await supabase
        .from('transactions')
        .update(update)
        .in('id', transactionIds)
        .select()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all })
    },
  })
}

// ─── Update transaction notes / exclusion ──────────────────────────

export function useUpdateTransaction() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string
      updates: TransactionUpdate
    }) => {
      const { data, error } = await supabase
        .from('transactions')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all })
    },
  })
}
