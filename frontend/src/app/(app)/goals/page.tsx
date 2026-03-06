'use client'

import { useState } from 'react'
import {
  Target,
  Plus,
  Flame,
  Trophy,
  Loader2,
  X,
  Sparkles,
} from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import {
  useSavingsGoals,
  useCreateGoal,
  useAddSavings,
  useDeleteGoal,
  useSavingsStreak,
} from '@/lib/hooks/useSavingsGoals'
import {
  useAchievements,
  useUnlockAchievement,
} from '@/lib/hooks/useAchievements'
import { useCelebrationsStore } from '@/lib/stores/celebrations-store'
import { GoalCard } from './components/goal-card'
import { AddSavingsModal } from './components/add-savings-modal'
import { AchievementsGrid } from './components/achievements-grid'
import type { SavingsGoal } from '@/lib/supabase/types'

// ─── Goal Templates ──────────────────────────────────────────────

const GOAL_TEMPLATES = [
  { name: 'Fondo de emergencia', icon: '🛡️', color: '#22c55e', target: 3000 },
  { name: 'Vacaciones', icon: '✈️', color: '#3b82f6', target: 2000 },
  { name: 'Coche nuevo', icon: '🚗', color: '#f97316', target: 15000 },
  { name: 'Tecnologia', icon: '💻', color: '#8b5cf6', target: 1000 },
]

// ─── Main Page ───────────────────────────────────────────────────

export default function GoalsPage() {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null)

  const { data: goals = [], isLoading: goalsLoading } = useSavingsGoals()
  const { data: streak } = useSavingsStreak()
  const { data: achievements = [] } = useAchievements()

  const createGoal = useCreateGoal()
  const addSavings = useAddSavings()
  const deleteGoal = useDeleteGoal()
  const unlockAchievement = useUnlockAchievement()
  const triggerCelebration = useCelebrationsStore((s) => s.triggerCelebration)

  const activeGoals = goals.filter((g) => !g.is_completed && g.is_active)
  const completedGoals = goals.filter((g) => g.is_completed)
  const totalSaved = goals.reduce((sum, g) => sum + (g.current_amount || 0), 0)
  const selectedGoal = goals.find((g) => g.id === selectedGoalId) ?? null

  // ─── Handlers ────────────────────────────────────────────────

  const handleAddSavings = async (goalId: string, amount: number) => {
    const result = await addSavings.mutateAsync({ goalId, amount })

    // Check achievements
    const updatedGoals = goals.map((g) =>
      g.id === goalId ? { ...g, current_amount: result.current_amount } : g
    )
    const activeCount = updatedGoals.filter(
      (g) => !g.is_completed && g.is_active
    ).length

    // First goal achievement
    if (activeCount >= 1) {
      unlockAchievement.mutate({ achievementType: 'first_goal' })
    }

    // Multi-goal achievement
    if (activeCount >= 3) {
      unlockAchievement.mutate({ achievementType: 'multi_goal' })
    }

    // Saver achievements
    if (result.current_amount >= 500) {
      unlockAchievement.mutate({ achievementType: 'saver_500' })
    }
    if (result.current_amount >= 1000) {
      unlockAchievement.mutate({ achievementType: 'saver_1000' })
    }

    // Goal completed celebration
    if (result.justCompleted) {
      unlockAchievement.mutate({ achievementType: 'goal_completed' })
      const goal = goals.find((g) => g.id === goalId)
      triggerCelebration('goal_complete', {
        title: 'Objetivo completado!',
        description: `Has alcanzado ${formatCurrency(goal?.target_amount ?? 0)} en "${goal?.name}"`,
        color: goal?.color || '#22c55e',
      })
    }

    setSelectedGoalId(null)
  }

  const handleCreateGoal = async (goalData: {
    name: string
    target_amount: number
    description?: string
    color?: string
    deadline?: string
  }) => {
    await createGoal.mutateAsync(goalData)

    // Check first goal achievement
    if (activeGoals.length === 0) {
      unlockAchievement.mutate({ achievementType: 'first_goal' })
      triggerCelebration('achievement_unlocked', {
        title: 'Primer objetivo!',
        description: 'Has creado tu primer objetivo de ahorro',
        color: '#6366f1',
      })
    }

    setShowCreateForm(false)
  }

  // ─── Loading ─────────────────────────────────────────────────

  if (goalsLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:py-10">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Objetivos de ahorro
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {activeGoals.length > 0
              ? `${activeGoals.length} objetivo${activeGoals.length !== 1 ? 's' : ''} activo${activeGoals.length !== 1 ? 's' : ''}`
              : 'Crea tu primer objetivo'}
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 rounded-xl gradient-primary px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/25 transition-all hover:shadow-lg active:scale-95"
        >
          <Plus className="h-4 w-4" />
          Nuevo
        </button>
      </div>

      {/* ── Stats Row ───────────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        {/* Total Saved */}
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <p className="text-xs text-muted-foreground">Total ahorrado</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-foreground">
            {formatCurrency(totalSaved)}
          </p>
        </div>

        {/* Active Goals */}
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <div className="flex items-center justify-center gap-1">
            <Target className="h-3.5 w-3.5 text-primary" />
            <p className="text-xs text-muted-foreground">Activos</p>
          </div>
          <p className="mt-1 text-lg font-bold tabular-nums text-foreground">
            {activeGoals.length}
          </p>
        </div>

        {/* Streak */}
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <div className="flex items-center justify-center gap-1">
            <Flame className="h-3.5 w-3.5 text-amber-500" />
            <p className="text-xs text-muted-foreground">Racha</p>
          </div>
          <p className="mt-1 text-lg font-bold tabular-nums text-foreground">
            {streak?.current_streak ?? 0}
            <span className="ml-0.5 text-xs font-medium text-muted-foreground">
              meses
            </span>
          </p>
        </div>
      </div>

      {/* ── Active Goals ────────────────────────────────────── */}
      {activeGoals.length > 0 ? (
        <div className="space-y-3">
          {activeGoals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onAddSavings={(id) => setSelectedGoalId(id)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border-2 border-dashed border-border bg-card/50 p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Sparkles className="h-7 w-7 text-primary" />
          </div>
          <h3 className="text-base font-bold text-foreground">
            Empieza a ahorrar
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Crea tu primer objetivo y comienza a construir tu futuro financiero
          </p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="mt-4 rounded-xl gradient-primary px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/25 transition-all hover:shadow-lg active:scale-95"
          >
            Crear objetivo
          </button>
        </div>
      )}

      {/* ── Completed Goals ─────────────────────────────────── */}
      {completedGoals.length > 0 && (
        <div className="mt-8">
          <div className="mb-3 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-bold text-foreground">
              Completados ({completedGoals.length})
            </h2>
          </div>
          <div className="space-y-2">
            {completedGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onAddSavings={() => {}}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Achievements ────────────────────────────────────── */}
      <div className="mt-8">
        <div className="mb-3 flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold text-foreground">Logros</h2>
          <span className="ml-auto text-xs text-muted-foreground">
            {achievements.length}/{8} desbloqueados
          </span>
        </div>
        <AchievementsGrid achievements={achievements} />
      </div>

      {/* ── Create Goal Modal ───────────────────────────────── */}
      {showCreateForm && (
        <CreateGoalModal
          onClose={() => setShowCreateForm(false)}
          onSave={handleCreateGoal}
          saving={createGoal.isPending}
        />
      )}

      {/* ── Add Savings Modal ───────────────────────────────── */}
      <AddSavingsModal
        goal={selectedGoal}
        open={!!selectedGoalId}
        onClose={() => setSelectedGoalId(null)}
        onSave={handleAddSavings}
        saving={addSavings.isPending}
      />
    </div>
  )
}

// ─── Create Goal Modal ───────────────────────────────────────────

function CreateGoalModal({
  onClose,
  onSave,
  saving,
}: {
  onClose: () => void
  onSave: (data: {
    name: string
    target_amount: number
    description?: string
    color?: string
    deadline?: string
  }) => Promise<void>
  saving: boolean
}) {
  const [name, setName] = useState('')
  const [targetAmount, setTargetAmount] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('#6366f1')
  const [deadline, setDeadline] = useState('')

  const parsedAmount = parseFloat(targetAmount)
  const isValid = name.trim().length > 0 && !isNaN(parsedAmount) && parsedAmount > 0

  const handleSubmit = async () => {
    if (!isValid) return
    await onSave({
      name: name.trim(),
      target_amount: parsedAmount,
      description: description.trim() || undefined,
      color,
      deadline: deadline || undefined,
    })
  }

  const handleTemplate = (template: (typeof GOAL_TEMPLATES)[0]) => {
    setName(template.name)
    setTargetAmount(String(template.target))
    setColor(template.color)
  }

  const COLORS = [
    '#6366f1', '#3b82f6', '#22c55e', '#f97316', '#ec4899',
    '#8b5cf6', '#06b6d4', '#eab308',
  ]

  return (
    <>
      <div
        className="fixed inset-0 z-[60] bg-black/40"
        onClick={onClose}
      />
      <div
        className={cn(
          'fixed z-[60] flex flex-col bg-card shadow-2xl',
          'inset-x-0 bottom-0 max-h-[85vh] rounded-t-2xl',
          'md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2',
          'md:max-h-[80vh] md:w-full md:max-w-md md:rounded-2xl'
        )}
      >
        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 md:hidden">
          <div className="h-1.5 w-10 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <h3 className="text-base font-bold text-foreground">
            Nuevo objetivo
          </h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5">
          {/* Templates */}
          <div className="mb-4">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Plantillas rapidas
            </p>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {GOAL_TEMPLATES.map((t) => (
                <button
                  key={t.name}
                  onClick={() => handleTemplate(t)}
                  className="flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                >
                  <span>{t.icon}</span>
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div className="mb-3">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Nombre *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Vacaciones de verano"
              className="h-11 w-full rounded-xl border border-border bg-card px-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Amount */}
          <div className="mb-3">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Cantidad objetivo (EUR) *
            </label>
            <input
              type="number"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              placeholder="2000"
              step="100"
              min="1"
              className="h-11 w-full rounded-xl border border-border bg-card px-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Description */}
          <div className="mb-3">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Descripcion (opcional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripcion breve..."
              className="h-11 w-full rounded-xl border border-border bg-card px-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Deadline */}
          <div className="mb-3">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Fecha limite (opcional)
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="h-11 w-full rounded-xl border border-border bg-card px-4 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Color */}
          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Color
            </label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={cn(
                    'h-8 w-8 rounded-full transition-all',
                    color === c
                      ? 'ring-2 ring-offset-2 ring-offset-card scale-110'
                      : 'hover:scale-105'
                  )}
                  style={{ backgroundColor: c, '--tw-ring-color': c } as React.CSSProperties}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 pb-4 pt-3 modal-footer-safe">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValid || saving}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white transition-all',
              isValid && !saving
                ? 'gradient-primary shadow-md shadow-primary/25 hover:shadow-lg active:scale-95'
                : 'cursor-not-allowed bg-muted text-muted-foreground'
            )}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Crear objetivo'
            )}
          </button>
        </div>
      </div>
    </>
  )
}
