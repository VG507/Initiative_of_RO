import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useStore } from '../store/useStore'
import { AlignBadge, Badge, Card, EmptyState, KpiCard, Section } from '../components/ui'
import { ApplicationCard, StrategyMatchCard } from '../components/app/ApplicationViews'
import { DynamicsChart } from '../charts/Charts'
import { fmtDate } from '../utils/format'
import { ALIGN_LABELS } from '../types'

export function Clusters() {
  const { clusters, loading } = useStore()
  if (loading) return <p className="py-10 text-center text-sm text-slate-400">Загрузка…</p>
  const multi = clusters.filter((c) => c.frequency >= 2).sort((a, b) => b.impactScore - a.impactScore)
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Кластеры проблем</h1>
        <p className="mt-1 text-sm text-slate-500">Группы похожих заявок — одна проблема, поданная разными жителями. Всего уникальных проблем: {clusters.length}.</p>
      </div>
      {multi.length === 0 ? <EmptyState title="Повторяющихся проблем не найдено" description="Каждая заявка описывает уникальную проблему." action={{ label: 'Все заявки', to: '/applications' }} /> : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {multi.map((c) => (
            <Link key={c.id} to={`/clusters/${c.id}`} className="flex flex-col rounded-lg border border-slate-200 bg-white p-4 hover:border-accent/50 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between text-xs text-slate-400"><span>{c.id}</span><span>индекс {c.impactScore}</span></div>
              <h3 className="mt-1.5 line-clamp-2 text-sm font-semibold">{c.title}</h3>
              <p className="mt-1 text-xs text-slate-500">{c.subtopic}</p>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <Badge tone="blue">{c.frequency} заявок</Badge>
                <Badge tone="slate">{c.municipalities.length} муниципалитетов</Badge>
                <Badge tone="slate">Полезность {c.averageUsefulness}</Badge>
              </div>
              <div className="mt-3 border-t border-slate-100 pt-2 dark:border-slate-800"><AlignBadge level={c.alignment} /></div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export function ClusterDetail() {
  const { id } = useParams()
  const { clusters, applications, loading } = useStore()
  const cluster = clusters.find((c) => c.id === id)
  if (loading) return <p className="py-10 text-center text-sm text-slate-400">Загрузка…</p>
  if (!cluster) return <EmptyState title="Кластер не найден" action={{ label: 'К кластерам', to: '/clusters' }} />
  const apps = cluster.applicationIds.map((aid) => applications.find((a) => a.id === aid)!).filter(Boolean)
  const dates = [...new Set(apps.map((a) => fmtDate(a.dateIso)))].join(', ')

  return (
    <div className="space-y-6">
      <Link to="/clusters" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-accent"><ArrowLeft className="h-3.5 w-3.5" />Кластеры проблем</Link>
      <div>
        <p className="text-xs text-slate-400">{cluster.id} · {cluster.subtopic} · {dates}</p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">{cluster.title}</h1>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Badge tone="blue">{cluster.frequency} заявок</Badge>
          <Badge tone="slate">{cluster.municipalities.length} муниципалитетов</Badge>
          <Badge tone="slate">Средняя полезность {cluster.averageUsefulness}</Badge>
          <Badge tone="slate">Индекс значимости {cluster.impactScore}</Badge>
          <AlignBadge level={cluster.alignment} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Заявок в кластере" value={cluster.frequency} />
        <KpiCard label="Муниципалитетов" value={cluster.municipalities.length} />
        <KpiCard label="Средняя полезность" value={cluster.averageUsefulness} />
        <KpiCard label="Стратегическое соответствие" value={ALIGN_LABELS[cluster.alignment]} />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Section title="Заявки кластера">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{apps.map((a) => <ApplicationCard key={a.id} app={a} />)}</div>
          </Section>
        </div>
        <div className="space-y-4">
          <Section title="Муниципалитеты"><Card className="p-4 text-xs text-slate-600 dark:text-slate-400">{cluster.municipalities.join(', ')}</Card></Section>
          <Section title="Связанные направления Стратегии">
            {cluster.strategyMatches.length === 0 ? <Card className="p-4 text-xs text-slate-500">Соответствий не найдено.</Card> :
              <div className="space-y-2">{cluster.strategyMatches.map((m, i) => <StrategyMatchCard key={i} m={m} />)}</div>}
          </Section>
          <Section title="Динамика"><Card className="p-3"><DynamicsChart apps={apps} /></Card></Section>
        </div>
      </div>
    </div>
  )
}