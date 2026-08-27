import { useMemo } from 'react'
import { MultiSelect, Select } from '../ui'
import { useStore } from '../../store/useStore'
import { ALIGN_LABELS, QUALITY_LABELS } from '../../types'
import { directionShort } from '../../strategy/strategyData'

export function FiltersPanel() {
  const applications = useStore((s) => s.applications)
  const filters = useStore((s) => s.filters)
  const setFilters = useStore((s) => s.setFilters)
  const reset = useStore((s) => s.resetFilters)
  const set = (p: Parameters<typeof setFilters>[0]) => setFilters({ ...p, preset: 'all' })

  const cityOpts = useMemo(() => {
    const m = new Map<string, number>()
    for (const a of applications) m.set(a.cityNorm, (m.get(a.cityNorm) || 0) + 1)
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([v, count]) => ({ value: v, label: v, count }))
  }, [applications])

  const topicOpts = useMemo(() => {
    const m = new Map<string, number>()
    for (const a of applications) m.set(a.topic, (m.get(a.topic) || 0) + 1)
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([v, count]) => ({ value: v, label: directionShort(v), count }))
  }, [applications])

  const subtopicOpts = useMemo(() => {
    const m = new Map<string, number>()
    for (const a of applications) if (!filters.topics.length || filters.topics.includes(a.topic)) m.set(a.subtopic, (m.get(a.subtopic) || 0) + 1)
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([v, count]) => ({ value: v, label: v, count }))
  }, [applications, filters.topics])

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Фильтры</p>
        <button onClick={reset} className="text-xs text-slate-500 underline-offset-2 hover:underline">Сбросить</button>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <MultiSelect label="Муниципалитет" options={cityOpts} selected={filters.cities} onChange={(v) => set({ cities: v })} />
        <MultiSelect label="Направление (тема)" options={topicOpts} selected={filters.topics} onChange={(v) => set({ topics: v, subtopics: [] })} />
        <MultiSelect label="Подтема" options={subtopicOpts} selected={filters.subtopics} onChange={(v) => set({ subtopics: v })} />
        <MultiSelect label="Качество" options={(Object.keys(QUALITY_LABELS) as (keyof typeof QUALITY_LABELS)[]).map((k) => ({ value: k, label: QUALITY_LABELS[k] }))} selected={filters.qualities} onChange={(v) => set({ qualities: v as any })} />
        <MultiSelect label="Стратегическое соответствие" options={(Object.keys(ALIGN_LABELS) as (keyof typeof ALIGN_LABELS)[]).map((k) => ({ value: k, label: ALIGN_LABELS[k] }))} selected={filters.alignments} onChange={(v) => set({ alignments: v as any })} />
        <MultiSelect label="Статус инициативы" options={[
          { value: 'existing', label: 'Уже есть' }, { value: 'nonstrategic', label: 'Нестратегическая' },
          { value: 'strategic', label: 'Потенциально стратегическая' }, { value: 'new', label: 'Новая' },
        ]} selected={filters.statuses} onChange={(v) => set({ statuses: v })} />
        <Select ariaLabel="Дубликаты" value={filters.duplicate} onChange={(v) => set({ duplicate: v as any })} options={[
          { value: 'all', label: 'Дубликаты: все' }, { value: 'unique', label: 'Только уникальные' },
          { value: 'similar', label: 'Похожие' }, { value: 'duplicates', label: 'Дубликаты' },
        ]} />
        <Select ariaLabel="Вложение" value={filters.hasAttachment} onChange={(v) => set({ hasAttachment: v as any })} options={[
          { value: 'all', label: 'Вложение: любое' }, { value: 'yes', label: 'С вложением' }, { value: 'no', label: 'Без вложения' },
        ]} />
        <div className="space-y-1">
          <label className="text-xs text-slate-500">Полезность: {filters.scoreMin}–{filters.scoreMax}</label>
          <div className="flex items-center gap-2">
            <input aria-label="Минимальная полезность" type="range" min={0} max={100} value={filters.scoreMin} onChange={(e) => set({ scoreMin: Math.min(Number(e.target.value), filters.scoreMax) })} className="w-full accent-[#0F4C81]" />
            <input aria-label="Максимальная полезность" type="range" min={0} max={100} value={filters.scoreMax} onChange={(e) => set({ scoreMax: Math.max(Number(e.target.value), filters.scoreMin) })} className="w-full accent-[#0F4C81]" />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-slate-500">Дата: с — по</label>
          <div className="flex gap-2">
            <input aria-label="Дата с" type="date" value={filters.dateFrom || ''} onChange={(e) => set({ dateFrom: e.target.value || null })} className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-900" />
            <input aria-label="Дата по" type="date" value={filters.dateTo || ''} onChange={(e) => set({ dateTo: e.target.value || null })} className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-900" />
          </div>
        </div>
      </div>
    </div>
  )
}