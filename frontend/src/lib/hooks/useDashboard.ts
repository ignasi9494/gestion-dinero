'use client'

import { useQuery } from '@tanstack/react-query'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import type { MonthlySummary, Json } from '@/lib/supabase/types'

// ─── Query keys ────────────────────────────────────────────────────

export const dashboardKeys = {
  all: ['dashboard'] as const,
  monthlySummaries: (months: number) =>
    [...dashboardKeys.all, 'monthly-summaries', months] as const,
  kpis: (month: string) => [...dashboardKeys.all, 'kpis', month] as const,
  salary: (month: string) => [...dashboardKeys.all, 'salary', month] as const,
  balanceEvolution: (dateFrom: string, dateTo: string) =>
    [...dashboardKeys.all, 'balance-evolution', dateFrom, dateTo] as const,
}

// ─── Types ─────────────────────────────────────────────────────────

export interface MonthlyChartData {
  month: string       // YYYY-MM
  monthLabel: string  // e.g. "ene 2026"
  income: number
  expenses: number
  savings: number
}

export interface KPIs {
  totalIncome: number
  totalExpenses: number
  totalSavings: number
  savingsRate: number  // percentage 0-100
  transactionCount: number
  avgExpensePerDay: number
  topExpenseCategory: { name: string; amount: number } | null
  vsLastMonth: {
    incomeChange: number    // percentage
    expenseChange: number   // percentage
    savingsChange: number   // percentage
  }
}

interface CategoryBreakdownItem {
  category_id: string
  category_name: string
  amount: number
}

export interface BalancePoint {
  date: string
  balance: number
}

// ─── Monthly summaries for charts ──────────────────────────────────

export function useMonthlySummaries(months: number = 12) {
  const supabase = createClient()

  return useQuery<MonthlyChartData[]>({
    queryKey: dashboardKeys.monthlySummaries(months),
    queryFn: async () => {
      const cutoffDate = format(subMonths(new Date(), months), 'yyyy-MM-dd')

      const { data, error } = await supabase
        .from('monthly_summaries')
        .select('*')
        .gte('month', cutoffDate)
        .order('month', { ascending: true })

      if (error) throw error

      return (data ?? []).map((row: MonthlySummary) => {
        // month is stored as DATE 'YYYY-MM-DD' (first day)
        const monthStr = typeof row.month === 'string' ? row.month : String(row.month)
        const parts = monthStr.split('-')
        const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1)
        const monthLabel = format(dateObj, 'MMM yyyy')

        return {
          month: monthStr.substring(0, 7), // YYYY-MM for display
          monthLabel,
          income: row.total_income,
          expenses: Math.abs(row.total_expenses),
          savings: row.total_savings,
        }
      })
    },
  })
}

// ─── KPIs for a specific month ─────────────────────────────────────

export function useKPIs(month?: string) {
  const supabase = createClient()
  // month param is YYYY-MM, but DB stores as DATE YYYY-MM-01
  const targetMonth = month ?? format(new Date(), 'yyyy-MM')
  const targetMonthDate = `${targetMonth}-01`
  const previousMonth = format(subMonths(new Date(targetMonthDate), 1), 'yyyy-MM')
  const previousMonthDate = `${previousMonth}-01`

  return useQuery<KPIs>({
    queryKey: dashboardKeys.kpis(targetMonth),
    queryFn: async () => {
      // Fetch current month and previous month summaries in parallel
      const [currentResult, previousResult] = await Promise.all([
        supabase
          .from('monthly_summaries')
          .select('*')
          .eq('month', targetMonthDate)
          .maybeSingle(),
        supabase
          .from('monthly_summaries')
          .select('*')
          .eq('month', previousMonthDate)
          .maybeSingle(),
      ])

      if (currentResult.error) throw currentResult.error
      if (previousResult.error) throw previousResult.error

      const current = currentResult.data
      const previous = previousResult.data

      const totalIncome = current?.total_income ?? 0
      const totalExpenses = Math.abs(current?.total_expenses ?? 0)
      const totalSavings = current?.total_savings ?? 0
      const transactionCount = current?.transaction_count ?? 0

      // Calculate days in the month for avg expense
      const monthStart = startOfMonth(new Date(targetMonth + '-01'))
      const monthEnd = endOfMonth(monthStart)
      const daysInMonth = monthEnd.getDate()
      const avgExpensePerDay = daysInMonth > 0 ? totalExpenses / daysInMonth : 0

      // Savings rate
      const savingsRate = totalIncome > 0 ? (totalSavings / totalIncome) * 100 : 0

      // Top expense category from breakdown
      let topExpenseCategory: KPIs['topExpenseCategory'] = null
      if (current?.category_breakdown) {
        const breakdown = current.category_breakdown as unknown as CategoryBreakdownItem[]
        if (Array.isArray(breakdown) && breakdown.length > 0) {
          const sorted = [...breakdown].sort(
            (a, b) => Math.abs(b.amount) - Math.abs(a.amount)
          )
          const top = sorted[0]
          topExpenseCategory = {
            name: top.category_name,
            amount: Math.abs(top.amount),
          }
        }
      }

      // Percentage changes vs last month
      const prevIncome = previous?.total_income ?? 0
      const prevExpenses = Math.abs(previous?.total_expenses ?? 0)
      const prevSavings = previous?.total_savings ?? 0

      const pctChange = (current: number, prev: number) => {
        if (prev === 0) return current > 0 ? 100 : 0
        return ((current - prev) / Math.abs(prev)) * 100
      }

      return {
        totalIncome,
        totalExpenses,
        totalSavings,
        savingsRate,
        transactionCount,
        avgExpensePerDay,
        topExpenseCategory,
        vsLastMonth: {
          incomeChange: pctChange(totalIncome, prevIncome),
          expenseChange: pctChange(totalExpenses, prevExpenses),
          savingsChange: pctChange(totalSavings, prevSavings),
        },
      }
    },
  })
}

// ─── Salary data for the current/selected month ────────────────────

export interface SalaryData {
  amount: number
  date: string
  concept: string
}

export function useSalary(month?: string) {
  const supabase = createClient()
  const targetMonth = month ?? format(new Date(), 'yyyy-MM')

  return useQuery<SalaryData | null>({
    queryKey: dashboardKeys.salary(targetMonth),
    queryFn: async () => {
      // Look for income transactions that look like salary
      // Common patterns: NOMINA, TRANSFERENCIA NOMINA, salary-related keywords
      const monthStart = `${targetMonth}-01`
      const monthEnd = format(endOfMonth(new Date(monthStart)), 'yyyy-MM-dd')

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .gte('date', monthStart)
        .lte('date', monthEnd)
        .gt('amount', 0)
        .or(
          'concept_normalized.ilike.%NOMINA%,' +
          'concept_normalized.ilike.%SALARI%,' +
          'concept_normalized.ilike.%SUELDO%'
        )
        .order('amount', { ascending: false })
        .limit(1)

      if (error) throw error

      if (!data || data.length === 0) return null

      const tx = data[0]
      return {
        amount: tx.amount,
        date: tx.date,
        concept: tx.concept,
      }
    },
  })
}

// ─── Balance evolution over time ───────────────────────────────────

export function useBalanceEvolution(dateFrom?: string, dateTo?: string) {
  const supabase = createClient()
  const defaultFrom = format(subMonths(new Date(), 6), 'yyyy-MM-dd')
  const defaultTo = format(new Date(), 'yyyy-MM-dd')
  const from = dateFrom ?? defaultFrom
  const to = dateTo ?? defaultTo

  return useQuery<BalancePoint[]>({
    queryKey: dashboardKeys.balanceEvolution(from, to),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('date, balance')
        .gte('date', from)
        .lte('date', to)
        .not('balance', 'is', null)
        .order('date', { ascending: true })
        .order('created_at', { ascending: true })

      if (error) throw error
      if (!data || data.length === 0) return []

      // Group by date, taking the last balance entry for each day
      const balanceByDate = new Map<string, number>()
      for (const row of data) {
        if (row.balance !== null) {
          balanceByDate.set(row.date, row.balance)
        }
      }

      return Array.from(balanceByDate.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, balance]) => ({ date, balance }))
    },
  })
}

// ─── Category breakdown for a month (for pie/bar charts) ───────────

export interface CategoryExpense {
  categoryId: string
  categoryName: string
  color: string
  amount: number
  percentage: number
  transactionCount: number
}

export function useCategoryBreakdown(month?: string, rangeMonths: number = 1) {
  const supabase = createClient()
  const targetMonth = month ?? format(new Date(), 'yyyy-MM')

  // Calculate date range based on rangeMonths
  const targetDate = new Date(`${targetMonth}-01`)
  const rangeStartDate = rangeMonths > 1
    ? subMonths(targetDate, rangeMonths - 1)
    : targetDate

  const dateFrom = format(rangeStartDate, 'yyyy-MM-dd')
  const dateTo = format(endOfMonth(targetDate), 'yyyy-MM-dd')

  return useQuery<CategoryExpense[]>({
    queryKey: [...dashboardKeys.all, 'category-breakdown', targetMonth, rangeMonths],
    queryFn: async () => {
      // Fetch expense transactions with their categories for the date range
      const { data, error } = await supabase
        .from('transactions')
        .select('amount, category_id, categories(id, name, color)')
        .gte('date', dateFrom)
        .lte('date', dateTo)
        .lt('amount', 0) // expenses only
        .eq('is_excluded', false)
        .not('category_id', 'is', null)

      if (error) throw error
      if (!data || data.length === 0) return []

      // Aggregate by category
      const categoryMap = new Map<
        string,
        { name: string; color: string; amount: number; count: number }
      >()

      for (const tx of data) {
        const cat = tx.categories as unknown as {
          id: string
          name: string
          color: string | null
        } | null
        if (!cat) continue

        const existing = categoryMap.get(cat.id)
        if (existing) {
          existing.amount += Math.abs(tx.amount)
          existing.count += 1
        } else {
          categoryMap.set(cat.id, {
            name: cat.name,
            color: cat.color ?? '#6B7280',
            amount: Math.abs(tx.amount),
            count: 1,
          })
        }
      }

      const totalExpenses = Array.from(categoryMap.values()).reduce(
        (sum, c) => sum + c.amount,
        0
      )

      return Array.from(categoryMap.entries())
        .map(([categoryId, info]) => ({
          categoryId,
          categoryName: info.name,
          color: info.color,
          amount: info.amount,
          percentage:
            totalExpenses > 0 ? (info.amount / totalExpenses) * 100 : 0,
          transactionCount: info.count,
        }))
        .sort((a, b) => b.amount - a.amount)
    },
  })
}
