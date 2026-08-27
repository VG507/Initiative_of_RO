import { Link } from 'react-router-dom'
import { AlignBadge, Badge, Card, ScoreBadge } from '../ui'
import { fmtDate } from '../../utils/format'
import { QUALITY_LABELS, STATUS_LABELS, type Application } from '../../types'

export function ApplicationCard({ app }: { app: Application }) {
  const an = app.analysis
  return (
    <Link to={`/applications/${app.id}`} className="group flex flex-col rounded-lg border border-slate-200 bg-white p-4 transition hover:border-accent/50 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span className="font-medium">#{app.id}</span>
        <span>{fmtDate(app.dateIso)}</span>
      </div>
      <h3 className="mt-1.5 line-clamp-2 text-sm font-semibold text-slate-900 group-hover:text-accent dark:text-slate-100">{an.normalizedTitle}</h3>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{app.cityNorm} · {app.subtopic}</p>
      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{an.normalizedProblem || an.normalizedProposal || app.text}</p>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <ScoreBadge value={an.usefulnessScore} />
        <AlignBadge level={an.alignment} />
        {an.similarApplications.length > 0 && <Badge tone="slate">Похожих: {an.similarApplications.length}</Badge>}
        {an.isDuplicate && <Badge tone="amber">Дубликат</Badge>}
        {an.existingInitiative && <Badge tone="sky">Уже есть</Badge>}
        {an.nonStrategic && <Badge tone="slate">Нестратегическая</Badge>}
        {an.relevance === 'irrelevant' && <Badge tone="red">Нерелевантная</Badge>}
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-xs dark:border-slate-800">
        <span className="text-slate-500">{QUALITY_LABELS[an.quality]}</span>
        <span className="font-medium text-accent">{an.usefulnessScore}/100</span>
      </div>
    </Link>
  )
}

export function ApplicationTable({ apps }: { apps: Application[] }) {
  return (
    <Card className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-left text-xs">
        <thead className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-500 dark:border-slate-800">
          <tr>{['ID', 'Заголовок', 'Муниципалитет', 'Подтема', 'Дата', 'Полезность', 'Качество', 'Стратегия', 'Похожих', 'Статус'].map((h) => <th key={h} className="px-3 py-2.5 font-medium">{h}</th>)}</tr>
        </thead>
        <tbody>
          {apps.map((a) => (
            <tr key={a.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50">
              <td className="px-3 py-2.5"><Link to={`/applications/${a.id}`} className="font-medium text-accent hover:underline">#{a.id}</Link></td>
              <td className="max-w-[280px] truncate px-3 py-2.5 font-medium text-slate-800 dark:text-slate-200">{a.analysis.normalizedTitle}</td>
              <td className="px-3 py-2.5 text-slate-600 dark:text-slate-400">{a.cityNorm}</td>
              <td className="px-3 py-2.5 text-slate-600 dark:text-slate-400">{a.subtopic}</td>
              <td className="px-3 py-2.5 text-slate-500">{fmtDate(a.dateIso)}</td>
              <td className="px-3 py-2.5 font-semibold">{a.analysis.usefulnessScore}</td>
              <td className="px-3 py-2.5">{QUALITY_LABELS[a.analysis.quality]}</td>
              <td className="px-3 py-2.5">{a.analysis.alignment === 'direct' ? 'Прямое' : a.analysis.alignment === 'high' ? 'Высокое' : a.analysis.alignment === 'medium' ? 'Среднее' : a.analysis.alignment === 'weak' ? 'Слабое' : '—'}</td>
              <td className="px-3 py-2.5">{a.analysis.similarApplications.length}</td>
              <td className="px-3 py-2.5 text-slate-500">{STATUS_LABELS[a.analysis.status]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

export function StrategyMatchCard({ m }: { m: { direction: string; section: string; level: string; matchedKeywords: string[]; explanation: string; initiative?: string } }) {
  return (
    <Card className="p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div>
          {m.initiative && <p className="text-[11px] font-medium uppercase tracking-wide text-accent">Инициатива: {m.initiative}</p>}
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{m.section}</p>
          <p className="text-xs text-slate-500">{m.direction}</p>
        </div>
        <AlignBadge level={m.level as any} />
      </div>
      <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{m.explanation}</p>
      {m.matchedKeywords.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">{m.matchedKeywords.map((k) => <Badge key={k} tone="slate">{k}</Badge>)}</div>
      )}
    </Card>
  )
}