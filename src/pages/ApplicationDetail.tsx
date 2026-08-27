import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { useStore } from '../store/useStore'
import { AlignBadge, Badge, Card, EmptyState, QualityBadge, ScoreBadge, Section } from '../components/ui'
import { StrategyMatchCard } from '../components/app/ApplicationViews'
import { fmtDate } from '../utils/format'
import { STATUS_LABELS } from '../types'

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="w-56 shrink-0 text-slate-500">{label}</span>
      <div className="h-2 flex-1 rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-2 rounded-full bg-accent" style={{ width: `${(value / max) * 100}%` }} /></div>
      <span className="w-14 shrink-0 text-right font-medium">{value}/{max}</span>
    </div>
  )
}

export default function ApplicationDetail() {
  const { id } = useParams()
  const applications = useStore((s) => s.applications)
  const clusters = useStore((s) => s.clusters)
  const loading = useStore((s) => s.loading)
  const app = applications.find((a) => a.id === id)

  if (loading) return <p className="py-10 text-center text-sm text-slate-400">Загрузка…</p>
  if (!app) return <EmptyState title="Заявка не найдена" description={`Заявка #${id} отсутствует в базе.`} action={{ label: 'К списку заявок', to: '/applications' }} />

  const an = app.analysis
  const cluster = clusters.find((c) => c.id === an.clusterId)
  const similar = an.similarApplications.map((s) => ({ s, a: applications.find((x) => x.id === s.id) })).filter((x) => x.a)

  return (
    <div className="space-y-6">
      <Link to="/applications" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-accent"><ArrowLeft className="h-3.5 w-3.5" />Все заявки</Link>
      <div>
        <p className="text-xs text-slate-400">#{app.id} · {fmtDate(app.dateIso)} {app.time}</p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">{an.normalizedTitle}</h1>
        <p className="mt-1 text-sm text-slate-500">{app.cityNorm} · {app.subtopic}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <ScoreBadge value={an.usefulnessScore} /><QualityBadge quality={an.quality} /><AlignBadge level={an.alignment} />
          <Badge tone="slate">● {STATUS_LABELS[an.status]}</Badge>
          {an.isDuplicate && <Badge tone="amber">● Дубликат #{an.duplicateOf}</Badge>}
          {an.existingInitiative && <Badge tone="sky">● Уже есть</Badge>}
          {an.nonStrategic && <Badge tone="slate">● Нестратегическая</Badge>}
          {an.relevance === 'irrelevant' && <Badge tone="red">● Нерелевантная: {an.relevanceReason}</Badge>}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Section title="Нормализованное предложение">
            <Card className="p-4 text-sm leading-relaxed">{an.normalizedProposal || an.normalizedTitle}</Card>
          </Section>
          <div className="grid gap-6 md:grid-cols-3">
            <Section title="Проблема"><Card className="min-h-[110px] p-4 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{an.normalizedProblem || '—'}</Card></Section>
            <Section title="Предлагаемое решение"><Card className="min-h-[110px] p-4 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{an.normalizedProposal || '—'}</Card></Section>
            <Section title="Ожидаемый эффект"><Card className="min-h-[110px] p-4 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{an.expectedEffect || '—'}</Card></Section>
          </div>
          {an.subProblems.length > 1 && (
            <Section title="Выделенные подпроблемы" hint="Заявка содержит несколько тем — они выделены автоматически">
              <Card className="divide-y divide-slate-100 dark:divide-slate-800">
                {an.subProblems.map((p, i) => <p key={i} className="p-3 text-xs text-slate-600 dark:text-slate-400">{i + 1}. {p}</p>)}
              </Card>
            </Section>
          )}
          <Section title="Исходный текст">
            <Card className="p-4 text-sm leading-relaxed text-slate-700 dark:text-slate-300">{app.text}</Card>
          </Section>
          {similar.length > 0 && (
            <Section title={`Похожие заявки (${similar.length})`} hint="Косинусная близость текстов; повторения повышают значимость проблемы, а не «штрафуют» заявку">
              <div className="space-y-2">
                {similar.map(({ s, a }) => (
                  <Link key={s.id} to={`/applications/${s.id}`} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 text-xs hover:border-accent/50 dark:border-slate-800 dark:bg-slate-900">
                    <span className="font-medium text-accent">#{s.id}</span>
                    <span className="min-w-0 flex-1 truncate">{a!.analysis.normalizedTitle}</span>
                    <span className="w-24 shrink-0"><span className="block h-1.5 rounded-full bg-slate-100 dark:bg-slate-800"><span className="block h-1.5 rounded-full bg-accent" style={{ width: `${Math.round(s.score * 100)}%` }} /></span></span>
                    <span className="w-10 shrink-0 text-right font-medium">{Math.round(s.score * 100)}%</span>
                  </Link>
                ))}
              </div>
            </Section>
          )}
        </div>

        <div className="space-y-6">
          <Section title="Индекс полезности">
            <Card className="space-y-2.5 p-4">
              <p className="text-2xl font-semibold">{an.usefulnessScore} <span className="text-sm font-normal text-slate-400">/ 100</span></p>
              <Bar label="Конкретность" value={an.concretenessScore} max={20} />
              <Bar label="Реализуемость" value={an.feasibilityScore} max={20} />
              <Bar label="Общественная значимость" value={an.socialImpactScore} max={20} />
              <Bar label="Стратегическое соответствие" value={an.strategicAlignmentScore} max={20} />
              <Bar label="Информационная ценность" value={an.informationValueScore} max={10} />
              <Bar label="Уникальность" value={an.uniquenessScore} max={10} />
            </Card>
          </Section>
          <Section title="Стратегическое соответствие" hint="Автоматическая классификация по ключевым темам Стратегии-2030">
            {an.strategyMatches.length === 0 ? <Card className="p-4 text-xs text-slate-500">Соответствий не найдено.</Card> :
              <div className="space-y-2">{an.strategyMatches.map((m, i) => <StrategyMatchCard key={i} m={m} />)}</div>}
          </Section>
          {cluster && (
            <Section title="Кластер проблемы">
              <Link to={`/clusters/${cluster.id}`} className="block rounded-lg border border-slate-200 bg-white p-4 text-sm hover:border-accent/50 dark:border-slate-800 dark:bg-slate-900">
                <p className="font-medium">{cluster.title}</p>
                <p className="mt-1 text-xs text-slate-500">{cluster.frequency} заявок · {cluster.municipalities.length} муниципалитетов · индекс {cluster.impactScore}</p>
              </Link>
            </Section>
          )}
          <Section title="Исходные данные">
            <Card className="space-y-1.5 p-4 text-xs text-slate-600 dark:text-slate-400">
              <p><b>Статус инициативы:</b> {app.statusInitiative || '—'}</p>
              <p><b>Статус подзадачи:</b> {app.statusSubtask || '—'}</p>
              {app.attachmentUrl && <p><b>Вложение:</b> <a href={app.attachmentUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline">открыть <ExternalLink className="h-3 w-3" /></a></p>}
              <p className="pt-1 text-[10px] text-slate-400">Персональные данные не отображаются.</p>
            </Card>
          </Section>
        </div>
      </div>
    </div>
  )
}