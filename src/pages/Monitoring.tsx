import { useMemo } from 'react'
import { useStore } from '../store/useStore'
import { Card, KpiCard, Section } from '../components/ui'
import { VBar, DynamicsChart } from '../charts/Charts'
import { alignmentDist, byDirection } from '../utils/analytics'
import { getUserApplicationCount } from '../services/applicationsService'

export default function Monitoring() {
  const { applications, clusters, loading } = useStore()
  const userAdded = useMemo(() => getUserApplicationCount(), [applications])
  const kpi = useMemo(() => ({
    total: applications.length,
    strategic: applications.filter((a) => ['direct', 'high'].includes(a.analysis.alignment)).length,
    clustersMulti: clusters.filter((c) => c.frequency > 1).length,
    last7: applications.filter((a) => a.dateIso >= new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10)).length,
  }), [applications, clusters])
  if (loading) return <p className="py-10 text-center text-sm text-slate-400">Загрузка…</p>

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Мониторинг</h1>
        <p className="mt-1 text-sm text-slate-500">Систематизация информации об инициативах, оценка соответствия целям и динамика — в логике раздела мониторинга Стратегии.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <KpiCard label="Всего инициатив" value={kpi.total} />
        <KpiCard label="Стратегически релевантных" value={kpi.strategic} />
        <KpiCard label="Проблемных кластеров" value={kpi.clustersMulti} />
        <KpiCard label="Новых за 7 дней" value={kpi.last7} />
        <KpiCard label="Добавлено через сайт" value={userAdded} hint="Заявки, отправленные через форму и сохранённые в браузере" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Распределение по направлениям"><Card className="p-4"><VBar data={byDirection(applications)} /></Card></Section>
        <Section title="Соответствие Стратегии"><Card className="p-4"><VBar data={alignmentDist(applications).map((d) => ({ name: d.label, value: d.value }))} color="#0E9F6E" /></Card></Section>
      </div>
      <Section title="Динамика поступления"><Card className="p-4"><DynamicsChart apps={applications} /></Card></Section>
      <Card className="p-4 text-xs text-slate-500">
        <p className="font-medium text-slate-700 dark:text-slate-300">В развитии</p>
        <p className="mt-1">Планируемые расширения раздела: привязка показателей Стратегии к кластерам проблем, сравнение плановых и фактических значений, анализ рисков реализации. Будет добавлено по мере появления данных.</p>
      </Card>
    </div>
  )
}