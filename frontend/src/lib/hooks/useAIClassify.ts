'use client'

import { useState, useCallback } from 'react'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { transactionKeys } from './useTransactions'
import { dashboardKeys } from './useDashboard'
import { format } from 'date-fns'

// ─── Types ─────────────────────────────────────────────────────────

export interface AIClassifyProgress {
  stage: 'idle' | 'loading' | 'classifying' | 'applying' | 'updating-summaries' | 'completed' | 'error'
  current: number
  total: number
  message: string
}

export interface AIClassifyResult {
  totalProcessed: number
  fromLookup: number
  fromAI: number
  applied: number
  lowConfidence: number
  errors: string[]
}

// ─── Hook: AI Batch Classify ──────────────────────────────────────

export function useAIClassifyBatch() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  const [progress, setProgress] = useState<AIClassifyProgress>({
    stage: 'idle', current: 0, total: 0, message: '',
  })
  const [result, setResult] = useState<AIClassifyResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const reset = useCallback(() => {
    setProgress({ stage: 'idle', current: 0, total: 0, message: '' })
    setResult(null)
    setError(null)
  }, [])

  const classify = useCallback(async () => {
    reset()
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')

      // 1. Load unclassified transactions
      setProgress({ stage: 'loading', current: 0, total: 1, message: 'Cargando transacciones sin clasificar...' })

      const { data: unclassified, error: fetchErr } = await supabase
        .from('transactions')
        .select('id, concept_normalized, amount, date')
        .eq('user_id', user.id)
        .eq('classification_source', 'unclassified')
        .order('date', { ascending: false })

      if (fetchErr) throw fetchErr
      if (!unclassified || unclassified.length === 0) {
        setProgress({ stage: 'completed', current: 0, total: 0, message: 'No hay transacciones sin clasificar' })
        setResult({ totalProcessed: 0, fromLookup: 0, fromAI: 0, applied: 0, lowConfidence: 0, errors: [] })
        return
      }

      // Get unique concepts
      const uniqueConcepts = [...new Set(unclassified.map(t => t.concept_normalized))]

      setProgress({
        stage: 'classifying',
        current: 0,
        total: uniqueConcepts.length,
        message: `Clasificando ${uniqueConcepts.length} conceptos unicos con IA...`,
      })

      // 2. Get user's categories for mapping
      const { data: categories } = await supabase
        .from('categories')
        .select('id, name')
        .eq('user_id', user.id)
        .eq('is_active', true)

      const categoryNameToId = new Map(
        (categories || []).map(c => [c.name.toUpperCase(), c.id])
      )

      // 3. Call Edge Function in batches of 100 concepts
      const BATCH_SIZE = 100
      let totalFromLookup = 0
      let totalFromAI = 0
      const conceptToCategoryId = new Map<string, { categoryId: string; confidence: number }>()
      const errors: string[] = []

      const { data: { session } } = await supabase.auth.getSession()

      for (let i = 0; i < uniqueConcepts.length; i += BATCH_SIZE) {
        const batch = uniqueConcepts.slice(i, i + BATCH_SIZE)

        try {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/classify-transactions`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session?.access_token}`,
                'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
              },
              body: JSON.stringify({
                concepts: batch,
                userId: user.id,
              }),
            }
          )

          if (!response.ok) {
            const errText = await response.text()
            errors.push(`Batch ${i}: ${errText}`)
            continue
          }

          const data = await response.json()
          totalFromLookup += data.fromLookup || 0
          totalFromAI += data.fromAI || 0

          for (const r of data.results || []) {
            const catId = categoryNameToId.get(r.categoryName?.toUpperCase() || '')
            if (catId) {
              conceptToCategoryId.set(r.concept.toUpperCase(), {
                categoryId: catId,
                confidence: r.confidence || 0.5,
              })
            }
          }
        } catch (err) {
          errors.push(`Batch ${i}: ${err instanceof Error ? err.message : String(err)}`)
        }

        setProgress(prev => ({
          ...prev,
          current: Math.min(i + BATCH_SIZE, uniqueConcepts.length),
        }))
      }

      // 4. Apply classifications to transactions
      setProgress({
        stage: 'applying',
        current: 0,
        total: unclassified.length,
        message: 'Aplicando clasificaciones...',
      })

      let applied = 0
      let lowConfidence = 0
      const affectedMonths = new Set<string>()
      const TX_BATCH = 50

      for (let i = 0; i < unclassified.length; i += TX_BATCH) {
        const batch = unclassified.slice(i, i + TX_BATCH)

        for (const tx of batch) {
          const mapping = conceptToCategoryId.get(tx.concept_normalized.toUpperCase())
          if (mapping && mapping.confidence >= 0.5) {
            const { error: updateErr } = await supabase
              .from('transactions')
              .update({
                category_id: mapping.categoryId,
                classification_source: 'ai' as const,
              })
              .eq('id', tx.id)

            if (!updateErr) {
              applied++
              affectedMonths.add(tx.date.substring(0, 7))
            }
          } else if (mapping && mapping.confidence < 0.5) {
            lowConfidence++
          }
        }

        setProgress(prev => ({
          ...prev,
          current: Math.min(i + TX_BATCH, unclassified.length),
        }))
      }

      // 5. Update monthly summaries
      setProgress({
        stage: 'updating-summaries',
        current: 0,
        total: affectedMonths.size,
        message: 'Actualizando resumenes mensuales...',
      })

      // We just invalidate queries to let the dashboard refetch
      queryClient.invalidateQueries({ queryKey: transactionKeys.all })
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all })

      // 6. Done
      const finalResult: AIClassifyResult = {
        totalProcessed: uniqueConcepts.length,
        fromLookup: totalFromLookup,
        fromAI: totalFromAI,
        applied,
        lowConfidence,
        errors,
      }

      setResult(finalResult)
      setProgress({
        stage: 'completed',
        current: 1,
        total: 1,
        message: `Clasificacion completada: ${applied} transacciones clasificadas`,
      })

      return finalResult
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      setError(message)
      setProgress({ stage: 'error', current: 0, total: 0, message })
      return null
    }
  }, [supabase, queryClient, reset])

  return {
    classify,
    progress,
    result,
    error,
    reset,
    isClassifying: progress.stage !== 'idle' && progress.stage !== 'completed' && progress.stage !== 'error',
  }
}

// ─── Hook: AI Classify Stats ──────────────────────────────────────

export function useAIClassifyStats() {
  const supabase = createClient()

  return useQuery({
    queryKey: ['ai-classify-stats'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return { unclassifiedCount: 0, uniqueConcepts: 0, estimatedCost: 0 }

      // Count unclassified
      const { count: unclassifiedCount } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('classification_source', 'unclassified')

      // Count unique unclassified concepts
      const { data: uniqueData } = await supabase
        .from('transactions')
        .select('concept_normalized')
        .eq('user_id', user.id)
        .eq('classification_source', 'unclassified')

      const uniqueConcepts = new Set(uniqueData?.map(t => t.concept_normalized) || []).size

      // Estimate cost: ~$0.15/M input tokens, ~$0.60/M output
      // ~40 tokens per concept input, ~20 tokens output per concept
      const estimatedCost = (uniqueConcepts * 60 * 0.15 / 1_000_000) + (uniqueConcepts * 20 * 0.60 / 1_000_000)

      return {
        unclassifiedCount: unclassifiedCount || 0,
        uniqueConcepts,
        estimatedCost: Math.max(estimatedCost, 0.001),
      }
    },
    staleTime: 30000,
  })
}

// ─── Hook: Single AI Suggestion ──────────────────────────────────

export function useAISuggestion(conceptNormalized: string | null) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['ai-suggestion', conceptNormalized],
    queryFn: async () => {
      if (!conceptNormalized) return null

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      // First check the lookup table
      const { data: lookup } = await supabase
        .from('concept_category_map')
        .select('category_id, confidence, categories(name)')
        .eq('user_id', user.id)
        .eq('concept_normalized', conceptNormalized.toUpperCase())
        .single()

      if (lookup) {
        const cat = lookup.categories as unknown as { name: string } | null
        return {
          categoryId: lookup.category_id,
          categoryName: cat?.name || 'Unknown',
          confidence: lookup.confidence,
          source: 'lookup' as const,
        }
      }

      // If not in lookup, call Edge Function for single concept
      const { data: { session } } = await supabase.auth.getSession()

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/classify-transactions`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session?.access_token}`,
              'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
            },
            body: JSON.stringify({
              concepts: [conceptNormalized],
              userId: user.id,
            }),
          }
        )

        if (!response.ok) return null
        const data = await response.json()
        const result = data.results?.[0]

        if (result) {
          // Need to resolve category name to ID
          const { data: categories } = await supabase
            .from('categories')
            .select('id, name')
            .eq('user_id', user.id)
            .ilike('name', result.categoryName)
            .limit(1)
            .single()

          if (categories) {
            return {
              categoryId: categories.id,
              categoryName: categories.name,
              confidence: result.confidence,
              source: 'ai' as const,
            }
          }
        }
      } catch {
        // silently fail
      }

      return null
    },
    enabled: !!conceptNormalized,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })
}
