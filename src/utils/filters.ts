import { useMemo } from 'react'
import type { Application, Filters, StrategicAlignment } from '../types'
import { queryTokens } from '../analysis/textUtils'
import { useStore, defaultFilters } from '../store/useStore'

const ALIGN_RANK: Record<StrategicAlignment, number> = { direct: 4, high: 3, medium: 2, weak: 1, none: 0 }
const QUALITY_RANK = { high: 5, useful: 4, analysis: 3, low: 2, irrelevant: 1 } as const

function union<T>(a: T[], b: T[]): T[] { return [...new Set([...a, ...b])] }

export function applyPreset(f: Filters): Filters {
  switch (f.preset) {
    case 'top': return { ...f, scoreMin: Math.max(f.scoreMin, 70) }
    case 'frequent': return { ...f, minSimilar: 2 }
    case 'strategic': return { ...f, alignments: union(f.alignments, ['direct', 'high'] as StrategicAlignment[]) }
    case 'existing': return { ...f, statuses: union(f.statuses, ['existing']) }
    case 'analysis': return { ...f, qualities: union(f.qualities, ['analysis']) }
    case 'low': return { ...f, qualities: union(f.qualities, ['low']) }
    case 'irrelevant': return { ...f, qualities: union(f.qualities, ['irrelevant']) }
    default: return f
  }
}

export function searchScore(a: Application, qt: string[]): number | null {
  let total = 0
  const title = a.analysis.normalizedTitle.toLowerCase()
  const text = a.text.toLowerCase()
  for (const q of qt) {
    let hit = 0
    if (title.includes(q)) hit += 5
    if (a.subtopic.toLowerCase().includes(q)) hit += 3
    if (a.cityNorm.toLowerCase().includes(q)) hit += 3
    if (a.topic.toLowerCase().includes(q)) hit += 2
    if (text.includes(q)) hit += 1
    if (a.id.toLowerCase().includes(q)) hit += 8
    if (hit === 0) return null
    total += hit
  }
  return total
}

export function filterApplications(apps: Application[], raw: Filters): Application[] {
  const f = applyPreset(raw)
  const qt = queryTokens(f.search)
  return apps.filter((a) => {
    const an = a.analysis
    if (f.cities.length && !f.cities.includes(a.cityNorm)) return false
    if (f.topics.length && !f.topics.includes(a.topic)) return false
    if (f.subtopics.length && !f.subtopics.includes(a.subtopic)) return false
    if (an.usefulnessScore < f.scoreMin || an.usefulnessScore > f.scoreMax) return false
    if (f.qualities.length && !f.qualities.includes(an.quality)) return false
    if (f.alignments.length && !f.alignments.includes(an.alignment)) return false
    if (f.duplicate === 'unique' && an.similarApplications.length > 0) return false
    if (f.duplicate === 'similar' && !(an.similarApplications.length > 0 && !an.isDuplicate)) return false
    if (f.duplicate === 'duplicates' && !an.isDuplicate) return false
    if (f.minSimilar > 0 && an.similarApplications.length < f.minSimilar) return false
    if (f.statuses.length) {
      const ok = f.statuses.some((s) =>
        s === 'existing' ? an.existingInitiative
        : s === 'nonstrategic' ? an.nonStrategic
        : s === 'strategic' ? ['direct', 'high'].includes(an.alignment)
        : an.status === s)
      if (!ok) return false
    }
    if (f.dateFrom && a.dateIso < f.dateFrom) return false
    if (f.dateTo && a.dateIso > f.dateTo) return false
    if (f.hasAttachment === 'yes' && !a.attachmentUrl) return false
    if (f.hasAttachment === 'no' && a.attachmentUrl) return false
    if (qt.length && searchScore(a, qt) === null) return false
    return true
  })
}

export function sortApplications(apps: Application[], sort: string, qt: string[]): Application[] {
  const arr = [...apps]
  if (sort === 'relevance' && qt.length) {
    arr.sort((a, b) => (searchScore(b, qt) || 0) - (searchScore(a, qt) || 0))
    return arr
  }
  const key = sort === 'relevance' ? 'usefulness_desc' : sort
  const cmp: Record<string, (a: Application, b: Application) => number> = {
    usefulness_desc: (a, b) => b.analysis.usefulnessScore - a.analysis.usefulnessScore,
    usefulness_asc: (a, b) => a.analysis.usefulnessScore - b.analysis.usefulnessScore,
    usefulness_similar_desc: (a, b) => (b.analysis.usefulnessScore - a.analysis.usefulnessScore) || (b.analysis.similarApplications.length - a.analysis.similarApplications.length),
    date_desc: (a, b) => b.dateIso.localeCompare(a.dateIso) || (b.time || '').localeCompare(a.time || ''),
    date_asc: (a, b) => a.dateIso.localeCompare(b.dateIso) || (a.time || '').localeCompare(b.time || ''),
    impact_desc: (a, b) => b.analysis.socialImpactScore - a.analysis.socialImpactScore,
    alignment_desc: (a, b) => ALIGN_RANK[b.analysis.alignment] - ALIGN_RANK[a.analysis.alignment],
    similar_desc: (a, b) => b.analysis.similarApplications.length - a.analysis.similarApplications.length,
    city_asc: (a, b) => a.cityNorm.localeCompare(b.cityNorm, 'ru'),
    topic_asc: (a, b) => a.topic.localeCompare(b.topic, 'ru'),
    quality_desc: (a, b) => QUALITY_RANK[b.analysis.quality] - QUALITY_RANK[a.analysis.quality],
    uniqueness_desc: (a, b) => b.analysis.uniquenessScore - a.analysis.uniquenessScore,
  }
  return arr.sort(cmp[key] || cmp.usefulness_desc)
}

export function useFilteredApps(): Application[] {
  const applications = useStore((s) => s.applications)
  const filters = useStore((s) => s.filters)
  const sort = useStore((s) => s.sort)
  return useMemo(() => sortApplications(filterApplications(applications, filters), sort, queryTokens(filters.search)), [applications, filters, sort])
}

// ---- URL state (сохранение фильтров в ссылке) ----
export function filtersToSearch(f: Filters, sort: string, view: string, page: number, size: number): string {
  const p = new URLSearchParams()
  if (f.search) p.set('q', f.search)
  if (f.cities.length) p.set('city', f.cities.join('|'))
  if (f.topics.length) p.set('topic', f.topics.join('|'))
  if (f.subtopics.length) p.set('sub', f.subtopics.join('|'))
  if (f.qualities.length) p.set('quality', f.qualities.join('|'))
  if (f.alignments.length) p.set('align', f.alignments.join('|'))
  if (f.statuses.length) p.set('status', f.statuses.join('|'))
  if (f.duplicate !== 'all') p.set('dup', f.duplicate)
  if (f.scoreMin > 0) p.set('scoreMin', String(f.scoreMin))
  if (f.scoreMax < 100) p.set('scoreMax', String(f.scoreMax))
  if (f.minSimilar > 0) p.set('minSim', String(f.minSimilar))
  if (f.dateFrom) p.set('from', f.dateFrom)
  if (f.dateTo) p.set('to', f.dateTo)
  if (f.hasAttachment !== 'all') p.set('att', f.hasAttachment)
  if (f.preset !== 'all') p.set('preset', f.preset)
  if (sort !== 'usefulness_desc') p.set('sort', sort)
  if (view !== 'cards') p.set('view', view)
  if (page > 1) p.set('page', String(page))
  if (size !== 20) p.set('size', String(size))
  return p.toString()
}

export function searchToState(sp: URLSearchParams) {
  const split = (v: string | null) => (v ? v.split('|') : [])
  const num = (v: string | null, d: number) => (v ? Number(v) || d : d)
  return {
    filters: {
      ...defaultFilters(),
      search: sp.get('q') || '',
      cities: split(sp.get('city')),
      topics: split(sp.get('topic')),
      subtopics: split(sp.get('sub')),
      qualities: split(sp.get('quality')) as Filters['qualities'],
      alignments: split(sp.get('align')) as Filters['alignments'],
      statuses: split(sp.get('status')),
      duplicate: (sp.get('dup') as Filters['duplicate']) || 'all',
      scoreMin: num(sp.get('scoreMin'), 0),
      scoreMax: num(sp.get('scoreMax'), 100),
      minSimilar: num(sp.get('minSim'), 0),
      dateFrom: sp.get('from') || null,
      dateTo: sp.get('to') || null,
      hasAttachment: (sp.get('att') as Filters['hasAttachment']) || 'all',
      preset: sp.get('preset') || 'all',
    } as Filters,
    sort: sp.get('sort') || 'usefulness_desc',
    view: (sp.get('view') === 'table' ? 'table' : 'cards') as 'cards' | 'table',
    page: num(sp.get('page'), 1),
    size: num(sp.get('size'), 20),
  }
}

export const SORT_OPTIONS = [
  { value: 'relevance', label: 'По релевантности' },
  { value: 'usefulness_desc', label: 'Полезность ↓' },
  { value: 'usefulness_asc', label: 'Полезность ↑' },
  { value: 'usefulness_similar_desc', label: 'Полезность ↓ + похожие ↓' },
  { value: 'date_desc', label: 'Дата ↓' },
  { value: 'date_asc', label: 'Дата ↑' },
  { value: 'impact_desc', label: 'Общественная значимость' },
  { value: 'alignment_desc', label: 'Стратегическое соответствие' },
  { value: 'similar_desc', label: 'Количество похожих' },
  { value: 'city_asc', label: 'Муниципалитет' },
  { value: 'topic_asc', label: 'Тема' },
  { value: 'quality_desc', label: 'Качество' },
  { value: 'uniqueness_desc', label: 'Уникальность' },
]