import { create } from 'zustand'

type CelebrationType = 'goal_complete' | 'achievement_unlocked' | 'streak'

interface CelebrationsState {
  showCelebration: boolean
  celebrationType: CelebrationType | null
  celebrationData: {
    title: string
    description: string
    icon?: string
    color?: string
  } | null
  triggerCelebration: (
    type: CelebrationType,
    data: { title: string; description: string; icon?: string; color?: string }
  ) => void
  dismissCelebration: () => void
}

export const useCelebrationsStore = create<CelebrationsState>((set) => ({
  showCelebration: false,
  celebrationType: null,
  celebrationData: null,
  triggerCelebration: (type, data) =>
    set({
      showCelebration: true,
      celebrationType: type,
      celebrationData: data,
    }),
  dismissCelebration: () =>
    set({
      showCelebration: false,
      celebrationType: null,
      celebrationData: null,
    }),
}))
