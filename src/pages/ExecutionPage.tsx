import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertCircle, Building2, CheckCircle2, ChevronRight, Clock, Coins, ExternalLink, Filter, TrendingUp, Users } from 'lucide-react'
import { useStore } from '../store/useStore'
import { Badge, Card, KpiCard, Section, TableScroll } from '../components/ui'
import { EXECUTION_LABELS, EXECUTION_TONES, ExecutionStatus } from '../types'
import { plural } from '../utils/format'

export default function ExecutionPage() {
  const { applications, loading } = useStore()
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [bodyFilter, setBodyFilter] = useState<string>('all')

  const validApps = useMemo(() => {
    return applications.filter((a) => a.analysis.relevance === 'relevant' && !a.analysis.isDuplicate)
  }, [applications])

  // Ключевые сводные экономические и исполнительские метрики
  const metrics = useMemo(() => {
    const totalApps = validApps.length
    const totalBudget = validApps.reduce((s, a) => s + (a.analysis.economic?.estimatedCost || 0), 0)
    const totalSavings = validApps.reduce((s, a) => s + (a.analysis.economic?.annualSavings || 0), 0)
    const totalBeneficiaries = validApps.reduce((s, a) => s + (a.analysis.economic?.beneficiariesCount || 0), 0)

    const completed = validApps.filter((a) => a.analysis.execution?.status === 'completed').length
    const inProgress = validApps.filter((a) => a.analysis.execution?.status === 'in_progress').length
    const inBudget = validApps.filter((a) => a.analysis.execution?.status === 'in_budget').length
    const approved = validApps.filter((a) => a.analysis.execution?.status === 'approved').length
    const underReview = validApps.filter((a) => a.analysis.execution?.status === 'under_review').length
    const rejected = validApps.filter((a) => a.analysis.execution?.status === 'rejected').length

    const avgProgress = Math.round(
      validApps.reduce((s, a) => s + (a.analysis.execution?.progressPercent || 0), 0) / (totalApps || 1)
    )

    return {
      totalApps,
      totalBudget,
      totalSavings,
      totalBeneficiaries,
      completed,
      inProgress,
      inBudget,
      approved,
      underReview,
      rejected,
      avgProgress,
      conversionRate: Math.round(((completed + inProgress + inBudget) / (totalApps || 1)) * 100)
    }
  }, [validApps])

  // Группировка по ответственным ведомствам
  const byBody = useMemo(() => {
    const map = new Map<string, { total: number; inWork: number; completed: number; budget: number }>()
    for (const a of validApps) {
      const b = a.analysis.execution?.responsibleBody || 'Прочие'
      const cur = map.get(b) || { total: 0, inWork: 0, completed: 0, budget: 0 }
      cur.total++
      cur.budget += a.analysis.economic?.estimatedCost || 0
      if (a.analysis.execution?.status === 'completed') cur.completed++
      if (['in_progress', 'in_budget'].includes(a.analysis.execution?.status || '')) cur.inWork++
      map.set(b, cur)
    }
    return [...map.entries()]
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total)
  }, [validApps])

  // Фильтрация списка заявок
  const filteredApps = useMemo(() => {
    return validApps.filter((a) => {
      const ex = a.analysis.execution
      if (statusFilter !== 'all' && ex?.status !== statusFilter) return false
      if (bodyFilter !== 'all' && ex?.responsibleBody !== bodyFilter) return false
      return true
    })
  }, [validApps, statusFilter, bodyFilter])

  if (loading) return <p className="py-10 text-center text-sm text-slate-400">Загрузка…</p>

  return (
    <div className="space-y-8">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-semibold tracking-tight">Исполнение и экономический эффект</h1>
          <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
            Интеллектуальная предиктивная модель
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Автоматический скоринг потенциала реализации инициатив, оценка инвестиционных затрат и социально-экономической отдачи в РО.
        </p>

        {/* Официальный методологический дисклеймер */}
        <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50/70 p-3 text-xs leading-relaxed text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200">
          <p className="font-semibold flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4 text-accent shrink-0" />
            Методологическая справка:
          </p>
          <p className="mt-1">
            Оценки бюджета, экономии и этапов реализации сформированы алгоритмом предиктивного скоринга на базе отраслевых нормативов Ростовской области и служат для предварительного ранжирования инициатив рабочими группами. Официальный правовой статус присваивается профильными министерствами РО в установленном порядке.
          </p>
        </div>
      </div>

      {/* KPI-блок финансовых и стратегических эффектов */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          label="Расчетный инвестпотенциал"
          value={`~${(metrics.totalBudget / 1000000).toFixed(1)} млн ₽`}
          hint="Ориентировочная сметная потребность по одобренным и перспективным инициативам"
        />
        <KpiCard
          label="Потенциал экономии"
          value={metrics.totalSavings > 0 ? `~${(metrics.totalSavings / 1000000).toFixed(1)} млн ₽/г.` : '0 ₽'}
          hint="Ожидаемое снижение операционных расходов бюджета от инфраструктурной оптимизации и цифровизации"
        />
        <KpiCard
          label="Охват благополучателей"
          value={`~${(metrics.totalBeneficiaries / 1000).toFixed(0)} тыс. чел.`}
          hint="Суммарное расчетное количество жителей, на качество жизни которых повлияет реализация"
        />
        <KpiCard
          label="Индекс одобрения (конверсия)"
          value={`${metrics.conversionRate}%`}
          hint="Доля инициатив, рекомендованных моделью к рассмотрению на бюджетных комиссиях РО"
        />
      </div>

      {/* Воронка жизненного цикла обращений */}
      <Section title="Воронка статусов исполнения обращений">
        <Card className="grid grid-cols-2 divide-y divide-slate-100 dark:divide-slate-800 md:grid-cols-6 md:divide-y-0 md:divide-x">
          <div
            onClick={() => setStatusFilter(statusFilter === 'under_review' ? 'all' : 'under_review')}
            className={`cursor-pointer p-4 transition ${statusFilter === 'under_review' ? 'bg-slate-100 dark:bg-slate-800' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
          >
            <p className="text-[11px] text-slate-500">1. На рассмотрении</p>
            <p className="mt-1 text-xl font-semibold">{metrics.underReview}</p>
            <p className="text-[10px] text-slate-400">Экспертный анализ</p>
          </div>

          <div
            onClick={() => setStatusFilter(statusFilter === 'approved' ? 'all' : 'approved')}
            className={`cursor-pointer p-4 transition ${statusFilter === 'approved' ? 'bg-slate-100 dark:bg-slate-800' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
          >
            <p className="text-[11px] text-blue-600 dark:text-blue-400">2. Одобрено</p>
            <p className="mt-1 text-xl font-semibold text-blue-700 dark:text-blue-300">{metrics.approved}</p>
            <p className="text-[10px] text-slate-400">Рабочей группой</p>
          </div>

          <div
            onClick={() => setStatusFilter(statusFilter === 'in_budget' ? 'all' : 'in_budget')}
            className={`cursor-pointer p-4 transition ${statusFilter === 'in_budget' ? 'bg-slate-100 dark:bg-slate-800' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
          >
            <p className="text-[11px] text-sky-600 dark:text-sky-400">3. В бюджете</p>
            <p className="mt-1 text-xl font-semibold text-sky-700 dark:text-sky-300">{metrics.inBudget}</p>
            <p className="text-[10px] text-slate-400">В плане программ РО</p>
          </div>

          <div
            onClick={() => setStatusFilter(statusFilter === 'in_progress' ? 'all' : 'in_progress')}
            className={`cursor-pointer p-4 transition ${statusFilter === 'in_progress' ? 'bg-slate-100 dark:bg-slate-800' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
          >
            <p className="text-[11px] text-amber-600 dark:text-amber-400">4. В реализации</p>
            <p className="mt-1 text-xl font-semibold text-amber-700 dark:text-amber-300">{metrics.inProgress}</p>
            <p className="text-[10px] text-slate-400">Закупки / подряд</p>
          </div>

          <div
            onClick={() => setStatusFilter(statusFilter === 'completed' ? 'all' : 'completed')}
            className={`cursor-pointer p-4 transition ${statusFilter === 'completed' ? 'bg-slate-100 dark:bg-slate-800' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
          >
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400">5. Исполнено</p>
            <p className="mt-1 text-xl font-semibold text-emerald-700 dark:text-emerald-300">{metrics.completed}</p>
            <p className="text-[10px] text-slate-400">Объект сдан</p>
          </div>

          <div
            onClick={() => setStatusFilter(statusFilter === 'rejected' ? 'all' : 'rejected')}
            className={`cursor-pointer p-4 transition ${statusFilter === 'rejected' ? 'bg-slate-100 dark:bg-slate-800' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
          >
            <p className="text-[11px] text-slate-500">Отклонено</p>
            <p className="mt-1 text-xl font-semibold text-slate-700 dark:text-slate-300">{metrics.rejected}</p>
            <p className="text-[10px] text-slate-400">Мотивированный отказ</p>
          </div>
        </Card>
      </Section>

      {/* Рейтинг ведомств Ростовской области по исполнению */}
      <Section title="Исполнительская дисциплина ведомств РО" hint="Распределение инициатив жителей по ответственным органам власти региона">
        <Card className="overflow-hidden">
          <TableScroll>
            <table className="w-full min-w-[680px] text-left text-xs">
              <thead className="border-b border-slate-200 text-[11px] uppercase text-slate-500 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Орган власти РО</th>
                  <th className="px-3 py-3 text-center">Всего задач</th>
                  <th className="px-3 py-3 text-center">В работе</th>
                  <th className="px-3 py-3 text-center">Завершено</th>
                  <th className="px-3 py-3 text-right">Бюджет инициатив</th>
                  <th className="px-4 py-3 text-center">Действие</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {byBody.map((b) => (
                  <tr key={b.name} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 shrink-0 text-slate-400" />
                        <span>{b.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center font-semibold">{b.total}</td>
                    <td className="px-3 py-3 text-center text-amber-600 dark:text-amber-400 font-medium">{b.inWork}</td>
                    <td className="px-3 py-3 text-center text-emerald-600 dark:text-emerald-400 font-medium">{b.completed}</td>
                    <td className="px-3 py-3 text-right font-medium text-slate-700 dark:text-slate-300">
                      {(b.budget / 1000000).toFixed(1)} млн ₽
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => {
                          setBodyFilter(bodyFilter === b.name ? 'all' : b.name)
                        }}
                        className={`rounded px-2 py-1 text-[11px] font-medium transition ${bodyFilter === b.name ? 'bg-accent text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'}`}
                      >
                        {bodyFilter === b.name ? 'Сбросить' : 'Выбрать'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        </Card>
      </Section>

      {/* Реестр инициатив с прогрессом и экономическим паспортом */}
      <Section
        title={`Реестр инициатив с экономическим паспортом (${filteredApps.length})`}
        action={
          (statusFilter !== 'all' || bodyFilter !== 'all') && (
            <button
              onClick={() => { setStatusFilter('all'); setBodyFilter('all') }}
              className="text-xs text-accent hover:underline"
            >
              Сбросить фильтры
            </button>
          )
        }
      >
        <Card className="divide-y divide-slate-100 dark:divide-slate-800">
          {filteredApps.slice(0, 20).map((a) => {
            const ex = a.analysis.execution
            const ec = a.analysis.economic
            return (
              <div key={a.id} className="p-4 transition hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link to={`/applications/${a.id}`} className="font-semibold text-accent hover:underline">
                        #{a.id}
                      </Link>
                      <span className="text-xs text-slate-400">· {a.cityNorm} · {a.topic}</span>
                      <Badge tone={EXECUTION_TONES[ex.status] || 'slate'}>
                        {ex.statusLabel}
                      </Badge>
                    </div>

                    <Link to={`/applications/${a.id}`} className="mt-1 block text-sm font-medium hover:text-accent">
                      {a.analysis.normalizedTitle}
                    </Link>

                    <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                      {a.analysis.normalizedProposal || a.text}
                    </p>

                    <div className="mt-2.5 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5 text-slate-400" />
                        {ex.responsibleBody}
                      </span>
                      <span className="flex items-center gap-1">
                        <Coins className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        Бюджет: ~{(ec.estimatedCost / 1000000).toFixed(2)} млн ₽
                      </span>
                      {ec.annualSavings > 0 && (
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                          Экономия: {(ec.annualSavings / 1000).toFixed(0)} тыс. ₽/год
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5 text-slate-400" />
                        Охват: ~{ec.beneficiariesCount.toLocaleString('ru-RU')} чел.
                      </span>
                    </div>
                  </div>

                  <div className="flex w-full shrink-0 flex-col items-end sm:w-36">
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {ex.progressPercent}% выполнено
                    </span>
                    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{ width: `${ex.progressPercent}%` }}
                      />
                    </div>
                    <Link
                      to={`/applications/${a.id}`}
                      className="mt-2.5 inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
                    >
                      Паспорт инициативы <ChevronRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </Card>
      </Section>
    </div>
  )
}
