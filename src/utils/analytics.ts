import type { Application, ProblemCluster, QualityLevel, StrategicAlignment } from '../types'
import { QUALITY_LABELS, ALIGN_LABELS } from '../types'
import { STRATEGY_DIRECTIONS } from '../strategy/strategyData'

export function byDirection(apps: Application[]) {
  return STRATEGY_DIRECTIONS.map((d) => {
    const list = apps.filter((a) => a.topic === d.name)
    return {
      name: d.short, full: d.name, value: list.length,
      quality: list.filter((a) => ['high', 'useful'].includes(a.analysis.quality)).length,
      strategic: list.filter((a) => ['direct', 'high'].includes(a.analysis.alignment)).length,
    }
  }).filter((d) => d.value > 0).sort((a, b) => b.value - a.value)
}

export interface MunicipalityStats { name: string; value: number; share: number; quality: number; strategic: number; uniqueProblems: number; avgScore: number; duplicates: number }

export function byMunicipality(apps: Application[]): MunicipalityStats[] {
  const map = new Map<string, Application[]>()
  for (const a of apps) { const arr = map.get(a.cityNorm); if (arr) arr.push(a); else map.set(a.cityNorm, [a]) }
  const total = apps.length || 1
  return [...map.entries()].map(([name, list]) => ({
    name, value: list.length, share: Math.round((list.length / total) * 100),
    quality: list.filter((a) => ['high', 'useful'].includes(a.analysis.quality)).length,
    strategic: list.filter((a) => ['direct', 'high'].includes(a.analysis.alignment)).length,
    uniqueProblems: new Set(list.map((a) => a.analysis.clusterId)).size,
    avgScore: Math.round(list.reduce((s, a) => s + a.analysis.usefulnessScore, 0) / list.length),
    duplicates: list.filter((a) => a.analysis.isDuplicate).length,
  })).sort((a, b) => b.value - a.value)
}

export function qualityDist(apps: Application[]) {
  const order: QualityLevel[] = ['high', 'useful', 'analysis', 'low', 'irrelevant']
  return order.map((k) => ({ key: k, label: QUALITY_LABELS[k], value: apps.filter((a) => a.analysis.quality === k).length })).filter((d) => d.value > 0)
}
export function alignmentDist(apps: Application[]) {
  const order: StrategicAlignment[] = ['direct', 'high', 'medium', 'weak', 'none']
  return order.map((k) => ({ key: k, label: ALIGN_LABELS[k], value: apps.filter((a) => a.analysis.alignment === k).length })).filter((d) => d.value > 0)
}
export function weekKey(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d.toISOString().slice(0, 10)
}
export function dynamicsSeries(apps: Application[], g: 'day' | 'week' | 'month') {
  const m = new Map<string, number>()
  for (const a of apps) {
    const k = g === 'day' ? a.dateIso : g === 'week' ? weekKey(a.dateIso) : a.dateIso.slice(0, 7)
    m.set(k, (m.get(k) || 0) + 1)
  }
  return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([name, value]) => ({ name, value }))
}
export function topProblems(clusters: ProblemCluster[], n = 10) {
  return clusters.filter((c) => c.frequency >= 2).sort((a, b) => b.impactScore - a.impactScore).slice(0, n)
}
export function topCandidates(apps: Application[]) {
  return apps
    .filter((a) => a.analysis.relevance === 'relevant' && !a.analysis.isDuplicate && !a.analysis.existingInitiative && !a.analysis.nonStrategic && a.analysis.usefulnessScore >= 60 && ['direct', 'high', 'medium'].includes(a.analysis.alignment))
    .sort((a, b) => b.analysis.usefulnessScore - a.analysis.usefulnessScore)
}