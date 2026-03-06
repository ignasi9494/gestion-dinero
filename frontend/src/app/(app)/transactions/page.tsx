'use client'

import { Suspense, useState, useMemo, useCallback, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Search,
  ChevronDown,
  Loader2,
  AlertTriangle,
  Inbox,
  Tag,
  X,
  Sparkles,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { cn, formatCurrency, formatDateShort } from '@/lib/utils'
import {
  useTransactions,
  useUnclassifiedCount,
  type TransactionFilters,
} from '@/lib/hooks/useTransactions'
import { useCategories } from '@/lib/hooks/useCategories'
import { useUIStore } from '@/lib/stores/ui-store'
import { useAIClassifyBatch, useAIClassifyStats } from '@/lib/hooks/useAIClassify'
import { ClassificationModal, CategoryIcon } from './classification-modal'
import type { Transaction, Category } from '@/lib/supabase/types'

// ─── Types ───────────────────────────────────────────────────────────

type TypeFilter = 'all' | 'expense' | 'income'
type ClassFilter = 'all' | 'classified' | 'unclassified'

// ─── Date group helpers ──────────────────────────────────────────────

function getDateGroupLabel(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const dateNorm = new Date(date)
  dateNorm.setHours(0, 0, 0, 0)

  if (dateNorm.getTime() === today.getTime()) {
    return `Hoy, ${formatDateShort(date)}`
  }
  if (dateNorm.getTime() === yesterday.getTime()) {
    return `Ayer, ${formatDateShort(date)}`
  }
  return formatDateShort(date)
}

function groupTransactionsByDate(
  transactions: Transaction[]
): { date: string; label: string; transactions: Transaction[] }[] {
  const groups: Map<string, Transaction[]> = new Map()

  for (const tx of transactions) {
    const dateKey = tx.date // Already YYYY-MM-DD from DB
    if (!groups.has(dateKey)) {
      groups.set(dateKey, [])
    }
    groups.get(dateKey)!.push(tx)
  }

  return Array.from(groups.entries()).map(([date, txns]) => ({
    date,
    label: getDateGroupLabel(date),
    transactions: txns,
  }))
}

// ─── Page (wrapped in Suspense for useSearchParams) ──────────────────

export default function TransactionsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">Cargando movimientos...</p>
        </div>
      }
    >
      <TransactionsContent />
    </Suspense>
  )
}

function TransactionsContent() {
  const searchParams = useSearchParams()

  // ── Filter state ─────────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [classFilter, setClassFilter] = useState<ClassFilter>(
    searchParams.get('filter') === 'unclassified' ? 'unclassified' : 'all'
  )
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [categoryFilter, typeFilter, classFilter, dateFrom, dateTo])

  // ── Build query filters ──────────────────────────────────────────
  const filters = useMemo((): TransactionFilters => {
    const f: TransactionFilters = {
      page,
      pageSize: 50,
    }

    if (debouncedSearch) f.search = debouncedSearch
    if (dateFrom) f.dateFrom = dateFrom
    if (dateTo) f.dateTo = dateTo

    // Category filter
    if (categoryFilter === 'unclassified') {
      f.categoryId = null // null means filter for no category
    } else if (categoryFilter !== 'all') {
      f.categoryId = categoryFilter
    }

    // Classification source filter
    if (classFilter === 'unclassified') {
      f.classificationSource = 'unclassified'
    } else if (classFilter === 'classified') {
      // When "classified", show anything that's NOT unclassified
      // We use categoryId !== null (already handled if not set)
      // We'll exclude unclassified by not passing it, but we need
      // a server-side approach. The hook supports classificationSource.
      // For "classified" we need to exclude unclassified - we'll handle in client filter
    }

    return f
  }, [debouncedSearch, categoryFilter, classFilter, dateFrom, dateTo, page])

  // ── Data fetching ────────────────────────────────────────────────
  const { data: categoriesData = [] } = useCategories()
  const { data: txData, isLoading } = useTransactions(filters)
  const { data: unclassifiedCount = 0 } = useUnclassifiedCount()

  // Category lookup map
  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>()
    for (const cat of categoriesData) {
      map.set(cat.id, cat)
    }
    return map
  }, [categoriesData])

  // Client-side type filter (income vs expense) and classification filter
  const filteredTransactions = useMemo(() => {
    if (!txData?.data) return []

    let result = txData.data

    // Type filter
    if (typeFilter === 'expense') {
      result = result.filter((tx) => tx.amount < 0)
    } else if (typeFilter === 'income') {
      result = result.filter((tx) => tx.amount >= 0)
    }

    // Additional client-side classification filter for "classified"
    if (classFilter === 'classified') {
      result = result.filter((tx) => tx.classification_source !== 'unclassified')
    }

    return result
  }, [txData?.data, typeFilter, classFilter])

  // Group by date
  const dateGroups = useMemo(
    () => groupTransactionsByDate(filteredTransactions),
    [filteredTransactions]
  )

  const hasNextPage = txData ? txData.page < txData.totalPages : false

  // ── Selection store ──────────────────────────────────────────────
  const {
    selectedTransactions,
    toggleTransaction,
    clearSelection,
    isSelected,
    selectionCount,
  } = useUIStore()
  const selectedCount = selectionCount()

  // ── Modal state ──────────────────────────────────────────────────
  const [modalTransaction, setModalTransaction] = useState<Transaction | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [bulkModalOpen, setBulkModalOpen] = useState(false)

  const openModal = useCallback((tx: Transaction) => {
    setModalTransaction(tx)
    setModalOpen(true)
  }, [])

  const closeModal = useCallback(() => {
    setModalOpen(false)
    setModalTransaction(null)
  }, [])

  const openBulkModal = useCallback(() => {
    setBulkModalOpen(true)
  }, [])

  const closeBulkModal = useCallback(() => {
    setBulkModalOpen(false)
  }, [])

  // ── AI Classify ─────────────────────────────────────────────────
  const { classify, progress: aiProgress, result: aiResult, isClassifying, reset: resetAI } = useAIClassifyBatch()
  const { data: aiStats } = useAIClassifyStats()
  const [showAIConfirm, setShowAIConfirm] = useState(false)
  const [showAIResult, setShowAIResult] = useState(false)

  // Show result when classification completes
  useEffect(() => {
    if (aiProgress.stage === 'completed' && aiResult && aiResult.totalProcessed > 0) {
      setShowAIResult(true)
    }
  }, [aiProgress.stage, aiResult])

  const handleAIClassify = useCallback(async () => {
    setShowAIConfirm(false)
    await classify()
  }, [classify])

  // ── Dropdown state ───────────────────────────────────────────────
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false)

  // Close dropdown on outside click
  useEffect(() => {
    if (!categoryDropdownOpen) return
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-category-dropdown]')) {
        setCategoryDropdownOpen(false)
      }
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [categoryDropdownOpen])

  // ── Filter helpers ───────────────────────────────────────────────
  const hasActiveFilters =
    search !== '' ||
    categoryFilter !== 'all' ||
    typeFilter !== 'all' ||
    classFilter !== 'all' ||
    dateFrom !== '' ||
    dateTo !== ''

  const clearAllFilters = useCallback(() => {
    setSearch('')
    setDebouncedSearch('')
    setCategoryFilter('all')
    setTypeFilter('all')
    setClassFilter('all')
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }, [])

  // Category dropdown label
  const categoryDropdownLabel = useMemo(() => {
    if (categoryFilter === 'all') return 'Categoria'
    if (categoryFilter === 'unclassified') return 'Sin clasificar'
    const cat = categoryMap.get(categoryFilter)
    return cat?.name ?? 'Categoria'
  }, [categoryFilter, categoryMap])

  // ─── Render ──────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-foreground">Movimientos</h1>
          {unclassifiedCount > 0 && (
            <button
              onClick={() => {
                setClassFilter('unclassified')
                setCategoryFilter('all')
              }}
              className="flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-200"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              {unclassifiedCount} sin clasificar
            </button>
          )}
          {unclassifiedCount > 0 && !isClassifying && (
            <button
              onClick={() => setShowAIConfirm(true)}
              className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 px-3 py-1 text-xs font-semibold text-white shadow-sm transition-all hover:shadow-md hover:from-indigo-600 hover:to-purple-700 active:scale-95"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Clasificar con IA
            </button>
          )}
        </div>
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
            Limpiar filtros
          </button>
        )}
      </div>

      {/* AI Classification Progress */}
      {isClassifying && (
        <div className="mb-4 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
            <span className="text-sm font-medium text-indigo-900">{aiProgress.message}</span>
          </div>
          {aiProgress.total > 0 && (
            <div className="h-2 w-full overflow-hidden rounded-full bg-indigo-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-300"
                style={{ width: `${Math.round((aiProgress.current / aiProgress.total) * 100)}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* AI Classification Result */}
      {showAIResult && aiResult && (
        <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-900">
                  Clasificacion IA completada
                </p>
                <p className="mt-1 text-xs text-green-700">
                  {aiResult.applied} transacciones clasificadas
                  {aiResult.fromLookup > 0 && ` (${aiResult.fromLookup} por lookup)`}
                  {aiResult.fromAI > 0 && ` (${aiResult.fromAI} por IA)`}
                  {aiResult.lowConfidence > 0 && ` · ${aiResult.lowConfidence} con baja confianza`}
                </p>
                {aiResult.errors.length > 0 && (
                  <p className="mt-1 text-xs text-amber-700">
                    {aiResult.errors.length} error(es) durante la clasificacion
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => { setShowAIResult(false); resetAI() }}
              className="text-green-600 hover:text-green-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* AI Confirm Modal */}
      {showAIConfirm && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/40"
            onClick={() => setShowAIConfirm(false)}
          />
          <div className="fixed inset-x-4 top-1/2 z-50 -translate-y-1/2 rounded-2xl bg-card p-6 shadow-2xl md:inset-auto md:left-1/2 md:top-1/2 md:w-full md:max-w-sm md:-translate-x-1/2 md:-translate-y-1/2">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Clasificar con IA</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Se clasificaran automaticamente las transacciones sin clasificar usando inteligencia artificial.
            </p>
            {aiStats && (
              <div className="mt-3 space-y-1 rounded-lg bg-muted/50 p-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Transacciones:</span>
                  <span className="font-medium text-foreground">{aiStats.unclassifiedCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Conceptos unicos:</span>
                  <span className="font-medium text-foreground">{aiStats.uniqueConcepts}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Coste estimado:</span>
                  <span className="font-medium text-green-600">${aiStats.estimatedCost.toFixed(3)}</span>
                </div>
              </div>
            )}
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setShowAIConfirm(false)}
                className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                onClick={handleAIClassify}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:shadow-lg active:scale-95"
              >
                <Sparkles className="h-4 w-4" />
                Clasificar
              </button>
            </div>
          </div>
        </>
      )}

      {/* Filter bar */}
      <div className="mb-5 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por concepto..."
            className="h-10 w-full rounded-xl border border-border bg-card pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter pills */}
        <div className="flex flex-wrap items-center gap-2">
            {/* Category dropdown - outside overflow container to prevent clipping */}
            <div className="relative" data-category-dropdown>
              <button
                onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                className={cn(
                  'flex h-9 items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 text-sm font-medium transition-colors',
                  categoryFilter !== 'all'
                    ? 'border-primary/30 bg-accent text-accent-foreground'
                    : 'border-border bg-card text-foreground hover:bg-muted'
                )}
              >
                <Tag className="h-3.5 w-3.5" />
                {categoryDropdownLabel}
                <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', categoryDropdownOpen && 'rotate-180')} />
              </button>

              {categoryDropdownOpen && (
                <div className="absolute left-0 top-full z-50 mt-1 max-h-64 w-56 overflow-y-auto rounded-xl border border-border bg-card p-1 shadow-lg">
                  <button
                    onClick={() => {
                      setCategoryFilter('all')
                      setCategoryDropdownOpen(false)
                    }}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                      categoryFilter === 'all'
                        ? 'bg-accent text-accent-foreground'
                        : 'text-foreground hover:bg-muted'
                    )}
                  >
                    Todas las categorias
                  </button>
                  <button
                    onClick={() => {
                      setCategoryFilter('unclassified')
                      setCategoryDropdownOpen(false)
                    }}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                      categoryFilter === 'unclassified'
                        ? 'bg-accent text-accent-foreground'
                        : 'text-foreground hover:bg-muted'
                    )}
                  >
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                    Sin clasificar
                  </button>
                  <div className="my-1 h-px bg-border" />
                  {categoriesData.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setCategoryFilter(cat.id)
                        setCategoryDropdownOpen(false)
                      }}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                        categoryFilter === cat.id
                          ? 'bg-accent text-accent-foreground'
                          : 'text-foreground hover:bg-muted'
                      )}
                    >
                      <div
                        className="flex h-5 w-5 items-center justify-center rounded"
                        style={{
                          backgroundColor: `${cat.color || '#6366f1'}20`,
                          color: cat.color || '#6366f1',
                        }}
                      >
                        <CategoryIcon iconName={cat.icon} className="h-3 w-3" />
                      </div>
                      <span className="truncate">{cat.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Type filter */}
            <div className="flex h-9 overflow-hidden rounded-lg border border-border">
              {(['all', 'expense', 'income'] as TypeFilter[]).map((type) => {
                const labels: Record<TypeFilter, string> = {
                  all: 'Todos',
                  expense: 'Gastos',
                  income: 'Ingresos',
                }
                return (
                  <button
                    key={type}
                    onClick={() => setTypeFilter(type)}
                    className={cn(
                      'whitespace-nowrap px-3 text-sm font-medium transition-colors',
                      typeFilter === type
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card text-foreground hover:bg-muted'
                    )}
                  >
                    {labels[type]}
                  </button>
                )
              })}
            </div>

            {/* Classification filter */}
            <div className="flex h-9 overflow-hidden rounded-lg border border-border">
              {(['all', 'classified', 'unclassified'] as ClassFilter[]).map(
                (cls) => {
                  const labels: Record<ClassFilter, string> = {
                    all: 'Todos',
                    classified: 'Clasificados',
                    unclassified: 'Sin clasificar',
                  }
                  return (
                    <button
                      key={cls}
                      onClick={() => setClassFilter(cls)}
                      className={cn(
                        'whitespace-nowrap px-3 text-sm font-medium transition-colors',
                        classFilter === cls
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-card text-foreground hover:bg-muted'
                      )}
                    >
                      {labels[cls]}
                    </button>
                  )
                }
              )}
            </div>

            {/* Date range */}
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-9 rounded-lg border border-border bg-card px-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Desde"
              />
              <span className="text-xs text-muted-foreground">-</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-9 rounded-lg border border-border bg-card px-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Hasta"
              />
            </div>
        </div>
      </div>

      {/* Bulk actions bar */}
      {selectedCount > 0 && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-primary/20 bg-accent px-4 py-3">
          <span className="text-sm font-medium text-accent-foreground">
            {selectedCount} seleccionado{selectedCount !== 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={openBulkModal}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Tag className="h-3.5 w-3.5" />
              Clasificar
            </button>
            <button
              onClick={clearSelection}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Transaction list */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">Cargando movimientos...</p>
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
            <Inbox className="h-7 w-7 text-muted-foreground" />
          </div>
          <h2 className="mt-4 text-base font-semibold text-foreground">
            No hay movimientos
          </h2>
          <p className="mt-1 max-w-xs text-center text-sm text-muted-foreground">
            {hasActiveFilters
              ? 'No se encontraron movimientos con los filtros seleccionados.'
              : 'Importa un extracto bancario para empezar a ver tus movimientos.'}
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="mt-4 text-sm font-medium text-primary hover:underline"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-1">
          {dateGroups.map((group) => (
            <div key={group.date}>
              {/* Date separator */}
              <div className="sticky top-0 z-10 -mx-4 bg-background/95 px-4 py-2 backdrop-blur-sm md:-mx-6 md:px-6">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </span>
              </div>

              {/* Transactions in this date group */}
              <div className="space-y-0.5">
                {group.transactions.map((tx) => (
                  <TransactionRow
                    key={tx.id}
                    transaction={tx}
                    category={tx.category_id ? categoryMap.get(tx.category_id) : undefined}
                    isSelected={isSelected(tx.id)}
                    onToggleSelect={() => toggleTransaction(tx.id)}
                    onClick={() => openModal(tx)}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Load more */}
          {hasNextPage && (
            <div className="flex justify-center pt-4 pb-2">
              <button
                onClick={() => setPage((p) => p + 1)}
                className="flex items-center gap-2 rounded-xl border border-border bg-card px-6 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                Cargar mas
              </button>
            </div>
          )}

          {/* Results summary */}
          {txData && (
            <p className="pb-4 pt-2 text-center text-xs text-muted-foreground">
              Mostrando {filteredTransactions.length} de {txData.count} movimientos
            </p>
          )}
        </div>
      )}

      {/* Classification Modal - single */}
      <ClassificationModal
        transaction={modalTransaction}
        open={modalOpen}
        onClose={closeModal}
      />

      {/* Classification Modal - bulk */}
      <ClassificationModal
        bulkTransactionIds={Array.from(selectedTransactions)}
        open={bulkModalOpen}
        onClose={() => {
          closeBulkModal()
          clearSelection()
        }}
      />
    </div>
  )
}

// ─── Transaction Row ─────────────────────────────────────────────────

function TransactionRow({
  transaction,
  category,
  isSelected,
  onToggleSelect,
  onClick,
}: {
  transaction: Transaction
  category?: Category
  isSelected: boolean
  onToggleSelect: () => void
  onClick: () => void
}) {
  const isUnclassified = transaction.classification_source === 'unclassified'
  const color = category?.color || '#6366f1'

  return (
    <div
      className={cn(
        'group flex cursor-pointer items-center gap-3 rounded-xl px-3 py-3 transition-all duration-150',
        'hover:bg-muted/60',
        isSelected && 'bg-accent',
        isUnclassified && 'border-l-[3px] border-l-amber-400'
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
    >
      {/* Selection checkbox (visible on hover or when selected) */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onToggleSelect()
        }}
        className={cn(
          'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 transition-all',
          isSelected
            ? 'border-primary bg-primary'
            : 'border-transparent opacity-0 group-hover:border-border group-hover:opacity-100'
        )}
      >
        {isSelected && (
          <svg
            className="h-3 w-3 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        )}
      </button>

      {/* Category icon */}
      {isUnclassified ? (
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-100">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
        </div>
      ) : (
        <div
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${color}15`, color }}
        >
          <CategoryIcon iconName={category?.icon ?? null} className="h-5 w-5" />
        </div>
      )}

      {/* Concept and category name */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {transaction.concept}
        </p>
        {isUnclassified ? (
          <p className="mt-0.5 text-xs font-medium text-amber-600">
            Sin clasificar
          </p>
        ) : category ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{category.name}</p>
        ) : null}
      </div>

      {/* Amount */}
      <span
        className={cn(
          'flex-shrink-0 text-sm font-semibold tabular-nums',
          transaction.amount >= 0 ? 'text-success' : 'text-danger'
        )}
      >
        {formatCurrency(transaction.amount)}
      </span>
    </div>
  )
}
