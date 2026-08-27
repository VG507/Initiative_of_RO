import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { useStore } from '../store/useStore'
import { Badge, Card, Section } from '../components/ui'
import { SECTION_TO_SUBTOPICS, STRATEGY_DIRECTIONS, STRATEGY_INITIATIVES } from '../strategy/strategyData'

export default function StrategyPage() {
  const { applications, loading } = useStore()
  const navigate = useNavigate()
  const [openId, setOpenId] = useState<string | null>('d3')
  if (loading) return <p className="py-10 text-center text-sm text-slate-400">Загрузка…</p>

  const sectionCount = (section: string) => applications.filter((a) => a.analysis.strategyMatches.some((m) => m.section === section)).length
  const initiativeStats = useMemo(() => STRATEGY_INITIATIVES.map((ini) => {
    const linked = applications.filter((a) => a.analysis.strategyMatches.some((m) => m.initiative === ini.name))
    return { ini, linked }
  }), [applications])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Структура стратегии</h1>
        <p className="mt-1 text-sm text-slate-500">Стратегия социально-экономического развития Ростовской области до 2030 года: направления → разделы → приоритетные задачи. В скобках — число связанных заявок. Клик по разделу открывает связанные заявки.</p>
      </div>

      <div className="space-y-2">
        {STRATEGY_DIRECTIONS.map((d) => {
          const count = applications.filter((a) => a.topic === d.name).length
          return (
            <Card key={d.id}>
              <button onClick={() => setOpenId(openId === d.id ? null : d.id)} className="flex w-full items-center justify-between gap-2 p-4 text-left" aria-expanded={openId === d.id}>
                <span className="flex items-center gap-3">
                  <span className="text-sm font-semibold">{d.short}</span>
                  <span className="hidden text-xs text-slate-400 md:inline">{d.name}</span>
                </span>
                <span className="flex items-center gap-2"><Badge tone="blue">{count}</Badge><ChevronDown className={`h-4 w-4 text-slate-400 transition ${openId === d.id ? 'rotate-180' : ''}`} /></span>
              </button>
              {openId === d.id && (
                <div className="border-t border-slate-100 p-4 dark:border-slate-800">
                  {d.sections.map((s) => (
                    <div key={s.name} className="border-l-2 border-slate-100 py-2 pl-4 dark:border-slate-800">
                      <button onClick={() => { const subs = SECTION_TO_SUBTOPICS[s.name] || []; navigate(`/applications?topic=${encodeURIComponent(d.name)}${subs.length ? `&sub=${encodeURIComponent(subs.join('|'))}` : ''}`) }}
                        className="text-left text-sm font-medium text-slate-800 hover:text-accent dark:text-slate-200">{s.name} <span className="text-xs font-normal text-slate-400">({sectionCount(s.name)})</span></button>
                      <ul className="mt-1 space-y-0.5">
                        {s.tasks.map((t) => <li key={t} className="text-xs text-slate-500">— {t}</li>)}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )
        })}
      </div>

      <Section title="Стратегические проектные инициативы" hint="Перечень инициатив приведён по материалам Стратегии и публичных программ; связь с заявками определяется автоматически">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {initiativeStats.map(({ ini, linked }) => (
            <Card key={ini.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold">{ini.name}</p>
                <Badge tone={linked.length > 0 ? 'emerald' : 'slate'}>{linked.length > 0 ? 'есть связанные заявки' : 'нет заявок'}</Badge>
              </div>
              <p className="mt-1.5 text-xs text-slate-500">{ini.description}</p>
              <p className="mt-1 text-[11px] text-slate-400">{ini.source}</p>
              {linked.length > 0 && (
                <>
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <Badge tone="blue">Связанных заявок: {linked.length}</Badge>
                    <Badge tone="slate">Средняя полезность: {Math.round(linked.reduce((s, a) => s + a.analysis.usefulnessScore, 0) / linked.length)}</Badge>
                    <Badge tone="slate">Муниципалитетов: {new Set(linked.map((a) => a.cityNorm)).size}</Badge>
                  </div>
                  <div className="mt-2 space-y-1">
                    {linked.slice(0, 4).map((a) => <Link key={a.id} to={`/applications/${a.id}`} className="block truncate text-xs text-accent hover:underline">#{a.id} · {a.analysis.normalizedTitle}</Link>)}
                  </div>
                </>
              )}
            </Card>
          ))}
        </div>
      </Section>
    </div>
  )
}