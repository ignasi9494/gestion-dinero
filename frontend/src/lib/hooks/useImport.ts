'use client'

import { useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { parseCaixaBankCSV, type RawTransaction } from '@/lib/classification/parser'
import {
  classifyTransaction,
  sortRulesByPriority,
  mapDatabaseRules,
  type ClassificationRule as EngineRule,
} from '@/lib/classification/engine'
import type { TransactionInsert, MonthlySummaryInsert } from '@/lib/supabase/types'
import { transactionKeys } from './useTransactions'
import { dashboardKeys } from './useDashboard'

// ─── Types ─────────────────────────────────────────────────────────

export interface ImportProgress {
  stage:
    | 'idle'
    | 'parsing'
    | 'loading-rules'
    | 'classifying'
    | 'inserting'
    | 'updating-summaries'
    | 'completed'
    | 'error'
  current: number
  total: number
  message: string
}

export interface ImportResult {
  totalRows: number
  newRows: number
  duplicateRows: number
  autoClassified: number
  unclassified: number
  parseErrors: string[]
  importId: string | null
}

// ─── Hook ──────────────────────────────────────────────────────────

export function useImport() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  const [progress, setProgress] = useState<ImportProgress>({
    stage: 'idle',
    current: 0,
    total: 0,
    message: '',
  })
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const reset = useCallback(() => {
    setProgress({ stage: 'idle', current: 0, total: 0, message: '' })
    setResult(null)
    setError(null)
  }, [])

  const importCSV = useCallback(
    async (file: File) => {
      reset()
      setError(null)

      try {
        // ── Get current user ──────────────────────────────────────
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) throw new Error('No autenticado')

        // ── 1. Parse CSV ──────────────────────────────────────────
        setProgress({
          stage: 'parsing',
          current: 0,
          total: 1,
          message: 'Leyendo archivo CSV...',
        })

        const fileContent = await file.text()
        const parseResult = parseCaixaBankCSV(fileContent)

        if (parseResult.transactions.length === 0) {
          setError(
            parseResult.errors.length > 0
              ? parseResult.errors.join('\n')
              : 'No se encontraron transacciones en el archivo'
          )
          setProgress({
            stage: 'error',
            current: 0,
            total: 0,
            message: 'Error al parsear el archivo',
          })
          return null
        }

        // ── 2. Create import record ───────────────────────────────
        const { data: importRecord, error: importError } = await supabase
          .from('imports')
          .insert({
            user_id: user.id,
            filename: file.name,
            total_rows: parseResult.totalRows,
            status: 'processing' as const,
          })
          .select()
          .single()

        if (importError) throw importError

        // ── 3. Load classification rules ──────────────────────────
        setProgress({
          stage: 'loading-rules',
          current: 0,
          total: 1,
          message: 'Cargando reglas de clasificacion...',
        })

        const { data: dbRules, error: rulesError } = await supabase
          .from('classification_rules')
          .select('*')
          .eq('user_id', user.id)
          .order('priority', { ascending: false })

        if (rulesError) throw rulesError

        const engineRules: EngineRule[] = sortRulesByPriority(
          mapDatabaseRules(dbRules ?? [])
        )

        // ── 4. Classify transactions (Rules + Lookup) ─────────────
        setProgress({
          stage: 'classifying',
          current: 0,
          total: parseResult.transactions.length,
          message: 'Clasificando transacciones...',
        })

        // Load concept_category_map for lookup fallback
        const { data: conceptMap } = await supabase
          .from('concept_category_map')
          .select('concept_normalized, category_id')
          .eq('user_id', user.id)

        const lookupMap = new Map<string, string>()
        if (conceptMap) {
          for (const m of conceptMap) {
            lookupMap.set(m.concept_normalized.toUpperCase(), m.category_id)
          }
        }

        let autoClassified = 0
        let unclassified = 0

        const transactionsToInsert: TransactionInsert[] =
          parseResult.transactions.map((tx: RawTransaction, index: number) => {
            // Layer 1: Rule-based classification
            const classification = classifyTransaction(
              tx.conceptNormalized,
              engineRules
            )

            let categoryId: string | null = classification?.categoryId ?? null
            let source: 'rule' | 'manual' | 'ai' | 'unclassified' = classification
              ? 'rule'
              : 'unclassified'

            // Layer 2: Lookup table fallback (if rules didn't match)
            if (!classification) {
              const lookupCategoryId = lookupMap.get(tx.conceptNormalized.toUpperCase())
              if (lookupCategoryId) {
                categoryId = lookupCategoryId
                source = 'ai' // classified via learned lookup
              }
            }

            if (categoryId) {
              autoClassified++
            } else {
              unclassified++
            }

            setProgress((prev) => ({
              ...prev,
              current: index + 1,
            }))

            return {
              user_id: user.id,
              import_id: importRecord.id,
              date: tx.date,
              concept: tx.concept,
              concept_normalized: tx.conceptNormalized,
              amount: tx.amount,
              balance: tx.balance,
              category_id: categoryId,
              classification_source: source,
            }
          })

        // ── 5. Insert transactions in batches ─────────────────────
        setProgress({
          stage: 'inserting',
          current: 0,
          total: transactionsToInsert.length,
          message: 'Guardando transacciones...',
        })

        const BATCH_SIZE = 100
        let newRows = 0
        let duplicateRows = 0

        for (let i = 0; i < transactionsToInsert.length; i += BATCH_SIZE) {
          const batch = transactionsToInsert.slice(i, i + BATCH_SIZE)

          // Use upsert with ignoreDuplicates to handle duplicates.
          // Duplicates are detected by the unique constraint on
          // (user_id, date, concept_normalized, amount).
          const { data: inserted, error: insertError } = await supabase
            .from('transactions')
            .upsert(batch, {
              onConflict: 'user_id,date,concept,amount,balance',
              ignoreDuplicates: true,
            })
            .select('id')

          if (insertError) throw insertError

          const insertedCount = inserted?.length ?? 0
          newRows += insertedCount
          duplicateRows += batch.length - insertedCount

          setProgress((prev) => ({
            ...prev,
            current: Math.min(i + BATCH_SIZE, transactionsToInsert.length),
          }))
        }

        // ── 6. Update monthly summaries for affected months ───────
        setProgress({
          stage: 'updating-summaries',
          current: 0,
          total: 1,
          message: 'Actualizando resumenes mensuales...',
        })

        // Collect unique months from imported transactions
        const affectedMonths = new Set<string>()
        for (const tx of parseResult.transactions) {
          const month = tx.date.substring(0, 7) // YYYY-MM
          affectedMonths.add(month)
        }

        for (const month of affectedMonths) {
          await recalculateMonthlySummary(supabase, user.id, `${month}-01`)
        }

        // ── 7. Update the import record ───────────────────────────
        // Recalculate autoClassified/unclassified based on actual new rows
        // proportionally if duplicates were removed
        const effectiveAutoClassified =
          transactionsToInsert.length > 0
            ? Math.round(
                (autoClassified / transactionsToInsert.length) * newRows
              )
            : 0
        const effectiveUnclassified = newRows - effectiveAutoClassified

        const { error: updateError } = await supabase
          .from('imports')
          .update({
            new_rows: newRows,
            duplicate_rows: duplicateRows,
            auto_classified: effectiveAutoClassified,
            unclassified: effectiveUnclassified,
            status: 'completed' as const,
          })
          .eq('id', importRecord.id)

        if (updateError) throw updateError

        // ── 8. Set final result ───────────────────────────────────
        const importResult: ImportResult = {
          totalRows: parseResult.totalRows,
          newRows,
          duplicateRows,
          autoClassified: effectiveAutoClassified,
          unclassified: effectiveUnclassified,
          parseErrors: parseResult.errors,
          importId: importRecord.id,
        }

        setResult(importResult)
        setProgress({
          stage: 'completed',
          current: 1,
          total: 1,
          message: 'Importacion completada',
        })

        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: transactionKeys.all })
        queryClient.invalidateQueries({ queryKey: dashboardKeys.all })

        return importResult
      } catch (err) {
        console.error('Import error:', err)
        const message =
          err instanceof Error ? err.message : 'Error desconocido en la importacion'
        setError(message)
        setProgress({
          stage: 'error',
          current: 0,
          total: 0,
          message,
        })
        return null
      }
    },
    [supabase, queryClient, reset]
  )

  return {
    importCSV,
    progress,
    result,
    error,
    reset,
    isImporting:
      progress.stage !== 'idle' &&
      progress.stage !== 'completed' &&
      progress.stage !== 'error',
  }
}

// ─── Helper: recalculate monthly summary ───────────────────────────

async function recalculateMonthlySummary(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  month: string // YYYY-MM-DD (first day of month)
) {
  const monthStart = month // already YYYY-MM-01
  const parts = month.split('-')
  const year = parseInt(parts[0])
  const mon = parseInt(parts[1])
  // Last day of the month
  const monthEndDate = new Date(year, mon, 0)
  const monthEnd = format(monthEndDate, 'yyyy-MM-dd')

  // Fetch all non-excluded transactions for this month
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('amount, category_id, categories(id, name)')
    .eq('user_id', userId)
    .gte('date', monthStart)
    .lte('date', monthEnd)
    .eq('is_excluded', false)

  if (error) throw error

  const txns = transactions ?? []

  let totalIncome = 0
  let totalExpenses = 0
  const categoryTotals = new Map<
    string,
    { category_id: string; category_name: string; amount: number }
  >()

  for (const tx of txns) {
    if (tx.amount > 0) {
      totalIncome += tx.amount
    } else {
      totalExpenses += tx.amount // negative
    }

    if (tx.category_id) {
      const cat = tx.categories as unknown as {
        id: string
        name: string
      } | null
      const existing = categoryTotals.get(tx.category_id)
      if (existing) {
        existing.amount += tx.amount
      } else {
        categoryTotals.set(tx.category_id, {
          category_id: tx.category_id,
          category_name: cat?.name ?? 'Sin categoria',
          amount: tx.amount,
        })
      }
    }
  }

  const totalSavings = totalIncome + totalExpenses // expenses are negative

  const categoryBreakdown = Array.from(categoryTotals.values())

  const summary: MonthlySummaryInsert = {
    user_id: userId,
    month,
    total_income: totalIncome,
    total_expenses: totalExpenses,
    total_savings: totalSavings,
    category_breakdown: categoryBreakdown as unknown as MonthlySummaryInsert['category_breakdown'],
    transaction_count: txns.length,
    updated_at: new Date().toISOString(),
  }

  // Upsert: insert or update if the month already exists
  const { error: upsertError } = await supabase
    .from('monthly_summaries')
    .upsert(summary, {
      onConflict: 'user_id,month',
    })

  if (upsertError) throw upsertError
}
