import { Fragment, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { AlignBadge, Badge, Card, Section } from '../components/ui'
import { HBar, VBar, DynamicsChart } from '../charts/Charts'
import { alignmentDist, byDirection, byMunicipality, qualityDist, topProblems } from '../utils/analytics'
import { ALIGN_LABELS } from '../types'

export default function Analytics() {
  const { applications, clusters, loading } = useStore()
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState<string | null>(null)
  if (loading) return <p className="py-10 text-center text-sm text-slate-400">Загрузка…</p>

  const dirs = byDirection(applications)
  const muns = byMunicipality(applications)
  const qd = qualityDist(applications)
  const ad = alignmentDist(applications)
  const problems = topProblems(clusters, 10)
  const dupPairs = applications.filter((a) => a.analysis.isDuplicate)
  const matrix = [...applications].sort((a, b) => b.analysis.usefulnessScore - a.analysis.usefulnessScore).slice(0, 30)

  const stats: [string, string | number][] = [
    ['Всего заявок', applications.length],
    ['Уникальных проблем', clusters.length],
    ['Кластеров с повторением 3+', clusters.filter((c) => c.frequency >= 3).length],
    ['Дубликатов', dupPairs.length],
    ['Нерелевантных', applications.filter((a) => a.analysis.relevance === 'irrelevant').length],
    ['Средняя полезность', Math.round(applications.reduce((s, a) => s + a.analysis.usefulnessScore, 0) / (applications.length || 1))],
    ['Направлений Стратегии охвачено', dirs.length],
    ['Заявок с прямым соответствием', applications.filter((a) => a.analysis.alignment === 'direct').length],
  ]

  return (
    <div className="space-y-8">
      <div><h1 className="text-xl font-semibold tracking-tight">Аналитика</h1><p className="mt-1 text-sm text-slate-500">Полный аналитический срез по базе инициатив.</p></div>

      <Section title="Общая статистика">
        <Card className="grid grid-cols-2 gap-px overflow-hidden bg-slate-100 dark:bg-slate-800 md:grid-cols-4">
          {stats.map(([l, v]) => <div key={l} className="bg-white p-4 dark:bg-slate-900"><p className="text-xs text-slate-500">{l}</p><p className="mt-1 text-xl font-semibold">{v}</p></div>)}
        </Card>
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Тематическая структура">
          <Card className="p-4"><HBar data={dirs} onClick={(name) => { const d = dirs.find((x) => x.name === name); if (d) navigate(`/applications?topic=${encodeURIComponent(d.full)}`) }} /></Card>
        </Section>
        <Section title="География проблем">
          <Card className="p-4"><HBar data={muns.map((m) => ({ name: m.name, value: m.value, tooltip: `${m.name}: ${m.value} (${m.share}%) · уникальных проблем ${m.uniqueProblems}` }))} onClick={(name) => navigate(`/municipalities/${encodeURIComponent(name)}`)} /></Card>
        </Section>
        <Section title="Качество заявок">
          <Card className="p-4"><VBar data={qd.map((d) => ({ name: d.label, value: d.value }))} onClick={(name) => { const q = qd.find((x) => x.label === name); if (q) navigate(`/applications?quality=${q.key}`) }} /></Card>
        </Section>
        <Section title="Стратегическое соответствие">
          <Card className="p-4"><VBar data={ad.map((d) => ({ name: d.label, value: d.value }))} color="#0E9F6E" onClick={(name) => { const q = ad.find((x) => x.label === name); if (q) navigate(`/applications?align=${q.key}`) }} /></Card>
        </Section>
      </div>

      <Section title="Динамика"><Card className="p-4"><DynamicsChart apps={applications} /></Card></Section>

      <Section title="Кластеры проблем">
        <Card className="divide-y divide-slate-100 dark:divide-slate-800">
          {problems.map((c) => (
            <Link key={c.id} to={`/clusters/${c.id}`} className="flex items-center justify-between px-4 py-3 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/50">
              <span className="min-w-0 truncate pr-3">{c.title}</span>
              <span className="flex shrink-0 items-center gap-2"><Badge tone="slate">{c.frequency} заявок</Badge><Badge tone="blue">{c.impactScore}</Badge></span>
            </Link>
          ))}
        </Card>
      </Section>

      <Section title="Дубликаты" hint="Автообнаружение: косинусная близость текстов ≥ 85%">
        {dupPairs.length === 0 ? <Card className="p-4 text-xs text-slate-500">Дубликатов не обнаружено.</Card> : (
          <Card className="divide-y divide-slate-100 dark:divide-slate-800">
            {dupPairs.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center gap-2 px-4 py-3 text-xs">
                <Link to={`/applications/${a.id}`} className="font-medium text-accent">#{a.id}</Link>
                <span className="text-slate-500">дубликат</span>
                <Link to={`/applications/${a.analysis.duplicateOf}`} className="font-medium text-accent">#{a.analysis.duplicateOf}</Link>
                <Badge tone="amber">схожесть {Math.round((a.analysis.similarApplications.find((s) => s.id === a.analysis.duplicateOf)?.score || 0.85) * 100)}%</Badge>
                <span className="text-slate-400">{a.analysis.normalizedTitle}</span>
              </div>
            ))}
          </Card>
        )}
      </Section>

      <Section title="Матрица соответствия Стратегии" hint="Аналитическая классификация. Клик по строке — объяснение. Официальный статус устанавливает только ответственный орган.">
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="border-b border-slate-200 text-[11px] uppercase text-slate-500 dark:border-slate-800"><tr><th className="px-3 py-2.5">Заявка</th><th className="px-3 py-2.5">Направление</th><th className="px-3 py-2.5">Раздел</th><th className="px-3 py-2.5">Соответствие</th></tr></thead>
            <tbody>
              {matrix.map((a) => {
                const m = a.analysis.strategyMatches[0]
                const isExpanded = expanded === a.id
                return (
                  <Fragment key={a.id}>
                    <tr onClick={() => setExpanded(isExpanded ? null : a.id)} className="cursor-pointer border-b border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50">
                      <td className="px-3 py-2.5"><Link to={`/applications/${a.id}`} onClick={(e) => e.stopPropagation()} className="font-medium text-accent hover:underline">#{a.id}</Link> <span className="text-slate-500">{a.analysis.normalizedTitle.slice(0, 50)}…</span></td>
                      <td className="px-3 py-2.5 text-slate-600 dark:text-slate-400">{a.topic}</td>
                      <td className="px-3 py-2.5 text-slate-600 dark:text-slate-400">{m?.section ?? '—'}</td>
                      <td className="px-3 py-2.5">{m ? <AlignBadge level={m.level} /> : <Badge tone="slate">{ALIGN_LABELS.none}</Badge>}</td>
                    </tr>
                    {isExpanded && (
                      <tr className="border-b border-slate-100 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-800/30">
                        <td colSpan={4} className="px-3 py-2.5 text-slate-600 dark:text-slate-400">
                          {a.analysis.strategyMatches.length ? a.analysis.strategyMatches.map((mm, i) => <p key={i} className="mb-1">{mm.explanation}</p>) : 'Соответствий Стратегии не найдено.'}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </Card>
      </Section>

      <Section title="Муниципальные сравнения">
        <Card className="overflow-x-auto p-4">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead><tr className="text-slate-500">{['Муниципалитет', 'Заявок', 'Доля', 'Качественных', 'Стратегических', 'Проблем', 'Дубликатов', 'Ср. полезность'].map((h) => <th key={h} className="py-2 pr-4 font-medium">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {muns.map((m) => (
                <tr key={m.name}><td className="py-2 pr-4"><Link to={`/municipalities/${encodeURIComponent(m.name)}`} className="font-medium text-accent hover:underline">{m.name}</Link></td>
                  <td className="py-2 pr-4">{m.value}</td><td className="py-2 pr-4">{m.share}%</td><td className="py-2 pr-4">{m.quality}</td><td className="py-2 pr-4">{m.strategic}</td><td className="py-2 pr-4">{m.uniqueProblems}</td><td className="py-2 pr-4">{m.duplicates}</td><td className="py-2 pr-4 font-medium">{m.avgScore}</td></tr>
              ))}
            </tbody>
          </table>
        </Card>
      </Section>
    </div>
  )
}
