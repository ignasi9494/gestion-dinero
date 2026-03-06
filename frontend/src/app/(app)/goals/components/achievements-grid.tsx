'use client'

import {
  Target,
  Trophy,
  PiggyBank,
  Banknote,
  ListChecks,
  Wallet,
  Tags,
  Flame,
  Lock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  ACHIEVEMENT_DEFINITIONS,
  type AchievementDefinition,
} from '@/lib/hooks/useAchievements'
import type { Achievement } from '@/lib/supabase/types'

const ICON_MAP: Record<string, React.ElementType> = {
  target: Target,
  trophy: Trophy,
  'piggy-bank': PiggyBank,
  banknote: Banknote,
  'list-checks': ListChecks,
  wallet: Wallet,
  tags: Tags,
  flame: Flame,
}

const ICON_COLORS: Record<string, string> = {
  target: '#6366f1',
  trophy: '#eab308',
  'piggy-bank': '#22c55e',
  banknote: '#10b981',
  'list-checks': '#3b82f6',
  wallet: '#8b5cf6',
  tags: '#ec4899',
  flame: '#f97316',
}

interface AchievementsGridProps {
  achievements: Achievement[]
}

export function AchievementsGrid({ achievements }: AchievementsGridProps) {
  const unlockedTypes = new Set(achievements.map((a) => a.achievement_type))

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {ACHIEVEMENT_DEFINITIONS.map((def) => {
        const unlocked = unlockedTypes.has(def.type)
        return (
          <AchievementBadge
            key={def.type}
            definition={def}
            unlocked={unlocked}
          />
        )
      })}
    </div>
  )
}

function AchievementBadge({
  definition,
  unlocked,
}: {
  definition: AchievementDefinition
  unlocked: boolean
}) {
  const Icon = ICON_MAP[definition.icon] || Target
  const color = ICON_COLORS[definition.icon] || '#6366f1'

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition-all',
        unlocked
          ? 'border-border bg-card shadow-sm'
          : 'border-dashed border-muted bg-muted/30'
      )}
    >
      <div
        className={cn(
          'flex h-12 w-12 items-center justify-center rounded-xl transition-all',
          unlocked ? 'scale-100' : 'scale-90 opacity-40'
        )}
        style={{
          backgroundColor: unlocked ? `${color}15` : undefined,
          color: unlocked ? color : undefined,
        }}
      >
        {unlocked ? (
          <Icon className="h-6 w-6" />
        ) : (
          <Lock className="h-5 w-5 text-muted-foreground/50" />
        )}
      </div>

      <div>
        <p
          className={cn(
            'text-xs font-semibold',
            unlocked ? 'text-foreground' : 'text-muted-foreground/60'
          )}
        >
          {definition.name}
        </p>
        <p className="mt-0.5 text-[10px] text-muted-foreground">
          {unlocked ? definition.description : definition.hint}
        </p>
      </div>
    </div>
  )
}
