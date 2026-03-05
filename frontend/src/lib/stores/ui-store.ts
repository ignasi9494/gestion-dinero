import { create } from 'zustand'
import { startOfMonth, endOfMonth } from 'date-fns'

interface UIStore {
  // ─── Date range for filtering ────────────────────────────────
  dateRange: { from: Date; to: Date }
  setDateRange: (range: { from: Date; to: Date }) => void
  resetDateRange: () => void

  // ─── Transaction selection (for bulk operations) ─────────────
  selectedTransactions: Set<string>
  toggleTransaction: (id: string) => void
  clearSelection: () => void
  selectAll: (ids: string[]) => void
  isSelected: (id: string) => boolean
  selectionCount: () => number

  // ─── Sidebar state ───────────────────────────────────────────
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void

  // ─── Active month for dashboard ──────────────────────────────
  activeMonth: string // YYYY-MM format
  setActiveMonth: (month: string) => void
}

function getDefaultDateRange() {
  const now = new Date()
  return {
    from: startOfMonth(now),
    to: endOfMonth(now),
  }
}

function getCurrentMonth(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

export const useUIStore = create<UIStore>((set, get) => ({
  // ─── Date range ──────────────────────────────────────────────
  dateRange: getDefaultDateRange(),
  setDateRange: (range) => set({ dateRange: range }),
  resetDateRange: () => set({ dateRange: getDefaultDateRange() }),

  // ─── Transaction selection ───────────────────────────────────
  selectedTransactions: new Set<string>(),

  toggleTransaction: (id) =>
    set((state) => {
      const next = new Set(state.selectedTransactions)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return { selectedTransactions: next }
    }),

  clearSelection: () => set({ selectedTransactions: new Set<string>() }),

  selectAll: (ids) => set({ selectedTransactions: new Set(ids) }),

  isSelected: (id) => get().selectedTransactions.has(id),

  selectionCount: () => get().selectedTransactions.size,

  // ─── Sidebar ─────────────────────────────────────────────────
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  // ─── Active month ────────────────────────────────────────────
  activeMonth: getCurrentMonth(),
  setActiveMonth: (month) => set({ activeMonth: month }),
}))
