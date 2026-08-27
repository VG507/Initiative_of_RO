import { create } from 'zustand'
import { applicationsRepository } from '../services/applicationsService'
import type { Application, Filters, ProblemCluster } from '../types'

export const defaultFilters = (): Filters => ({
  search: '', cities: [], topics: [], subtopics: [], qualities: [], alignments: [], statuses: [],
  duplicate: 'all', scoreMin: 0, scoreMax: 100, minSimilar: 0,
  dateFrom: null, dateTo: null, hasAttachment: 'all', preset: 'all',
})

interface Toast { id: number; message: string; actionLabel?: string; actionTo?: string }

interface AppState {
  applications: Application[]; clusters: ProblemCluster[]
  loading: boolean; error: string | null; hydrated: boolean
  theme: 'light' | 'dark'; toast: Toast | null
  filters: Filters; sort: string; view: 'cards' | 'table'; page: number; pageSize: number
  init: () => Promise<void>
  refresh: () => Promise<void>
  setFilters: (p: Partial<Filters>) => void
  resetFilters: () => void
  setSort: (s: string) => void
  setView: (v: 'cards' | 'table') => void
  setPage: (p: number) => void
  setPageSize: (n: number) => void
  toggleTheme: () => void
  showToast: (message: string, action?: { label: string; to: string }) => void
  hideToast: () => void
}

export const useStore = create<AppState>()((set, get) => ({
  applications: [], clusters: [], loading: true, error: null, hydrated: false,
  theme: (localStorage.getItem('don-initiatives:theme') as 'light' | 'dark') || 'light',
  toast: null,
  filters: defaultFilters(), sort: 'usefulness_desc', view: 'cards', page: 1, pageSize: 20,
  init: async () => {
    if (get().hydrated) return
    set({ loading: true })
    try {
      const r = await applicationsRepository.getApplications()
      set({ applications: r.applications, clusters: r.clusters, loading: false, hydrated: true })
    } catch {
      set({ error: 'Не удалось загрузить данные', loading: false, hydrated: true })
    }
  },
  refresh: async () => {
    try {
      const r = await applicationsRepository.getApplications()
      set({ applications: r.applications, clusters: r.clusters })
    } catch { /* noop */ }
  },
  setFilters: (p) => set((s) => ({ filters: { ...s.filters, ...p }, page: 1 })),
  resetFilters: () => set({ filters: defaultFilters(), page: 1 }),
  setSort: (sort) => set({ sort }),
  setView: (view) => set({ view }),
  setPage: (page) => set({ page }),
  setPageSize: (pageSize) => set({ pageSize, page: 1 }),
  toggleTheme: () => {
    const theme = get().theme === 'light' ? 'dark' : 'light'
    localStorage.setItem('don-initiatives:theme', theme)
    set({ theme })
  },
  showToast: (message, action) => set({ toast: { id: Date.now(), message, actionLabel: action?.label, actionTo: action?.to } }),
  hideToast: () => set({ toast: null }),
}))