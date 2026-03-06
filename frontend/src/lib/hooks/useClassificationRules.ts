'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type {
  ClassificationRule,
  ClassificationRuleInsert,
  ClassificationRuleUpdate,
} from '@/lib/supabase/types'

// ─── Query keys ────────────────────────────────────────────────────

export const ruleKeys = {
  all: ['classification-rules'] as const,
  lists: () => [...ruleKeys.all, 'list'] as const,
  list: (filters?: { categoryId?: string }) =>
    [...ruleKeys.lists(), filters] as const,
}

// ─── Fetch all rules (ordered by priority DESC) ────────────────────

export function useClassificationRules(options?: { categoryId?: string }) {
  const supabase = createClient()
  const { categoryId } = options ?? {}

  return useQuery<ClassificationRule[]>({
    queryKey: ruleKeys.list({ categoryId }),
    queryFn: async () => {
      let query = supabase
        .from('classification_rules')
        .select('*')
        .order('priority', { ascending: false })

      if (categoryId) {
        query = query.eq('category_id', categoryId)
      }

      const { data, error } = await query

      if (error) throw error
      return data ?? []
    },
  })
}

// ─── Create a new rule ─────────────────────────────────────────────

export function useCreateRule() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (
      rule: Omit<ClassificationRuleInsert, 'user_id'>
    ) => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')

      const { data, error } = await supabase
        .from('classification_rules')
        .insert({ ...rule, user_id: user.id })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ruleKeys.all })
    },
  })
}

// ─── Update an existing rule ───────────────────────────────────────

export function useUpdateRule() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string
      updates: ClassificationRuleUpdate
    }) => {
      const { data, error } = await supabase
        .from('classification_rules')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ruleKeys.all })
    },
  })
}

// ─── Delete a rule ─────────────────────────────────────────────────

export function useDeleteRule() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('classification_rules')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ruleKeys.all })
    },
  })
}

// ─── Create rule and apply to matching unclassified transactions ───

export function useCreateRuleAndApply() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (
      rule: Omit<ClassificationRuleInsert, 'user_id'>
    ) => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')

      // 1. Create or update the rule (upsert to handle existing rules)
      const { data: newRule, error: ruleError } = await supabase
        .from('classification_rules')
        .upsert(
          { ...rule, user_id: user.id },
          { onConflict: 'user_id,pattern,match_type' }
        )
        .select()
        .single()

      if (ruleError) throw ruleError

      // 2. Find unclassified transactions matching this pattern
      let matchQuery = supabase
        .from('transactions')
        .select('id')
        .eq('user_id', user.id)
        .eq('classification_source', 'unclassified')

      switch (rule.match_type) {
        case 'exact':
          matchQuery = matchQuery.eq('concept_normalized', rule.pattern.toUpperCase())
          break
        case 'starts_with':
          matchQuery = matchQuery.ilike('concept_normalized', `${rule.pattern}%`)
          break
        case 'contains':
          matchQuery = matchQuery.ilike('concept_normalized', `%${rule.pattern}%`)
          break
        case 'regex':
          // Regex matching not natively supported in PostgREST filter;
          // for regex rules we skip auto-apply (the import flow handles it)
          return { rule: newRule, appliedCount: 0 }
      }

      const { data: matchingTxns, error: matchError } = await matchQuery

      if (matchError) throw matchError

      if (matchingTxns && matchingTxns.length > 0) {
        const ids = matchingTxns.map((t) => t.id)
        const { error: updateError } = await supabase
          .from('transactions')
          .update({
            category_id: rule.category_id,
            classification_source: 'rule' as const,
            updated_at: new Date().toISOString(),
          })
          .in('id', ids)

        if (updateError) throw updateError
      }

      return {
        rule: newRule,
        appliedCount: matchingTxns?.length ?? 0,
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ruleKeys.all })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
  })
}
