import { Link } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { AlignBadge, Badge, Card, EmptyState, ScoreBadge, Section } from '../components/ui'
import { topCandidates } from '../utils/analytics'

export default function StrategyCandidates() {
  const { applications, loading } = useStore()
  if (loading) return <p className="py-10 text-center text-sm text-slate-400">Загрузка…</p>
  const list = topCandidates(applications)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Потенциальные инициативы</h1>
        <p className="mt-1 text-sm text-slate-500">Заявки с высокой полезностью и значимостью, не дублирующие существующие инициативы и соответствующие целям Стратегии. Кандидаты на экспертную проверку.</p>
      </div>
      {list.length === 0 ? <EmptyState title="Потенциальных инициатив не найдено" action={{ label: 'Все заявки', to: '/applications' }} /> : (
        <div className="space-y-3">
          {list.map((a) => (
            <Card key={a.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <Link to={`/applications/${a.id}`} className="text-sm font-semibold hover:text-accent">#{a.id} · {a.analysis.normalizedTitle}</Link>
                <div className="flex flex-wrap gap-1.5"><ScoreBadge value={a.analysis.usefulnessScore} /><AlignBadge level={a.analysis.alignment} /></div>
              </div>
              <div className="mt-3 grid gap-3 text-xs md:grid-cols-2 xl:grid-cols-4">
                <div><p className="font-medium text-slate-500">Проблема</p><p className="mt-0.5 text-slate-700 dark:text-slate-300">{a.analysis.normalizedProblem || '—'}</p></div>
                <div><p className="font-medium text-slate-500">Предложение</p><p className="mt-0.5 text-slate-700 dark:text-slate-300">{a.analysis.normalizedProposal || a.analysis.normalizedTitle}</p></div>
                <div><p className="font-medium text-slate-500">Раздел Стратегии</p><p className="mt-0.5 text-slate-700 dark:text-slate-300">{a.analysis.strategyMatches[0]?.section ?? '—'}</p></div>
                <div><p className="font-medium text-slate-500">Ожидаемый эффект</p><p className="mt-0.5 text-slate-700 dark:text-slate-300">{a.analysis.expectedEffect || '—'}</p></div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge tone="slate">{a.cityNorm}</Badge>
                <Badge tone="slate">Похожих заявок: {a.analysis.similarApplications.length}</Badge>
                <Badge tone="slate">Значимость: {a.analysis.socialImpactScore}/20</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
      <Section title=""><Card className="p-4 text-xs text-slate-500">«Потенциальная инициатива» — аналитическая характеристика, а не решение о включении в Стратегию. Требуется экспертная проверка.</Card></Section>
    </div>
  )
}