import type { Application } from '../types'
import { QUALITY_LABELS, ALIGN_LABELS } from '../types'

export function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return d && m && y ? `${d}.${m}.${y}` : iso
}
export function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10, m100 = n % 100
  if (m10 === 1 && m100 !== 11) return `${n} ${one}`
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return `${n} ${few}`
  return `${n} ${many}`
}
export function download(filename: string, content: string, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}
const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`
export function toCSV(apps: Application[]): string {
  const head = ['ID', 'Муниципалитет', 'Тема', 'Подтема', 'Дата', 'Время', 'Полезность', 'Качество', 'Соответствие', 'Дубликат', 'Похожих', 'Кластер', 'Заголовок', 'Текст']
  const rows = apps.map((a) => [
    a.id, a.cityNorm, a.topic, a.subtopic, a.dateIso, a.time ?? '',
    a.analysis.usefulnessScore, QUALITY_LABELS[a.analysis.quality], ALIGN_LABELS[a.analysis.alignment],
    a.analysis.isDuplicate ? 'да' : 'нет', a.analysis.similarApplications.length, a.analysis.clusterId ?? '',
    a.analysis.normalizedTitle, a.text,
  ].map(esc).join(';'))
  return [head.map(esc).join(';'), ...rows].join('\n')
}
export function buildReport(apps: Application[], clusters: { id: string; title: string; frequency: number; municipalities: string[]; averageUsefulness: number; impactScore: number }[]): string {
  const strategic = apps.filter((a) => ['direct', 'high'].includes(a.analysis.alignment)).length
  const dup = apps.filter((a) => a.analysis.isDuplicate).length
  const top = clusters.filter((c) => c.frequency > 1).sort((a, b) => b.impactScore - a.impactScore).slice(0, 10)
  return [
    '# Аналитический отчёт: инициативы жителей Ростовской области', '',
    `Заявок: ${apps.length}; уникальных проблем (кластеров): ${clusters.length};`,
    `стратегически релевантных: ${strategic}; дубликатов: ${dup}.`, '',
    '## Главные проблемы (по индексу значимости)', '',
    ...top.map((c, i) => `${i + 1}. ${c.title} — ${c.frequency} заявок, ${c.municipalities.length} муниципалитетов, полезность ${c.averageUsefulness}, индекс ${c.impactScore}`), '',
    '_Отчёт сформирован автоматически из обезличенных данных. Классификация — аналитическая._',
  ].join('\n')
}