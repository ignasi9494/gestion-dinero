'use client'

import { useState } from 'react'
import { X, PiggyBank, Loader2 } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import type { SavingsGoal } from '@/lib/supabase/types'

interface AddSavingsModalProps {
  goal: SavingsGoal | null
  open: boolean
  onClose: () => void
  onSave: (goalId: string, amount: number) => Promise<void>
  saving: boolean
}

const QUICK_AMOUNTS = [10, 25, 50, 100, 200, 500]

export function AddSavingsModal({
  goal,
  open,
  onClose,
  onSave,
  saving,
}: AddSavingsModalProps) {
  const [amount, setAmount] = useState('')
  const [customMode, setCustomMode] = useState(false)

  if (!open || !goal) return null

  const remaining = goal.target_amount - goal.current_amount
  const parsedAmount = parseFloat(amount)
  const isValid = !isNaN(parsedAmount) && parsedAmount > 0

  const handleQuickAmount = async (value: number) => {
    await onSave(goal.id, value)
    setAmount('')
    setCustomMode(false)
  }

  const handleCustomSave = async () => {
    if (!isValid) return
    await onSave(goal.id, parsedAmount)
    setAmount('')
    setCustomMode(false)
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[60] bg-black/40"
        onClick={onClose}
      />
      <div
        className={cn(
          'fixed z-[60] flex flex-col bg-card shadow-2xl',
          'inset-x-0 bottom-0 max-h-[80vh] rounded-t-2xl',
          'md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2',
          'md:max-h-[70vh] md:w-full md:max-w-sm md:rounded-2xl'
        )}
      >
        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 md:hidden">
          <div className="h-1.5 w-10 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{
                backgroundColor: `${goal.color || '#6366f1'}15`,
                color: goal.color || '#6366f1',
              }}
            >
              <PiggyBank className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                Anadir ahorro
              </h3>
              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                {goal.name} - Faltan {formatCurrency(remaining)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Quick amounts */}
        <div className="px-5 py-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Cantidad rapida
          </p>
          <div className="grid grid-cols-3 gap-2">
            {QUICK_AMOUNTS.map((value) => (
              <button
                key={value}
                onClick={() => handleQuickAmount(value)}
                disabled={saving}
                className="flex h-12 items-center justify-center rounded-xl border border-border text-sm font-semibold text-foreground transition-all hover:border-primary/30 hover:bg-accent active:scale-95"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  `${value} EUR`
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Custom amount */}
        <div className="px-5 pb-4 modal-footer-safe">
          {!customMode ? (
            <button
              onClick={() => setCustomMode(true)}
              className="w-full rounded-xl border border-dashed border-border py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
            >
              Otra cantidad...
            </button>
          ) : (
            <div className="flex gap-2">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Cantidad (EUR)"
                step="1"
                min="1"
                autoFocus
                className="h-11 flex-1 rounded-xl border border-border bg-card px-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <button
                onClick={handleCustomSave}
                disabled={!isValid || saving}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all',
                  isValid && !saving
                    ? 'gradient-primary shadow-md shadow-primary/25 hover:shadow-lg active:scale-95'
                    : 'cursor-not-allowed bg-muted text-muted-foreground'
                )}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Anadir'
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
