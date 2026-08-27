import { useMemo } from 'react'
import { useStore } from '../store/useStore'
import { Card, EmptyState, KpiCard, Section } from '../components/ui'
import { ApplicationCard } from '../components/app/ApplicationViews'
import { directionShort } from '../strategy/strategyData'

export default function StrategyIncluded() {
  const { applications, clusters, loading } = useStore()
  const groups = useMemo(() => {
    const rel = applications.filter((a) => ['direct', 'high'].includes(a.analysis.alignment))
    const byDir = new Map<string, typeof rel>()
    for (const a of rel) { const arr = byDir.get(a.topic); if (arr) arr.push(a); else byDir.set(a.topic, [a]) }
    return [...byDir.entries()].sort((x, y) => y[1].length - x[1].length)
  }, [applications])

  if (loading) return <p className="py-10 text-center text-sm text-slate-400">Загрузка…</p>
  const total = groups.reduce((s, [, list]) => s + list.length, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Инициативы в стратегии</h1>
        <p className="mt-1 text-sm text-slate-500">Заявки жителей, которые потенциально совпадают с направлениями, разделами и инициативами Стратегии-2030. Классификация автоматическая — это не решение о «включении».</p>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Заявок с соответствием" value={total} hint="Прямое или высокое соответствие (автоклассификация)" />
        <KpiCard label="Направлений охвачено" value={groups.length} />
        <KpiCard label="Прямое соответствие" value={applications.filter((a) => a.analysis.alignment === 'direct').length} />
        <KpiCard label="Кластеров с соответствием" value={clusters.filter((c) => ['direct', 'high'].includes(c.alignment) && c.frequency > 1).length} />
      </div>
      {groups.length === 0 ? <EmptyState title="Стратегических соответствий не найдено" action={{ label: 'Все заявки', to: '/applications' }} /> : groups.map(([dir, list]) => (
        <Section key={dir} title={`${directionShort(dir)} · ${list.length}`}>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">{list.map((a) => <ApplicationCard key={a.id} app={a} />)}</div>
        </Section>
      ))}
      <Card className="p-4 text-xs text-slate-500">Формулировки «соответствует», «найдено соответствие» означают результат автоматического сопоставления по ключевым темам Стратегии. Официальный статус может установить только ответственный орган или эксперт.</Card>
    </div>
  )
}