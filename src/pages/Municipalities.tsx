import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useStore } from '../store/useStore'
import { Badge, Card, EmptyState, KpiCard, Section } from '../components/ui'
import { ApplicationCard } from '../components/app/ApplicationViews'
import { HBar, DynamicsChart } from '../charts/Charts'
import { byMunicipality, type MunicipalityStats } from '../utils/analytics'
import { plural } from '../utils/format'

export function Municipalities() {
  const applications = useStore((s) => s.applications)
  const loading = useStore((s) => s.loading)
  const [compare, setCompare] = useState<string[]>([])
  const stats = useMemo(() => byMunicipality(applications), [applications])
  const max = Math.max(...stats.map((s) => s.value), 1)

  if (loading) return <p className="py-10 text-center text-sm text-slate-400">Загрузка…</p>
  const toggle = (name: string) => setCompare((c) => c.includes(name) ? c.filter((x) => x !== name) : c.length < 5 ? [...c, name] : c)
  const compared = stats.filter((s) => compare.includes(s.name))

  const cmpRows: { label: string; get: (c: MunicipalityStats) => number | string }[] = [
    { label: 'Заявок', get: (c) => c.value },
    { label: 'Доля, %', get: (c) => c.share },
    { label: 'Уникальных проблем', get: (c) => c.uniqueProblems },
    { label: 'Средняя полезность', get: (c) => c.avgScore },
    { label: 'Качественных', get: (c) => c.quality },
    { label: 'Стратегических', get: (c) => c.strategic },
    { label: 'Дубликатов', get: (c) => c.duplicates },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Муниципалитеты</h1>
        <p className="mt-1 text-sm text-slate-500">География обращений: {stats.length} муниципальных образований. Отметьте 2–5 для сравнения.</p>
      </div>

      <Section title="Тепловая карта обращений" hint="Интенсивность цвета пропорциональна количеству заявок">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {stats.map((s) => {
            const a = 0.08 + (s.value / max) * 0.8
            return (
              <Link key={s.name} to={`/municipalities/${encodeURIComponent(s.name)}`} className="rounded-lg p-3 transition hover:ring-2 hover:ring-accent/40"
                style={{ backgroundColor: `rgba(15,76,129,${a})`, color: a > 0.45 ? '#fff' : '#334155' }}>
                <p className="truncate text-xs font-medium">{s.name}</p>
                <p className="mt-1 text-lg font-semibold">{s.value}</p>
                <p className="text-[11px] opacity-80">{s.uniqueProblems} проблем · {s.strategic} стратегических</p>
              </Link>
            )
          })}
        </div>
      </Section>

      <Section title="Сравнение муниципалитетов">
        {compared.length < 2 ? <Card className="p-4 text-xs text-slate-500">Выберите минимум 2 муниципалитета в списке ниже (чекбокс «сравнить»).</Card> : (
          <Card className="overflow-x-auto p-4">
            <table className="w-full min-w-[560px] text-left text-xs">
              <thead><tr className="text-slate-500"><th className="py-2 pr-4 font-medium">Показатель</th>{compared.map((c) => <th key={c.name} className="py-2 pr-4 font-medium text-slate-900 dark:text-slate-100">{c.name}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {cmpRows.map((r) => (
                  <tr key={r.label}>
                    <td className="py-2 pr-4 text-slate-500">{r.label}</td>
                    {compared.map((c) => <td key={c.name} className="py-2 pr-4 font-medium">{r.get(c)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </Section>

      <Section title="Все муниципалитеты">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {stats.map((s) => (
            <Card key={s.name} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <Link to={`/municipalities/${encodeURIComponent(s.name)}`} className="text-sm font-semibold hover:text-accent">{s.name}</Link>
                <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-[11px] text-slate-500">
                  <input type="checkbox" className="h-3.5 w-3.5 accent-[#0F4C81]" checked={compare.includes(s.name)} onChange={() => toggle(s.name)} aria-label={`Сравнить ${s.name}`} />сравнить
                </label>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge tone="blue">{plural(s.value, 'заявка', 'заявки', 'заявок')}</Badge>
                <Badge tone="slate">{s.uniqueProblems} проблем</Badge>
                <Badge tone="slate">полезность {s.avgScore}</Badge>
                <Badge tone="emerald">{s.strategic} стратегических</Badge>
                {s.duplicates > 0 && <Badge tone="amber">{s.duplicates} дубл.</Badge>}
              </div>
            </Card>
          ))}
        </div>
      </Section>
    </div>
  )
}

export function MunicipalityDetail() {
  const { id } = useParams()
  const { applications, clusters, loading } = useStore()
  const name = decodeURIComponent(id || '')
  const apps = useMemo(() => applications.filter((a) => a.cityNorm === name), [applications, name])
  if (loading) return <p className="py-10 text-center text-sm text-slate-400">Загрузка…</p>
  if (apps.length === 0) return <EmptyState title="Нет данных по муниципалитету" description={`По «${name}» заявок в базе нет.`} action={{ label: 'Все муниципалитеты', to: '/municipalities' }} />

  const topics = [...new Set(apps.map((a) => a.subtopic))].map((t) => ({ name: t, value: apps.filter((a) => a.subtopic === t).length }))
  const clusterIds = [...new Set(apps.map((a) => a.analysis.clusterId))]
  const munClusters = clusters.filter((c) => clusterIds.includes(c.id)).sort((a, b) => b.frequency - a.frequency)
  const avg = Math.round(apps.reduce((s, a) => s + a.analysis.usefulnessScore, 0) / apps.length)

  return (
    <div className="space-y-6">
      <Link to="/municipalities" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-accent"><ArrowLeft className="h-3.5 w-3.5" />Муниципалитеты</Link>
      <h1 className="text-xl font-semibold tracking-tight">{name}</h1>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Заявок" value={apps.length} />
        <KpiCard label="Уникальных проблем" value={munClusters.length} />
        <KpiCard label="Средняя полезность" value={avg} />
        <KpiCard label="Стратегических" value={apps.filter((a) => ['direct', 'high'].includes(a.analysis.alignment)).length} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5"><h3 className="mb-3 text-sm font-semibold">Основные темы</h3><HBar data={topics} /></Card>
        <Card className="p-5"><h3 className="mb-3 text-sm font-semibold">Динамика</h3><DynamicsChart apps={apps} /></Card>
      </div>
      <Section title="Проблемы муниципалитета">
        <div className="space-y-2">
          {munClusters.slice(0, 8).map((c) => (
            <Link key={c.id} to={`/clusters/${c.id}`} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm hover:border-accent/50 dark:border-slate-800 dark:bg-slate-900">
              <span className="min-w-0 truncate pr-3">{c.title}</span><Badge tone="slate">{c.frequency} заявок</Badge>
            </Link>
          ))}
        </div>
      </Section>
      <Section title={`Заявки (${apps.length})`}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">{apps.map((a) => <ApplicationCard key={a.id} app={a} />)}</div>
      </Section>
    </div>
  )
}