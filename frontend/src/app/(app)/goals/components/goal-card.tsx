'use client'

import { Plus, Calendar, Check } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { differenceInDays, parseISO } from 'date-fns'
import type { SavingsGoal } from '@/lib/supabase/types'

// ─── Progress Ring ────────────────────────────────────────────────

function ProgressRing({
  percentage,
  size = 100,
  strokeWidth = 8,
  color,
}: {
  percentage: number
  size?: number
  strokeWidth?: number
  color: string
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.min(percentage, 100) / 100) * circumference

  return (
    <svg width={size} height={size} className="flex-shrink-0">
      {/* Background circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-muted/50"
      />
      {/* Progress circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="transition-all duration-1000 ease-out"
      />
      {/* Center text */}
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-foreground text-lg font-bold"
      >
        {Math.round(percentage)}%
      </text>
    </svg>
  )
}

// ─── Goal Card ────────────────────────────────────────────────────

interface GoalCardProps {
  goal: SavingsGoal
  onAddSavings: (goalId: string) => void
}

export function GoalCard({ goal, onAddSavings }: GoalCardProps) {
  const percentage = goal.target_amount > 0
    ? (goal.current_amount / goal.target_amount) * 100
    : 0
  const color = goal.color || '#6366f1'
  const remaining = goal.target_amount - goal.current_amount

  // Deadline info
  let deadlineText = ''
  let deadlineUrgent = false
  if (goal.deadline) {
    const daysLeft = differenceInDays(parseISO(goal.deadline), new Date())
    if (daysLeft < 0) {
      deadlineText = 'Plazo vencido'
      deadlineUrgent = true
    } else if (daysLeft === 0) {
      deadlineText = 'Vence hoy'
      deadlineUrgent = true
    } else if (daysLeft <= 30) {
      deadlineText = `Quedan ${daysLeft} dias`
      deadlineUrgent = true
    } else {
      deadlineText = `Quedan ${daysLeft} dias`
    }
  }

  if (goal.is_completed) {
    return (
      <div className="rounded-2xl border-2 border-success/30 bg-success/5 p-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-success/20">
            <Check className="h-7 w-7 text-success" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-foreground">{goal.name}</p>
            <p className="text-sm text-success font-medium">
              Completado - {formatCurrency(goal.target_amount)}
            </p>
            {goal.description && (
              <p className="mt-0.5 text-xs text-muted-foreground truncate">
                {goal.description}
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="rounded-2xl border border-border bg-card p-4 transition-shadow hover:shadow-md"
      style={{ borderLeftColor: color, borderLeftWidth: '3px' }}
    >
      <div className="flex items-center gap-4">
        <ProgressRing percentage={percentage} color={color} />

        <div className="min-w-0 flex-1">
          <p className="font-bold text-foreground">{goal.name}</p>
          {goal.description && (
            <p className="mt-0.5 text-xs text-muted-foreground truncate">
              {goal.description}
            </p>
          )}
          <div className="mt-2 flex items-center gap-2 text-sm">
            <span className="font-semibold tabular-nums" style={{ color }}>
              {formatCurrency(goal.current_amount)}
            </span>
            <span className="text-muted-foreground">
              / {formatCurrency(goal.target_amount)}
            </span>
          </div>
          {remaining > 0 && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Faltan {formatCurrency(remaining)}
            </p>
          )}
          {deadlineText && (
            <div className="mt-1 flex items-center gap-1">
              <Calendar className="h-3 w-3 text-muted-foreground" />
              <span
                className={cn(
                  'text-xs',
                  deadlineUrgent ? 'font-medium text-amber-600' : 'text-muted-foreground'
                )}
              >
                {deadlineText}
              </span>
            </div>
          )}
        </div>

        {/* Quick add button */}
        <button
          onClick={() => onAddSavings(goal.id)}
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl transition-all hover:scale-110 active:scale-95"
          style={{ backgroundColor: `${color}15`, color }}
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}

export { ProgressRing }
