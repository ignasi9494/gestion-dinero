'use client'

import { useState, useMemo } from 'react'
import {
  Plus,
  Pencil,
  ChevronDown,
  ChevronRight,
  X,
  Loader2,
  Check,
  Trash2,
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
  Tags,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from '@/lib/hooks/useCategories'
import {
  useClassificationRules,
  useCreateRule,
  useDeleteRule,
} from '@/lib/hooks/useClassificationRules'
import type { Category } from '@/lib/supabase/types'

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

const iconNames = Object.keys(iconMap)

const PRESET_COLORS = [
  '#22c55e', '#f97316', '#8b5cf6', '#3b82f6', '#ef4444', '#eab308',
  '#ec4899', '#64748b', '#0ea5e9', '#a855f7', '#78716c', '#b45309',
  '#dc2626', '#06b6d4', '#f59e0b', '#d946ef', '#65a30d', '#737373',
]

const TYPE_TABS: { key: Category['type']; label: string }[] = [
  { key: 'expense', label: 'Gastos' },
  { key: 'income', label: 'Ingresos' },
  { key: 'transfer', label: 'Transferencias' },
]

const MATCH_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'contains', label: 'Contiene' },
  { value: 'exact', label: 'Exacto' },
  { value: 'starts_with', label: 'Empieza por' },
  { value: 'regex', label: 'Regex' },
]

const MATCH_TYPE_LABELS: Record<string, string> = {
  contains: 'Contiene',
  exact: 'Exacto',
  starts_with: 'Empieza por',
  regex: 'Regex',
}

// ─── CategoryIcon helper ─────────────────────────────────────────────

function CategoryIcon({
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

// ─── Main Page ───────────────────────────────────────────────────────

export default function CategoriesPage() {
  const [activeTab, setActiveTab] = useState<Category['type']>('expense')
  const { data: categories = [], isLoading } = useCategories({ activeOnly: false })
  const { data: allRules = [] } = useClassificationRules()

  // Modal state
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)

  // Expanded categories (to show rules)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  // Rule modal state
  const [showRuleModal, setShowRuleModal] = useState(false)
  const [ruleCategoryId, setRuleCategoryId] = useState<string | null>(null)

  // Build rules count map
  const rulesCountMap = useMemo(() => {
    const map: Record<string, number> = {}
    for (const rule of allRules) {
      map[rule.category_id] = (map[rule.category_id] || 0) + 1
    }
    return map
  }, [allRules])

  // Filter categories by active tab
  const filteredCategories = useMemo(
    () => categories.filter((c) => c.type === activeTab),
    [categories, activeTab]
  )

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const openCreate = () => {
    setEditingCategory(null)
    setShowCategoryModal(true)
  }

  const openEdit = (category: Category) => {
    setEditingCategory(category)
    setShowCategoryModal(true)
  }

  const openAddRule = (categoryId: string) => {
    setRuleCategoryId(categoryId)
    setShowRuleModal(true)
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Categorias</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Gestiona tus categorias y reglas de clasificacion
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nueva categoria</span>
          <span className="sm:hidden">Nueva</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800/50">
        {TYPE_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all',
              activeTab === tab.key
                ? 'bg-white text-indigo-600 shadow-sm dark:bg-gray-700 dark:text-indigo-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Category list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-gray-200 py-16 dark:border-gray-700">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-900/30">
            <Tags className="h-6 w-6 text-indigo-500" />
          </div>
          <p className="text-sm text-muted-foreground">
            No hay categorias de este tipo
          </p>
          <button
            onClick={openCreate}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            Crear una categoria
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCategories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              ruleCount={rulesCountMap[category.id] || 0}
              isExpanded={expandedIds.has(category.id)}
              onToggleExpand={() => toggleExpand(category.id)}
              onEdit={() => openEdit(category)}
              onAddRule={() => openAddRule(category.id)}
              allRules={allRules.filter((r) => r.category_id === category.id)}
            />
          ))}
        </div>
      )}

      {/* Category Create/Edit Modal */}
      {showCategoryModal && (
        <CategoryModal
          category={editingCategory}
          defaultType={activeTab}
          onClose={() => setShowCategoryModal(false)}
        />
      )}

      {/* Add Rule Modal */}
      {showRuleModal && ruleCategoryId && (
        <RuleModal
          categoryId={ruleCategoryId}
          onClose={() => {
            setShowRuleModal(false)
            setRuleCategoryId(null)
          }}
        />
      )}
    </div>
  )
}

// ─── Category Card ───────────────────────────────────────────────────

function CategoryCard({
  category,
  ruleCount,
  isExpanded,
  onToggleExpand,
  onEdit,
  onAddRule,
  allRules,
}: {
  category: Category
  ruleCount: number
  isExpanded: boolean
  onToggleExpand: () => void
  onEdit: () => void
  onAddRule: () => void
  allRules: { id: string; pattern: string; match_type: string }[]
}) {
  const deleteCategory = useDeleteCategory()
  const deleteRule = useDeleteRule()
  const color = category.color || '#6366f1'
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleDeleteCategory = () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    deleteCategory.mutate(category.id)
    setConfirmDelete(false)
  }

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl bg-white shadow-sm transition-shadow dark:bg-gray-800/60',
        !category.is_active && 'opacity-60'
      )}
    >
      {/* Category header row */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Icon */}
        <div
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${color}15`, color }}
        >
          <CategoryIcon iconName={category.icon} className="h-5 w-5" />
        </div>

        {/* Name and badge */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-foreground">
              {category.name}
            </span>
            {!category.is_active && (
              <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                Inactiva
              </span>
            )}
          </div>
          {ruleCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {ruleCount} {ruleCount === 1 ? 'regla' : 'reglas'}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={onEdit}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
            title="Editar categoria"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={handleDeleteCategory}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
              confirmDelete
                ? 'bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50'
                : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300'
            )}
            title={confirmDelete ? 'Confirmar desactivar' : 'Desactivar categoria'}
            onBlur={() => setConfirmDelete(false)}
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            onClick={onToggleExpand}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
            title={isExpanded ? 'Ocultar reglas' : 'Ver reglas'}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded rules section */}
      {isExpanded && (
        <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-3 dark:border-gray-700/50 dark:bg-gray-800/30">
          {allRules.length === 0 ? (
            <p className="py-2 text-center text-xs text-muted-foreground">
              No hay reglas para esta categoria
            </p>
          ) : (
            <div className="space-y-2">
              {allRules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 dark:bg-gray-800/60"
                >
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                    {rule.pattern}
                  </span>
                  <span className="flex-shrink-0 rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                    {MATCH_TYPE_LABELS[rule.match_type] || rule.match_type}
                  </span>
                  <button
                    onClick={() => deleteRule.mutate(rule.id)}
                    className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/30"
                    title="Eliminar regla"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={onAddRule}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-200 py-2 text-xs font-medium text-indigo-600 transition-colors hover:border-indigo-300 hover:bg-indigo-50/50 dark:border-gray-600 dark:hover:border-indigo-700 dark:hover:bg-indigo-900/20"
          >
            <Plus className="h-3.5 w-3.5" />
            Anadir regla
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Category Create/Edit Modal ──────────────────────────────────────

function CategoryModal({
  category,
  defaultType,
  onClose,
}: {
  category: Category | null
  defaultType: Category['type']
  onClose: () => void
}) {
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()

  const isEditing = !!category
  const [name, setName] = useState(category?.name ?? '')
  const [type, setType] = useState<Category['type']>(category?.type ?? defaultType)
  const [icon, setIcon] = useState(category?.icon ?? 'circle')
  const [color, setColor] = useState(category?.color ?? '#6366f1')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)

    try {
      if (isEditing && category) {
        await updateCategory.mutateAsync({
          id: category.id,
          updates: {
            name: name.trim(),
            type,
            icon,
            color,
          },
        })
      } else {
        await createCategory.mutateAsync({
          name: name.trim(),
          type,
          icon,
          color,
        })
      }
      onClose()
    } catch {
      // Error handled by react-query
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className={cn(
          'fixed z-50 flex flex-col bg-white shadow-2xl dark:bg-gray-800',
          'inset-x-0 bottom-0 max-h-[90vh] rounded-t-2xl',
          'md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2',
          'md:max-h-[85vh] md:w-full md:max-w-lg md:rounded-2xl'
        )}
        role="dialog"
        aria-modal="true"
        aria-label={isEditing ? 'Editar categoria' : 'Nueva categoria'}
      >
        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 md:hidden">
          <div className="h-1.5 w-10 rounded-full bg-gray-300 dark:bg-gray-600" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h2 className="text-lg font-bold text-foreground">
            {isEditing ? 'Editar categoria' : 'Nueva categoria'}
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {/* Preview */}
          <div className="mb-5 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-2xl"
                style={{ backgroundColor: `${color}20`, color }}
              >
                <CategoryIcon iconName={icon} className="h-8 w-8" />
              </div>
              <span className="text-sm font-medium text-foreground">
                {name || 'Nombre'}
              </span>
            </div>
          </div>

          {/* Name input */}
          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Nombre
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Supermercado"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-foreground placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-700 dark:placeholder:text-gray-500"
              autoFocus
            />
          </div>

          {/* Type selector */}
          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Tipo
            </label>
            <div className="flex gap-2">
              {[
                { key: 'expense' as const, label: 'Gasto' },
                { key: 'income' as const, label: 'Ingreso' },
                { key: 'transfer' as const, label: 'Transferencia' },
              ].map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setType(opt.key)}
                  className={cn(
                    'flex-1 rounded-xl border-2 px-3 py-2 text-sm font-medium transition-all',
                    type === opt.key
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300 dark:border-gray-600 dark:text-gray-400'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Icon picker */}
          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Icono
            </label>
            <div className="grid grid-cols-7 gap-1.5 sm:grid-cols-9">
              {iconNames.map((name) => {
                const IconComp = iconMap[name]
                const isSelected = icon === name
                return (
                  <button
                    key={name}
                    onClick={() => setIcon(name)}
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-xl transition-all',
                      isSelected
                        ? 'ring-2 ring-indigo-500 ring-offset-1'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                    )}
                    style={
                      isSelected
                        ? { backgroundColor: `${color}20`, color }
                        : undefined
                    }
                    title={name}
                  >
                    <IconComp className="h-5 w-5" />
                  </button>
                )
              })}
            </div>
          </div>

          {/* Color picker */}
          <div className="mb-2">
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full transition-all',
                    color === c
                      ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-800'
                      : 'hover:scale-110'
                  )}
                  style={{
                    backgroundColor: c,
                    ...(color === c ? { ringColor: c } : {}),
                  }}
                  title={c}
                >
                  {color === c && <Check className="h-4 w-4 text-white" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-5 py-4 dark:border-gray-700">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={!name.trim() || saving}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all',
                name.trim() && !saving
                  ? 'bg-indigo-600 shadow-sm hover:bg-indigo-700'
                  : 'cursor-not-allowed bg-gray-300 dark:bg-gray-600'
              )}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {isEditing ? 'Guardar' : 'Crear'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Add Rule Modal ──────────────────────────────────────────────────

function RuleModal({
  categoryId,
  onClose,
}: {
  categoryId: string
  onClose: () => void
}) {
  const createRule = useCreateRule()

  const [pattern, setPattern] = useState('')
  const [matchType, setMatchType] = useState<'contains' | 'exact' | 'starts_with' | 'regex'>('contains')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!pattern.trim()) return
    setSaving(true)

    try {
      await createRule.mutateAsync({
        pattern: pattern.trim(),
        match_type: matchType,
        category_id: categoryId,
        priority: 10,
        is_auto: false,
      })
      onClose()
    } catch {
      // Error handled by react-query
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className={cn(
          'fixed z-50 flex flex-col bg-white shadow-2xl dark:bg-gray-800',
          'inset-x-0 bottom-0 max-h-[80vh] rounded-t-2xl',
          'md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2',
          'md:w-full md:max-w-md md:rounded-2xl'
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Anadir regla"
      >
        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 md:hidden">
          <div className="h-1.5 w-10 rounded-full bg-gray-300 dark:bg-gray-600" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h2 className="text-lg font-bold text-foreground">Anadir regla</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-3">
          {/* Pattern input */}
          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Patron de texto
            </label>
            <input
              type="text"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              placeholder="Ej: MERCADONA, BIZUM..."
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-foreground placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-700 dark:placeholder:text-gray-500"
              autoFocus
            />
          </div>

          {/* Match type selector */}
          <div className="mb-2">
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Tipo de coincidencia
            </label>
            <select
              value={matchType}
              onChange={(e) => setMatchType(e.target.value as typeof matchType)}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-foreground focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-700"
            >
              {MATCH_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-5 py-4 dark:border-gray-700">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={!pattern.trim() || saving}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all',
                pattern.trim() && !saving
                  ? 'bg-indigo-600 shadow-sm hover:bg-indigo-700'
                  : 'cursor-not-allowed bg-gray-300 dark:bg-gray-600'
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
