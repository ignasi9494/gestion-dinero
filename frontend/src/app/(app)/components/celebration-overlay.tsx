'use client'

import { useEffect, useMemo } from 'react'
import { Trophy, Target, Flame } from 'lucide-react'
import { useCelebrationsStore } from '@/lib/stores/celebrations-store'

const CONFETTI_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316',
  '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#a855f7',
]

export function CelebrationOverlay() {
  const { showCelebration, celebrationType, celebrationData, dismissCelebration } =
    useCelebrationsStore()

  // Auto-dismiss after 4 seconds
  useEffect(() => {
    if (!showCelebration) return
    const timer = setTimeout(dismissCelebration, 4000)
    return () => clearTimeout(timer)
  }, [showCelebration, dismissCelebration])

  // Haptic feedback
  useEffect(() => {
    if (showCelebration && navigator.vibrate) {
      navigator.vibrate([50, 30, 50])
    }
  }, [showCelebration])

  // Generate confetti pieces
  const confettiPieces = useMemo(() => {
    return Array.from({ length: 40 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      size: 4 + Math.random() * 8,
      delay: Math.random() * 1.5,
      duration: 2 + Math.random() * 2,
      rotation: Math.random() * 720 - 360,
    }))
  }, [])

  if (!showCelebration || !celebrationData) return null

  const Icon =
    celebrationType === 'goal_complete'
      ? Trophy
      : celebrationType === 'streak'
        ? Flame
        : Target

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      onClick={dismissCelebration}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/50 animate-fade-in" />

      {/* Confetti */}
      {confettiPieces.map((piece) => (
        <div
          key={piece.id}
          className="absolute top-0 animate-confetti-fall"
          style={{
            left: piece.left,
            width: `${piece.size}px`,
            height: `${piece.size * 0.6}px`,
            backgroundColor: piece.color,
            borderRadius: '2px',
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
            transform: `rotate(${piece.rotation}deg)`,
          }}
        />
      ))}

      {/* Central card */}
      <div className="relative z-10 mx-8 animate-celebration-pop rounded-3xl bg-card p-8 text-center shadow-2xl">
        <div className="mb-4 flex justify-center">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-2xl animate-celebration-icon"
            style={{
              background: `linear-gradient(135deg, ${celebrationData.color || '#6366f1'}, ${celebrationData.color || '#6366f1'}88)`,
            }}
          >
            <Icon className="h-8 w-8 text-white" />
          </div>
        </div>
        <h2 className="text-xl font-bold text-foreground">
          {celebrationData.title}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {celebrationData.description}
        </p>
      </div>
    </div>
  )
}
