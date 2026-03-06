'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Achievement } from '@/lib/supabase/types'

// ─── Achievement definitions ──────────────────────────────────────

export interface AchievementDefinition {
  type: string
  name: string
  description: string
  icon: string
  hint: string
}

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    type: 'first_goal',
    name: 'Primer objetivo',
    description: 'Creaste tu primer objetivo de ahorro',
    icon: 'target',
    hint: 'Crea tu primer objetivo de ahorro',
  },
  {
    type: 'goal_completed',
    name: 'Objetivo cumplido',
    description: 'Completaste un objetivo de ahorro',
    icon: 'trophy',
    hint: 'Completa un objetivo de ahorro',
  },
  {
    type: 'saver_500',
    name: 'Ahorrador 500',
    description: 'Ahorraste mas de 500 EUR en un objetivo',
    icon: 'piggy-bank',
    hint: 'Ahorra mas de 500 EUR en un objetivo',
  },
  {
    type: 'saver_1000',
    name: 'Ahorrador 1000',
    description: 'Ahorraste mas de 1.000 EUR en un objetivo',
    icon: 'banknote',
    hint: 'Ahorra mas de 1.000 EUR en un objetivo',
  },
  {
    type: 'multi_goal',
    name: 'Multitarea',
    description: 'Tienes 3 o mas objetivos activos',
    icon: 'list-checks',
    hint: 'Ten 3 o mas objetivos activos a la vez',
  },
  {
    type: 'budget_master',
    name: 'Maestro del presupuesto',
    description: 'Todos tus presupuestos dentro del limite',
    icon: 'wallet',
    hint: 'Mantente dentro de todos tus presupuestos',
  },
  {
    type: 'classifier_pro',
    name: 'Clasificador pro',
    description: 'Mas de 100 transacciones clasificadas',
    icon: 'tags',
    hint: 'Clasifica mas de 100 transacciones',
  },
  {
    type: 'consistent_saver',
    name: 'Ahorro constante',
    description: 'Anadiste ahorro durante 3 meses seguidos',
    icon: 'flame',
    hint: 'Anade ahorro durante 3 meses consecutivos',
  },
]

// ─── Query keys ───────────────────────────────────────────────────

export const achievementKeys = {
  all: ['achievements'] as const,
  list: () => [...achievementKeys.all, 'list'] as const,
}

// ─── Fetch achievements ───────────────────────────────────────────

export function useAchievements() {
  const supabase = createClient()

  return useQuery<Achievement[]>({
    queryKey: achievementKeys.list(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('achievements')
        .select('*')
        .order('unlocked_at', { ascending: false })

      if (error) throw error
      return data ?? []
    },
  })
}

// ─── Unlock achievement ───────────────────────────────────────────

export function useUnlockAchievement() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      achievementType,
    }: {
      achievementType: string
    }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const def = ACHIEVEMENT_DEFINITIONS.find((d) => d.type === achievementType)
      if (!def) throw new Error('Unknown achievement type')

      const { data, error } = await supabase
        .from('achievements')
        .upsert(
          {
            user_id: user.id,
            achievement_type: achievementType,
            name: def.name,
            description: def.description,
            icon: def.icon,
          },
          { onConflict: 'user_id,achievement_type' }
        )
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: achievementKeys.all })
    },
  })
}
