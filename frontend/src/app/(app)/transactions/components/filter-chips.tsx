'use client'

import {
  startOfWeek,
  startOfMonth,
  endOfMonth,
  subMonths,
  format,
} from 'date-fns'
import { cn } from '@/lib/utils'

interface DatePreset {
  label: string
  getRange: () => { from: string; to: string }
}

function getPresets(): DatePreset[] {
  const today = new Date()
  const fmt = (d: Date) => format(d, 'yyyy-MM-dd')

  return [
    {
      label: 'Hoy',
      getRange: () => ({ from: fmt(today), to: fmt(today) }),
    },
    {
      label: 'Esta semana',
      getRange: () => ({
        from: fmt(startOfWeek(today, { weekStartsOn: 1 })),
        to: fmt(today),
      }),
    },
    {
      label: 'Este mes',
      getRange: () => ({
        from: fmt(startOfMonth(today)),
        to: fmt(today),
      }),
    },
    {
      label: 'Ultimo mes',
      getRange: () => {
        const lastMonth = subMonths(today, 1)
        return {
          from: fmt(startOfMonth(lastMonth)),
          to: fmt(endOfMonth(lastMonth)),
        }
      },
    },
    {
      label: 'Ultimos 3 meses',
      getRange: () => ({
        from: fmt(subMonths(today, 3)),
        to: fmt(today),
      }),
    },
  ]
}

interface FilterChipsProps {
  dateFrom: string
  dateTo: string
  onDateChange: (from: string, to: string) => void
}

export function FilterChips({ dateFrom, dateTo, onDateChange }: FilterChipsProps) {
  const presets = getPresets()

  const isActive = (preset: DatePreset) => {
    const range = preset.getRange()
    return dateFrom === range.from && dateTo === range.to
  }

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
      {presets.map((preset) => (
        <button
          key={preset.label}
          onClick={() => {
            if (isActive(preset)) {
              onDateChange('', '')
            } else {
              const range = preset.getRange()
              onDateChange(range.from, range.to)
            }
          }}
          className={cn(
            'flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
            isActive(preset)
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          {preset.label}
        </button>
      ))}
    </div>
  )
}
