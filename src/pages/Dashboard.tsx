import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Download } from 'lucide-react'
import { useStore } from '../store/useStore'
import { Badge, Card, KpiCard, SkeletonGrid, Section } from '../components/ui'
import { HBar, VBar, DynamicsChart } from '../charts/Charts'
import { alignmentDist, byDirection, byMunicipality, qualityDist, topProblems, topCandidates } from '../utils/analytics'
import { buildReport, download, fmtDate, plural } from '../utils/format'
import { ALIGN_LABELS } from '../types'
import { useToast } from './useToast'

export default function Dashboard() {
  const { applications, clusters, loading } = useStore()
  const navigate = useNavigate()
  const showToast = useToast()  
  const kpi = useMemo(() => {
    const rel = applications.filter((a) => a.analysis.relevance === 'relevant')
    return {
      total: applications.length,
      fresh: applications.filter((a) => a.analysis.status === 'new').length,
      quality: rel.filter((a) => ['high', 'useful'].includes(a.analysis.quality)).length,
      analysis: rel.filter((a) => a.analysis.quality === 'analysis').length,
      duplicates: applications.filter((a) => a.analysis.isDuplicate).length,
      nonStrategic: applications.filter((a) => a.analysis.nonStrategic).length,
      strategic: applications.filter((a) => ['direct', 'high'].includes(a.analysis.alignment)).length,
      existing: applications.filter((a) => a.analysis.existingInitiative).length,
      problems: clusters.length, directions: new Set(applications.map((a) => a.topic)).size,
      repetitive: clusters.filter((c) => c.frequency >= 3).length,
      needExpert: applications.filter((a) => ['analysis', 'low'].includes(a.analysis.quality)).length,
    }
  }, [applications, clusters])

  const dirData = useMemo(() => byDirection(applications), [applications])
  const munData = useMemo(() => byMunicipality(applications).map((m) => ({ name: m.name, value: m.value, tooltip: `${m.name}: ${m.value} заявок · качественных ${m.quality} · стратегических ${m.strategic}` })), [applications])
  const qData = useMemo(() => qualityDist(applications).map((d) => ({ name: d.label, key: d.key, value: d.value })), [applications])
  const problems = useMemo(() => topProblems(clusters, 8), [clusters])
  const lastDate = useMemo(() => applications.reduce((m, a) => (a.dateIso > m ? a.dateIso : m), ''), [applications])
  const candidates = useMemo(() => topCandidates(applications).slice(0, 5), [applications])
  const discussed = useMemo(() => [...clusters].filter((c) => c.frequency > 1).sort((a, b) => b.frequency - a.frequency).slice(0, 5), [clusters])

  if (loading) return <div className="space-y-6"><SkeletonGrid /><SkeletonGrid /></div>

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Инициативы Ростовской области</h1>
          <p className="mt-1 text-sm text-slate-500">Аналитика предложений жителей и их соответствия стратегии развития региона до 2030 года</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Данные на: {lastDate ? fmtDate(lastDate) : '—'}</span>
                    <button onClick={() => { download('report.md', buildReport(applications, clusters), 'text/markdown'); showToast('Отчёт сформирован') }} className="flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-xs hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"><Download className="h-3.5 w-3.5" />Отчёт</button>
        </div>
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold">Что жители считают важным для развития Ростовской области?</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge tone="blue">{plural(kpi.total, 'заявка', 'заявки', 'заявок')}</Badge>
          <Badge tone="slate">{plural(kpi.problems, 'проблема', 'проблемы', 'проблем')}</Badge>
          <Badge tone="slate">{kpi.directions} направлений Стратегии</Badge>
          <Badge tone="emerald">{kpi.strategic} стратегически релевантных</Badge>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Всего заявок" value={kpi.total} hint="Все записи в базе, включая нерелевантные" onClick={() => navigate('/applications')} />
        <KpiCard label="Новых" value={kpi.fresh} hint="Заявки без специального статуса после анализа" onClick={() => navigate('/applications?sort=date_desc')} />
        <KpiCard label="Качественных" value={kpi.quality} hint="Полезность ≥ 70 и заявка релевантна" onClick={() => navigate('/applications?scoreMin=70')} />
        <KpiCard label="Требуют анализа" value={kpi.analysis} hint="Полезность 50–69 — нужен экспертный разбор" onClick={() => navigate('/applications?quality=analysis')} />
        <KpiCard label="Дубликатов" value={kpi.duplicates} hint="Схожесть текста ≥ 85% с более ранней заявкой" onClick={() => navigate('/applications?dup=duplicates')} />
        <KpiCard label="Нестратегических" value={kpi.nonStrategic} hint="Статус «Нестратегическая» из исходных данных" onClick={() => navigate('/applications?status=nonstrategic')} />
        <KpiCard label="Соответствуют стратегии" value={kpi.strategic} hint="Прямое или высокое соответствие разделам Стратегии (автоклассификация)" onClick={() => navigate('/applications?align=direct%7Chigh')} />
        <KpiCard label="Уже реализуемых" value={kpi.existing} hint="Статус «Уже есть» — аналогичная инициатива существует" onClick={() => navigate('/applications?status=existing')} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-3 text-sm font-semibold">Куда направлены предложения (направления Стратегии)</h3>
          <HBar data={dirData} onClick={(name) => { const d = dirData.find((x) => x.name === name); if (d) navigate(`/applications?topic=${encodeURIComponent(d.full)}`) }} />
        </Card>
        <Card className="p-5">
          <h3 className="mb-3 text-sm font-semibold">Где больше всего обращений</h3>
          <HBar data={munData} onClick={(name) => navigate(`/municipalities/${encodeURIComponent(name)}`)} />
        </Card>
        <Card className="p-5">
          <h3 className="mb-3 text-sm font-semibold">Динамика поступления заявок</h3>
          <DynamicsChart apps={applications} />
        </Card>
        <Card className="p-5">
          <h3 className="mb-3 text-sm font-semibold">Качество заявок</h3>
          <VBar data={qData} onClick={(name) => { const q = qData.find((x) => x.name === name); if (q) navigate(`/applications?quality=${q.key}`) }} />
        </Card>
      </div>

      <Section title="Главные проблемы по мнению жителей" hint="Индекс значимости = частота × средняя полезность × стратегический вес. Нормирован к 100.">
        <div className="space-y-2">
          {problems.length === 0 && <p className="text-sm text-slate-500">Повторяющихся проблем пока не найдено.</p>}
          {problems.map((c) => (
            <Link key={c.id} to={`/clusters/${c.id}`} className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-3 hover:border-accent/50 dark:border-slate-800 dark:bg-slate-900">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{c.title}</p>
                <p className="mt-0.5 text-xs text-slate-500">{c.subtopic} · {c.municipalities.join(', ')} · {ALIGN_LABELS[c.alignment]}</p>
              </div>
              <div className="hidden w-40 shrink-0 sm:block">
                <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-1.5 rounded-full bg-accent" style={{ width: `${c.impactScore}%` }} /></div>
                <p className="mt-1 text-right text-[11px] text-slate-400">индекс {c.impactScore}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold">{c.frequency}</p>
                <p className="text-[11px] text-slate-400">заявок</p>
              </div>
            </Link>
          ))}
        </div>
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Самые обсуждаемые проблемы" hint="Рейтинг по количеству заявок в кластере">
          <div className="space-y-2">
            {discussed.map((c) => (
              <Link key={c.id} to={`/clusters/${c.id}`} className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm hover:border-accent/50 dark:border-slate-800 dark:bg-slate-900">
                <span className="min-w-0 flex-1 truncate pr-3">{c.title}</span><Badge tone="slate">{c.frequency} заявок</Badge>
              </Link>
            ))}
          </div>
        </Section>
        <Section title="Самые перспективные инициативы" hint="Полезность + значимость + стратегическое соответствие отдельной заявки">
          <div className="space-y-2">
            {candidates.map((a) => (
              <Link key={a.id} to={`/applications/${a.id}`} className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm hover:border-accent/50 dark:border-slate-800 dark:bg-slate-900">
                <span className="min-w-0 flex-1 truncate pr-3">{a.analysis.normalizedTitle}</span><Badge tone="blue">{a.analysis.usefulnessScore}/100</Badge>
              </Link>
            ))}
          </div>
        </Section>
      </div>

      <Card className="flex flex-col items-center gap-3 bg-accent p-8 text-center text-white dark:bg-accent-700">
        <h2 className="text-lg font-semibold">Есть проблема или идея для развития региона?</h2>
        <p className="max-w-md text-sm text-white/80">Предложение попадёт в аналитическую базу, получит оценку полезности и будет сопоставлено со Стратегией-2030.</p>
        <Link to="/submit" className="flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-medium text-accent hover:bg-white/90">Предложить инициативу <ArrowRight className="h-4 w-4" /></Link>
      </Card>
    </div>
  )
}