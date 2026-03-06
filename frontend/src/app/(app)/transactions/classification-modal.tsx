'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  X,
  Check,
  Loader2,
  ShoppingCart,
  Utensils,
  Repeat,
  Car,
  Pill,
  Home,
  Shirt,
  Zap,
  GraduationCap,
  Gamepad2,
  CircleParking,
  Cigarette,
  HeartPulse,
  Plane,
  Package,
  Megaphone,
  Fuel,
  Banknote,
  CircleHelp,
  Briefcase,
  ArrowDownLeft,
  Undo2,
  PlusCircle,
  Smartphone,
  ArrowRightLeft,
  Repeat2,
  Circle,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { useCategories } from '@/lib/hooks/useCategories'
import { useUpdateTransactionCategory, useBulkUpdateCategory } from '@/lib/hooks/useTransactions'
import { useCreateRuleAndApply } from '@/lib/hooks/useClassificationRules'
import { useAISuggestion } from '@/lib/hooks/useAIClassify'
import type { Transaction, Category } from '@/lib/supabase/types'

// ─── Icon map ────────────────────────────────────────────────────────

const iconMap: Record<string, LucideIcon> = {
  'shopping-cart': ShoppingCart,
  'utensils': Utensils,
  'repeat': Repeat,
  'car': Car,
  'pill': Pill,
  'home': Home,
  'shirt': Shirt,
  'zap': Zap,
  'graduation-cap': GraduationCap,
  'gamepad-2': Gamepad2,
  'circle-parking': CircleParking,
  'cigarette': Cigarette,
  'heart-pulse': HeartPulse,
  'plane': Plane,
  'package': Package,
  'megaphone': Megaphone,
  'fuel': Fuel,
  'banknote': Banknote,
  'circle-help': CircleHelp,
  'briefcase': Briefcase,
  'arrow-down-left': ArrowDownLeft,
  'undo-2': Undo2,
  'plus-circle': PlusCircle,
  'smartphone': Smartphone,
  'arrow-right-left': ArrowRightLeft,
  'repeat-2': Repeat2,
  'circle': Circle,
}

export function CategoryIcon({
  iconName,
  className,
}: {
  iconName: string | null
  className?: string
}) {
  const Icon = iconName ? iconMap[iconName] : null
  if (!Icon) return <Circle className={className} />
  return <Icon className={className} />
}

// ─── Props ───────────────────────────────────────────────────────────

interface ClassificationModalProps {
  /** Single transaction for individual classification */
  transaction?: Transaction | null
  /** Multiple transaction IDs for bulk classification */
  bulkTransactionIds?: string[]
  /** Whether modal is open */
  open: boolean
  /** Called when modal should close */
  onClose: () => void
  /** Called after successful classification */
  onSuccess?: () => void
}

// ─── Component ───────────────────────────────────────────────────────

export function ClassificationModal({
  transaction,
  bulkTransactionIds,
  open,
  onClose,
  onSuccess,
}: ClassificationModalProps) {
  const isBulk = bulkTransactionIds && bulkTransactionIds.length > 0
  const isUnclassified = transaction?.classification_source === 'unclassified'
  const { data: categories = [] } = useCategories()
  const updateCategory = useUpdateTransactionCategory()
  const bulkUpdate = useBulkUpdateCategory()
  const createRuleAndApply = useCreateRuleAndApply()

  // AI suggestion for unclassified single transactions
  const { data: aiSuggestion, isLoading: aiLoading } = useAISuggestion(
    open && !isBulk && isUnclassified ? transaction?.concept_normalized ?? null : null
  )

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [applyToSimilar, setApplyToSimilar] = useState(true)
  const [saving, setSaving] = useState(false)

  // Reset state when modal opens with new transaction
  useEffect(() => {
    if (open) {
      setSelectedCategoryId(transaction?.category_id ?? null)
      setApplyToSimilar(true)
      setSaving(false)
    }
  }, [open, transaction?.id, transaction?.category_id])

  const handleSave = useCallback(async () => {
    if (!selectedCategoryId) return
    setSaving(true)

    try {
      if (isBulk) {
        await bulkUpdate.mutateAsync({
          transactionIds: bulkTransactionIds,
          categoryId: selectedCategoryId,
          classificationSource: 'manual',
        })
      } else if (transaction) {
        // Single transaction classification
        // Always update the current transaction first
        await updateCategory.mutateAsync({
          transactionId: transaction.id,
          categoryId: selectedCategoryId,
          classificationSource: 'manual',
        })

        if (applyToSimilar && transaction.concept_normalized) {
          // Also create/update rule and apply to all matching transactions
          await createRuleAndApply.mutateAsync({
            pattern: transaction.concept_normalized,
            match_type: 'exact',
            category_id: selectedCategoryId,
            priority: 10,
            is_auto: false,
          })
        }
      }
      onSuccess?.()
      onClose()
    } catch {
      // Error handling is managed by react-query
    } finally {
      setSaving(false)
    }
  }, [
    selectedCategoryId,
    isBulk,
    bulkTransactionIds,
    bulkUpdate,
    transaction,
    applyToSimilar,
    createRuleAndApply,
    updateCategory,
    onSuccess,
    onClose,
  ])

  if (!open) return null

  // Separate expense and income categories
  const expenseCategories = categories.filter((c) => c.type === 'expense')
  const incomeCategories = categories.filter((c) => c.type === 'income')
  const transferCategories = categories.filter((c) => c.type === 'transfer')
  const otherCategories = categories.filter((c) => c.type === 'system')

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-black/40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal: bottom sheet on mobile, centered on desktop */}
      <div
        className={cn(
          'fixed z-[60] flex flex-col bg-card shadow-2xl',
          // Mobile: bottom sheet
          'inset-x-0 bottom-0 max-h-[85vh] rounded-t-2xl',
          // Desktop: centered dialog
          'md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2',
          'md:max-h-[80vh] md:w-full md:max-w-lg md:rounded-2xl'
        )}
        role="dialog"
        aria-modal="true"
        aria-label={isBulk ? `Clasificar ${bulkTransactionIds.length} transacciones` : 'Clasificar transaccion'}
      >
        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 md:hidden">
          <div className="h-1.5 w-10 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-2">
          <div className="min-w-0 flex-1">
            {isBulk ? (
              <>
                <h2 className="text-lg font-bold text-foreground">
                  Clasificar {bulkTransactionIds.length} transacciones
                </h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Selecciona una categoria para todas
                </p>
              </>
            ) : transaction ? (
              <>
                <h2 className="truncate text-lg font-bold text-foreground">
                  {transaction.concept}
                </h2>
                <div className="mt-0.5 flex items-center gap-3 text-sm text-muted-foreground">
                  <span
                    className={cn(
                      'font-semibold',
                      transaction.amount >= 0 ? 'text-success' : 'text-danger'
                    )}
                  >
                    {formatCurrency(transaction.amount)}
                  </span>
                  <span>{formatDate(transaction.date)}</span>
                </div>
              </>
            ) : null}
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* AI Suggestion */}
        {!isBulk && isUnclassified && (
          <div className="mx-5 mb-1">
            {aiLoading ? (
              <div className="flex items-center gap-2 rounded-xl bg-indigo-50 px-4 py-3">
                <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                <span className="text-xs text-indigo-700">Buscando sugerencia IA...</span>
              </div>
            ) : aiSuggestion ? (
              <button
                onClick={() => setSelectedCategoryId(aiSuggestion.categoryId)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all',
                  selectedCategoryId === aiSuggestion.categoryId
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50'
                )}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-indigo-900">
                      Sugerencia IA: {aiSuggestion.categoryName}
                    </span>
                    <span className="rounded-full bg-indigo-200 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                      {Math.round(aiSuggestion.confidence * 100)}%
                    </span>
                  </div>
                  <span className="text-[11px] text-indigo-600">
                    {aiSuggestion.source === 'lookup' ? 'Basada en clasificaciones anteriores' : 'Clasificacion por modelo IA'}
                  </span>
                </div>
                {selectedCategoryId === aiSuggestion.categoryId && (
                  <Check className="h-5 w-5 flex-shrink-0 text-indigo-600" />
                )}
              </button>
            ) : null}
          </div>
        )}

        {/* Category grid */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {expenseCategories.length > 0 && (
            <CategorySection
              label="Gastos"
              categories={expenseCategories}
              selectedId={selectedCategoryId}
              onSelect={setSelectedCategoryId}
            />
          )}
          {incomeCategories.length > 0 && (
            <CategorySection
              label="Ingresos"
              categories={incomeCategories}
              selectedId={selectedCategoryId}
              onSelect={setSelectedCategoryId}
            />
          )}
          {transferCategories.length > 0 && (
            <CategorySection
              label="Transferencias"
              categories={transferCategories}
              selectedId={selectedCategoryId}
              onSelect={setSelectedCategoryId}
            />
          )}
          {otherCategories.length > 0 && (
            <CategorySection
              label="Otros"
              categories={otherCategories}
              selectedId={selectedCategoryId}
              onSelect={setSelectedCategoryId}
            />
          )}
        </div>

        {/* Footer with toggle and button */}
        <div className="border-t border-border px-5 pt-4 modal-footer-safe">
          {/* Apply to similar toggle - only for single transaction */}
          {!isBulk && transaction && (
            <label className="mb-4 flex cursor-pointer items-center justify-between">
              <div className="mr-3">
                <span className="text-sm font-medium text-foreground">
                  Aplicar a todas las similares
                </span>
                <p className="text-xs text-muted-foreground">
                  Crea una regla para clasificar automaticamente
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={applyToSimilar}
                onClick={() => setApplyToSimilar(!applyToSimilar)}
                className={cn(
                  'relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors duration-200',
                  applyToSimilar ? 'bg-primary' : 'bg-muted'
                )}
              >
                <span
                  className={cn(
                    'inline-block h-5 w-5 translate-y-0.5 rounded-full bg-white shadow-sm transition-transform duration-200',
                    applyToSimilar ? 'translate-x-[22px]' : 'translate-x-0.5'
                  )}
                />
              </button>
            </label>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={!selectedCategoryId || saving}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all',
                selectedCategoryId && !saving
                  ? 'gradient-primary shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/30'
                  : 'cursor-not-allowed bg-muted text-muted-foreground'
              )}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Guardar
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Category Section ────────────────────────────────────────────────

function CategorySection({
  label,
  categories,
  selectedId,
  onSelect,
}: {
  label: string
  categories: Category[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  return (
    <div className="mb-4">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {categories.map((category) => {
          const isSelected = selectedId === category.id
          const color = category.color || '#6366f1'

          return (
            <button
              key={category.id}
              onClick={() => onSelect(category.id)}
              className={cn(
                'flex items-center gap-2.5 rounded-xl border-2 px-3 py-2.5 text-left transition-all duration-150',
                isSelected
                  ? 'shadow-sm'
                  : 'border-transparent bg-muted/50 hover:bg-muted'
              )}
              style={
                isSelected
                  ? {
                      borderColor: color,
                      backgroundColor: `${color}10`,
                    }
                  : undefined
              }
            >
              <div
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${color}20`, color }}
              >
                <CategoryIcon
                  iconName={category.icon}
                  className="h-4 w-4"
                />
              </div>
              <span className="truncate text-sm font-medium text-foreground">
                {category.name}
              </span>
              {isSelected && (
                <Check
                  className="ml-auto h-4 w-4 flex-shrink-0"
                  style={{ color }}
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Re-export for use in the page
export { iconMap }
export type { ClassificationModalProps }
