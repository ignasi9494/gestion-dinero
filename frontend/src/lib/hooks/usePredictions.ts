'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────

export interface ForecastData {
  projectedTotal: number
  avgMonthly: number
  trend: 'up' | 'down' | 'stable'
  daysElapsed: number
  daysInMonth: number
  spentSoFar: number
  byCategory: {
    categoryId: string
    categoryName: string
    projected: number
    average: number
    color: string
  }[]
}

export interface AnomalyData {
  anomalies: {
    type: 'category' | 'transaction'
    categoryName: string
    description: string
    amount: number
    avgAmount: number
    ratio: number
    color: string
  }[]
}

export interface RecurringData {
  recurring: {
    concept: string
    avgAmount: number
    frequency: 'monthly'
    occurrences: number
    months: string[]
  }[]
}

export interface PredictionsResult {
  forecast?: ForecastData
  anomalies?: AnomalyData
  recurring?: RecurringData
}

// ─── Query keys ────────────────────────────────────────────────────

export const predictionKeys = {
  all: ['predictions'] as const,
  predictions: () => [...predictionKeys.all, 'all'] as const,
}

// ─── Fetch all predictions ─────────────────────────────────────────

export function usePredictions() {
  const supabase = createClient()

  return useQuery<PredictionsResult>({
    queryKey: predictionKeys.predictions(),
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/spending-predictions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
          },
          body: JSON.stringify({ type: 'all' }),
        }
      )

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to get predictions')
      }

      return response.json()
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
  })
}
