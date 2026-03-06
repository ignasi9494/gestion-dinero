'use client'

import { useState, useEffect } from 'react'
import {
  SlidersHorizontal,
  ChevronDown,
  X,
  Tag,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CategoryIcon } from '../classification-modal'
import { FilterChips } from './filter-chips'
import type { Category } from '@/lib/supabase/types'

// ─── Types ──────────────────────────────────────────────────────────

type TypeFilter = 'all' | 'expense' | 'income'
type ClassFilter = 'all' | 'classified' | 'unclassified'

interface AdvancedFiltersProps {
  // State
  categoryFilter: string
  setCategoryFilter: (v: string) => void
  typeFilter: TypeFilter
  setTypeFilter: (v: TypeFilter) => void
  classFilter: ClassFilter
  setClassFilter: (v: ClassFilter) => void
  dateFrom: string
  setDateFrom: (v: string) => void
  dateTo: string
  setDateTo: (v: string) => void
  amountMin: string
  setAmountMin: (v: string) => void
  amountMax: string
  setAmountMax: (v: string) => void
  // Data
  categories: Category[]
  categoryMap: Map<string, Category>
  // Actions
  activeFilterCount: number
}

// ─── Component ──────────────────────────────────────────────────────

export function AdvancedFilters({
  categoryFilter,
  setCategoryFilter,
  typeFilter,
  setTypeFilter,
  classFilter,
  setClassFilter,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  amountMin,
  setAmountMin,
  amountMax,
  setAmountMax,
  categories,
  categoryMap,
  activeFilterCount,
}: AdvancedFiltersProps) {
  const [isOpen, setIsOpen] = useState(false)
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

  // Category dropdown label
  const categoryDropdownLabel =
    categoryFilter === 'all'
      ? 'Categoria'
      : categoryFilter === 'unclassified'
        ? 'Sin clasificar'
        : categoryMap.get(categoryFilter)?.name ?? 'Categoria'

  const handleDateChange = (from: string, to: string) => {
    setDateFrom(from)
    setDateTo(to)
  }

  return (
    <div className="space-y-3">
      {/* Date quick chips + toggle */}
      <div className="flex items-center gap-2">
        <div className="flex-1 overflow-hidden">
          <FilterChips
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateChange={handleDateChange}
          />
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'relative flex h-8 flex-shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-all',
            isOpen || activeFilterCount > 0
              ? 'border-primary/30 bg-accent text-accent-foreground'
              : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filtros
          {activeFilterCount > 0 && (
            <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {activeFilterCount}
            </span>
          )}
          <ChevronDown
            className={cn(
              'h-3 w-3 transition-transform',
              isOpen && 'rotate-180'
            )}
          />
        </button>
      </div>

      {/* Collapsible advanced panel */}
      {isOpen && (
        <div className="space-y-3 rounded-xl border border-border bg-card/50 p-3">
          {/* Row 1: Category + Type + Classification */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Category dropdown */}
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
                <ChevronDown
                  className={cn(
                    'h-3.5 w-3.5 text-muted-foreground transition-transform',
                    categoryDropdownOpen && 'rotate-180'
                  )}
                />
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
                  {categories.map((cat) => (
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
          </div>

          {/* Row 2: Amount range + Date range */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Amount range */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">Importe:</span>
              <input
                type="number"
                value={amountMin}
                onChange={(e) => setAmountMin(e.target.value)}
                placeholder="Min"
                step="0.01"
                className="h-9 w-24 rounded-lg border border-border bg-card px-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <span className="text-xs text-muted-foreground">-</span>
              <input
                type="number"
                value={amountMax}
                onChange={(e) => setAmountMax(e.target.value)}
                placeholder="Max"
                step="0.01"
                className="h-9 w-24 rounded-lg border border-border bg-card px-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* Date range */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">Fecha:</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-9 rounded-lg border border-border bg-card px-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <span className="text-xs text-muted-foreground">-</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-9 rounded-lg border border-border bg-card px-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export type { TypeFilter, ClassFilter }
