'use client'

import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import {
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Wallet,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Inbox,
} from 'lucide-react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Sector,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  AreaChart,
  Area,
  LineChart,
  Line,
  Legend,
} from 'recharts'
import { cn, formatCurrency, formatDateShort } from '@/lib/utils'
import {
  useMonthlySummaries,
  useKPIs,
  useSalary,
  useBalanceEvolution,
  useCategoryBreakdown,
  type MonthlyChartData,
  type CategoryExpense,
  type BalancePoint,
} from '@/lib/hooks/useDashboard'
import { useTransactions } from '@/lib/hooks/useTransactions'

// ─── Spanish month names ────────────────────────────────────────────

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const MONTH_ABBR = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
]

// ─── Range presets ──────────────────────────────────────────────────

type RangePreset = { label: string; months: number }

const RANGE_PRESETS: RangePreset[] = [
  { label: 'Este mes', months: 1 },
  { label: '3 meses', months: 3 },
  { label: '6 meses', months: 6 },
  { label: '1 año', months: 12 },
]

// ─── Helpers ────────────────────────────────────────────────────────

function formatMonthYear(date: Date): string {
  return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`
}

function formatYYYYMM(date: Date): string {
  return format(date, 'yyyy-MM')
}

function abbreviateAmount(value: number): string {
  if (Math.abs(value) >= 1000) {
    return `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`
  }
  return `${value}`
}

// ─── Page Component ─────────────────────────────────────────────────

export default function DashboardPage() {
  // Month navigation state
  const [currentDate, setCurrentDate] = useState(() => startOfMonth(new Date()))
  const [rangeMonths, setRangeMonths] = useState(1)

  const currentMonth = formatYYYYMM(currentDate)

  // Navigate months
  const goToPreviousMonth = useCallback(() => {
    setCurrentDate((prev) => subMonths(prev, 1))
    setRangeMonths(1)
  }, [])

  const goToNextMonth = useCallback(() => {
    setCurrentDate((prev) => {
      const next = new Date(prev)
      next.setMonth(next.getMonth() + 1)
      const now = startOfMonth(new Date())
      return next > now ? prev : next
    })
    setRangeMonths(1)
  }, [])

  const selectPreset = useCallback((months: number) => {
    setCurrentDate(startOfMonth(new Date()))
    setRangeMonths(months)
  }, [])

  const isCurrentMonth =
    formatYYYYMM(currentDate) === formatYYYYMM(startOfMonth(new Date()))

  // Date range for balance evolution
  const balanceDateFrom = useMemo(() => {
    if (rangeMonths === 1) {
      return `${currentMonth}-01`
    }
    return format(subMonths(currentDate, rangeMonths - 1), 'yyyy-MM-dd')
  }, [currentMonth, currentDate, rangeMonths])

  const balanceDateTo = useMemo(() => {
    return format(endOfMonth(currentDate), 'yyyy-MM-dd')
  }, [currentDate])

  // ── Data fetching ─────────────────────────────────────────────────
  const { data: kpis, isLoading: kpisLoading } = useKPIs(currentMonth)
  const { data: categoryData, isLoading: categoryLoading } =
    useCategoryBreakdown(currentMonth, rangeMonths)
  const { data: monthlySummaries, isLoading: monthlyLoading } =
    useMonthlySummaries(Math.max(rangeMonths, 12))
  const { data: balanceData, isLoading: balanceLoading } =
    useBalanceEvolution(balanceDateFrom, balanceDateTo)
  const { data: salaryData, isLoading: salaryLoading } =
    useSalary(currentMonth)

  // Recent transactions (last 5)
  const { data: recentTxData, isLoading: recentTxLoading } = useTransactions({
    page: 1,
    pageSize: 5,
  })
  const recentTransactions = recentTxData?.data ?? []

  // Salary evolution: re-use monthlySummaries income data as proxy
  // since useSalary only returns a single month
  const salaryEvolution = useMemo(() => {
    if (!monthlySummaries) return []
    return monthlySummaries
      .slice(-Math.max(rangeMonths, 6))
      .map((m) => {
        const [year, monthNum] = m.month.split('-')
        return {
          month: m.month,
          label: `${MONTH_ABBR[parseInt(monthNum) - 1]} ${year.slice(2)}`,
          salary: m.income, // Best approximation from available data
        }
      })
  }, [monthlySummaries, rangeMonths])

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">
      {/* ── Month Selector ────────────────────────────────────────── */}
      <MonthSelector
        currentDate={currentDate}
        rangeMonths={rangeMonths}
        isCurrentMonth={isCurrentMonth}
        onPrev={goToPreviousMonth}
        onNext={goToNextMonth}
        onSelectPreset={selectPreset}
      />

      {/* ── KPI Cards ─────────────────────────────────────────────── */}
      <KPICards kpis={kpis} isLoading={kpisLoading} />

      {/* ── Charts Grid ───────────────────────────────────────────── */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Gastos por Categoria - Donut */}
        <CategoryDonutChart data={categoryData} isLoading={categoryLoading} />

        {/* Evolucion Mensual - Bar Chart */}
        <MonthlyBarChart
          data={monthlySummaries}
          isLoading={monthlyLoading}
          rangeMonths={rangeMonths}
        />

        {/* Evolucion del Saldo - Area Chart */}
        <BalanceAreaChart data={balanceData} isLoading={balanceLoading} />

        {/* Evolucion del Salario - Line Chart */}
        <SalaryLineChart
          data={salaryEvolution}
          isLoading={monthlyLoading}
          currentSalary={salaryData}
        />
      </div>

      {/* ── Recent Transactions ───────────────────────────────────── */}
      <RecentTransactions
        transactions={recentTransactions}
        isLoading={recentTxLoading}
      />
    </div>
  )
}

// =====================================================================
// ── Month Selector ──────────────────────────────────────────────────
// =====================================================================

function MonthSelector({
  currentDate,
  rangeMonths,
  isCurrentMonth,
  onPrev,
  onNext,
  onSelectPreset,
}: {
  currentDate: Date
  rangeMonths: number
  isCurrentMonth: boolean
  onPrev: () => void
  onNext: () => void
  onSelectPreset: (months: number) => void
}) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={onPrev}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-foreground transition-colors hover:bg-muted"
            aria-label="Mes anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h1 className="min-w-[160px] text-center text-lg font-bold text-foreground md:text-xl">
            {formatMonthYear(currentDate)}
          </h1>
          <button
            onClick={onNext}
            disabled={isCurrentMonth}
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card transition-colors',
              isCurrentMonth
                ? 'cursor-not-allowed text-muted-foreground opacity-50'
                : 'text-foreground hover:bg-muted'
            )}
            aria-label="Mes siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Range presets */}
        <div className="hidden items-center gap-1.5 sm:flex">
          {RANGE_PRESETS.map((preset) => (
            <button
              key={preset.months}
              onClick={() => onSelectPreset(preset.months)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                rangeMonths === preset.months
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card text-muted-foreground border border-border hover:bg-muted hover:text-foreground'
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile range presets */}
      <div className="mt-3 flex items-center gap-1.5 overflow-x-auto sm:hidden">
        {RANGE_PRESETS.map((preset) => (
          <button
            key={preset.months}
            onClick={() => onSelectPreset(preset.months)}
            className={cn(
              'whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
              rangeMonths === preset.months
                ? 'bg-primary text-primary-foreground'
                : 'bg-card text-muted-foreground border border-border hover:bg-muted hover:text-foreground'
            )}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// =====================================================================
// ── KPI Cards ───────────────────────────────────────────────────────
// =====================================================================

function KPICards({
  kpis,
  isLoading,
}: {
  kpis: ReturnType<typeof useKPIs>['data']
  isLoading: boolean
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )
  }

  if (!kpis) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <EmptyKPICard icon={TrendingUp} label="Ingresos" color="text-success" />
        <EmptyKPICard icon={TrendingDown} label="Gastos" color="text-danger" />
        <EmptyKPICard icon={PiggyBank} label="Ahorro" color="text-blue-500" />
        <EmptyKPICard icon={Wallet} label="Balance" color="text-muted-foreground" />
      </div>
    )
  }

  const cards = [
    {
      label: 'Ingresos',
      icon: TrendingUp,
      amount: kpis.totalIncome,
      change: kpis.vsLastMonth.incomeChange,
      colorClass: 'text-success',
      bgClass: 'bg-green-50',
      changeUp: true, // up = good for income
    },
    {
      label: 'Gastos',
      icon: TrendingDown,
      amount: kpis.totalExpenses,
      change: kpis.vsLastMonth.expenseChange,
      colorClass: 'text-danger',
      bgClass: 'bg-red-50',
      changeUp: false, // up = bad for expenses
    },
    {
      label: 'Ahorro',
      icon: PiggyBank,
      amount: kpis.totalSavings,
      change: kpis.savingsRate,
      colorClass: 'text-blue-500',
      bgClass: 'bg-blue-50',
      isSavingsRate: true,
    },
    {
      label: 'Balance',
      icon: Wallet,
      amount: kpis.totalIncome - kpis.totalExpenses,
      colorClass: 'text-muted-foreground',
      bgClass: 'bg-gray-50',
      showTransactionCount: true,
      transactionCount: kpis.transactionCount,
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl bg-card p-4 shadow-sm border border-border/50"
        >
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg',
                card.bgClass
              )}
            >
              <card.icon className={cn('h-4 w-4', card.colorClass)} />
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              {card.label}
            </span>
          </div>

          <p className="mt-3 text-lg font-bold text-foreground md:text-xl">
            {formatCurrency(card.amount)}
          </p>

          {/* Change indicator */}
          {'isSavingsRate' in card && card.isSavingsRate ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Tasa de ahorro:{' '}
              <span
                className={cn(
                  'font-semibold',
                  card.change >= 0 ? 'text-success' : 'text-danger'
                )}
              >
                {card.change.toFixed(1)}%
              </span>
            </p>
          ) : 'showTransactionCount' in card && card.showTransactionCount ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {card.transactionCount} movimientos
            </p>
          ) : card.change !== undefined ? (
            <div className="mt-1 flex items-center gap-1">
              {card.change > 0 ? (
                <ArrowUpRight
                  className={cn(
                    'h-3.5 w-3.5',
                    card.changeUp ? 'text-success' : 'text-danger'
                  )}
                />
              ) : card.change < 0 ? (
                <ArrowDownRight
                  className={cn(
                    'h-3.5 w-3.5',
                    card.changeUp ? 'text-danger' : 'text-success'
                  )}
                />
              ) : null}
              <span
                className={cn(
                  'text-xs font-medium',
                  card.change === 0
                    ? 'text-muted-foreground'
                    : card.change > 0
                      ? card.changeUp
                        ? 'text-success'
                        : 'text-danger'
                      : card.changeUp
                        ? 'text-danger'
                        : 'text-success'
                )}
              >
                {card.change === 0
                  ? 'Sin cambio'
                  : `${Math.abs(card.change).toFixed(1)}% vs mes ant.`}
              </span>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  )
}

function EmptyKPICard({
  icon: Icon,
  label,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  color: string
}) {
  return (
    <div className="rounded-xl bg-card p-4 shadow-sm border border-border/50">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
          <Icon className={cn('h-4 w-4', color)} />
        </div>
        <span className="text-xs font-medium text-muted-foreground">
          {label}
        </span>
      </div>
      <p className="mt-3 text-lg font-bold text-muted-foreground">--</p>
      <p className="mt-1 text-xs text-muted-foreground">Sin datos</p>
    </div>
  )
}

// =====================================================================
// ── Category Donut Chart ────────────────────────────────────────────
// =====================================================================

function CategoryDonutChart({
  data,
  isLoading,
}: {
  data: CategoryExpense[] | undefined
  isLoading: boolean
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | undefined>(
    undefined
  )

  // Top 8 categories + "Otros"
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return []

    const top = data.slice(0, 8)
    const rest = data.slice(8)

    const result = top.map((cat) => ({
      name: cat.categoryName,
      value: cat.amount,
      color: cat.color,
      percentage: cat.percentage,
    }))

    if (rest.length > 0) {
      const othersAmount = rest.reduce((sum, c) => sum + c.amount, 0)
      const totalAmount = data.reduce((sum, c) => sum + c.amount, 0)
      result.push({
        name: 'Otros',
        value: othersAmount,
        color: '#9CA3AF',
        percentage: totalAmount > 0 ? (othersAmount / totalAmount) * 100 : 0,
      })
    }

    return result
  }, [data])

  const totalExpenses = useMemo(
    () => chartData.reduce((sum, d) => sum + d.value, 0),
    [chartData]
  )

  const onPieEnter = useCallback((_: unknown, index: number) => {
    setHoveredIndex(index)
  }, [])

  const onPieLeave = useCallback(() => {
    setHoveredIndex(undefined)
  }, [])

  return (
    <ChartCard title="Gastos por Categoria">
      {isLoading ? (
        <SkeletonChart height={280} />
      ) : chartData.length === 0 ? (
        <EmptyChartState message="No hay gastos este mes" />
      ) : (
        <>
          <div className="relative">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  shape={(props: any) => {
                    const isActive = props.index === hoveredIndex
                    return (
                      <Sector
                        {...props}
                        innerRadius={isActive ? props.innerRadius - 4 : props.innerRadius}
                        outerRadius={isActive ? props.outerRadius + 6 : props.outerRadius}
                      />
                    )
                  }}
                  onMouseEnter={onPieEnter}
                  onMouseLeave={onPieLeave}
                  stroke="none"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xs text-muted-foreground">Total</span>
              <span className="text-base font-bold text-foreground">
                {formatCurrency(totalExpenses)}
              </span>
            </div>
          </div>

          {/* Legend */}
          <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {chartData.map((entry, index) => (
              <div
                key={index}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors',
                  hoveredIndex === index ? 'bg-muted' : ''
                )}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(undefined)}
              >
                <div
                  className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="flex-1 truncate text-xs text-foreground">
                  {entry.name}
                </span>
                <span className="text-xs font-medium text-foreground tabular-nums">
                  {formatCurrency(entry.value)}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {entry.percentage.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </ChartCard>
  )
}


// =====================================================================
// ── Monthly Bar Chart ───────────────────────────────────────────────
// =====================================================================

function MonthlyBarChart({
  data,
  isLoading,
  rangeMonths,
}: {
  data: MonthlyChartData[] | undefined
  isLoading: boolean
  rangeMonths: number
}) {
  const chartData = useMemo(() => {
    if (!data) return []
    const sliced = data.slice(-Math.max(rangeMonths, 6))
    return sliced.map((item) => {
      const [year, monthNum] = item.month.split('-')
      return {
        ...item,
        label: `${MONTH_ABBR[parseInt(monthNum) - 1]} ${year.slice(2)}`,
      }
    })
  }, [data, rangeMonths])

  return (
    <ChartCard title="Evolucion Mensual">
      {isLoading ? (
        <SkeletonChart height={280} />
      ) : chartData.length === 0 ? (
        <EmptyChartState message="No hay datos mensuales" />
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart
            data={chartData}
            margin={{ top: 5, right: 5, left: -10, bottom: 5 }}
            barGap={4}
            barCategoryGap="20%"
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="var(--border)"
            />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={abbreviateAmount}
            />
            <Tooltip content={<MonthlyTooltip />} />
            <Bar
              dataKey="income"
              name="Ingresos"
              fill="var(--success)"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
            <Bar
              dataKey="expenses"
              name="Gastos"
              fill="var(--danger)"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  )
}

function MonthlyTooltip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null

  const income = payload.find((p: any) => p.dataKey === 'income')?.value ?? 0
  const expenses =
    payload.find((p: any) => p.dataKey === 'expenses')?.value ?? 0
  const diff = income - expenses

  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-lg">
      <p className="mb-2 text-xs font-semibold text-foreground">{label}</p>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-success" />
            Ingresos
          </span>
          <span className="text-xs font-semibold text-foreground tabular-nums">
            {formatCurrency(income)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-danger" />
            Gastos
          </span>
          <span className="text-xs font-semibold text-foreground tabular-nums">
            {formatCurrency(expenses)}
          </span>
        </div>
        <div className="border-t border-border pt-1">
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-muted-foreground">Diferencia</span>
            <span
              className={cn(
                'text-xs font-bold tabular-nums',
                diff >= 0 ? 'text-success' : 'text-danger'
              )}
            >
              {formatCurrency(diff)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// =====================================================================
// ── Balance Area Chart ──────────────────────────────────────────────
// =====================================================================

function BalanceAreaChart({
  data,
  isLoading,
}: {
  data: BalancePoint[] | undefined
  isLoading: boolean
}) {
  const chartData = useMemo(() => {
    if (!data) return []
    return data.map((point) => ({
      ...point,
      label: formatDateShort(point.date),
    }))
  }, [data])

  return (
    <ChartCard title="Evolucion del Saldo">
      {isLoading ? (
        <SkeletonChart height={280} />
      ) : chartData.length === 0 ? (
        <EmptyChartState message="No hay datos de saldo" />
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart
            data={chartData}
            margin={{ top: 5, right: 5, left: -10, bottom: 5 }}
          >
            <defs>
              <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="var(--border)"
            />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={abbreviateAmount}
            />
            <Tooltip content={<BalanceTooltip />} />
            <Area
              type="monotone"
              dataKey="balance"
              stroke="var(--primary)"
              strokeWidth={2}
              fill="url(#balanceGradient)"
              dot={false}
              activeDot={{
                r: 5,
                fill: 'var(--primary)',
                stroke: 'var(--card)',
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  )
}

function BalanceTooltip({ active, payload }: any) {
  if (!active || !payload || payload.length === 0) return null

  const point = payload[0]?.payload
  if (!point) return null

  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-lg">
      <p className="mb-1 text-xs text-muted-foreground">
        {formatDateShort(point.date)}
      </p>
      <p className="text-sm font-bold text-foreground">
        {formatCurrency(point.balance)}
      </p>
    </div>
  )
}

// =====================================================================
// ── Salary Line Chart ───────────────────────────────────────────────
// =====================================================================

interface SalaryEvolutionPoint {
  month: string
  label: string
  salary: number
}

function SalaryLineChart({
  data,
  isLoading,
  currentSalary,
}: {
  data: SalaryEvolutionPoint[]
  isLoading: boolean
  currentSalary: ReturnType<typeof useSalary>['data']
}) {
  return (
    <ChartCard
      title="Evolucion del Salario"
      subtitle={
        currentSalary
          ? `Ultimo: ${formatCurrency(currentSalary.amount)}`
          : undefined
      }
    >
      {isLoading ? (
        <SkeletonChart height={280} />
      ) : data.length === 0 ? (
        <EmptyChartState message="No hay datos de salario" />
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart
            data={data}
            margin={{ top: 5, right: 5, left: -10, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="var(--border)"
            />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={abbreviateAmount}
            />
            <Tooltip content={<SalaryTooltip />} />
            <Line
              type="monotone"
              dataKey="salary"
              name="Salario"
              stroke="var(--success)"
              strokeWidth={2.5}
              dot={{
                r: 4,
                fill: 'var(--success)',
                stroke: 'var(--card)',
                strokeWidth: 2,
              }}
              activeDot={{
                r: 6,
                fill: 'var(--success)',
                stroke: 'var(--card)',
                strokeWidth: 2,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  )
}

function SalaryTooltip({ active, payload }: any) {
  if (!active || !payload || payload.length === 0) return null

  const point = payload[0]?.payload
  if (!point) return null

  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-lg">
      <p className="mb-1 text-xs text-muted-foreground">{point.label}</p>
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-success" />
        <span className="text-sm font-bold text-foreground">
          {formatCurrency(point.salary)}
        </span>
      </div>
    </div>
  )
}

// =====================================================================
// ── Recent Transactions ─────────────────────────────────────────────
// =====================================================================

function RecentTransactions({
  transactions,
  isLoading,
}: {
  transactions: Array<{
    id: string
    date: string
    concept: string
    amount: number
    category_id: string | null
  }>
  isLoading: boolean
}) {
  return (
    <div className="mt-6 rounded-xl border border-border/50 bg-card p-4 shadow-sm md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">
          Ultimas Transacciones
        </h2>
        <Link
          href="/transactions"
          className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          Ver todos
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-8 w-8 animate-pulse rounded-lg bg-muted" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
                <div className="h-2.5 w-1/4 animate-pulse rounded bg-muted" />
              </div>
              <div className="h-3 w-16 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8">
          <Inbox className="h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-xs text-muted-foreground">
            No hay transacciones recientes
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {transactions.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/50"
            >
              {/* Category color dot */}
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                <div
                  className={cn(
                    'h-2.5 w-2.5 rounded-full',
                    tx.amount >= 0 ? 'bg-success' : 'bg-danger'
                  )}
                />
              </div>

              {/* Concept */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-foreground">
                  {tx.concept}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDateShort(tx.date)}
                </p>
              </div>

              {/* Amount */}
              <span
                className={cn(
                  'flex-shrink-0 text-sm font-semibold tabular-nums',
                  tx.amount >= 0 ? 'text-success' : 'text-danger'
                )}
              >
                {formatCurrency(tx.amount)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// =====================================================================
// ── Shared Components ───────────────────────────────────────────────
// =====================================================================

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-4 shadow-sm md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {subtitle && (
          <span className="text-xs text-muted-foreground">{subtitle}</span>
        )}
      </div>
      {children}
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="rounded-xl bg-card p-4 shadow-sm border border-border/50">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 animate-pulse rounded-lg bg-muted" />
        <div className="h-3 w-16 animate-pulse rounded bg-muted" />
      </div>
      <div className="mt-3 h-6 w-24 animate-pulse rounded bg-muted" />
      <div className="mt-2 h-3 w-20 animate-pulse rounded bg-muted" />
    </div>
  )
}

function SkeletonChart({ height }: { height: number }) {
  return (
    <div
      className="flex w-full items-center justify-center rounded-lg bg-muted/30"
      style={{ height }}
    >
      <div className="flex flex-col items-center gap-2">
        <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
        <div className="h-3 w-24 animate-pulse rounded bg-muted" />
      </div>
    </div>
  )
}

function EmptyChartState({ message }: { message: string }) {
  return (
    <div className="flex h-[260px] w-full flex-col items-center justify-center">
      <Inbox className="h-8 w-8 text-muted-foreground" />
      <p className="mt-2 text-xs text-muted-foreground">{message}</p>
    </div>
  )
}
