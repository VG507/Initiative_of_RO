import { Fragment, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronUp, Download, Eye, Loader2, MapPin, Users } from 'lucide-react'
import { useStore } from '../store/useStore'
import { AlignBadge, Badge, Card, InfoTip, Section, TableScroll } from '../components/ui'
import { HBar, VBar, DynamicsChart } from '../charts/Charts'
import { alignmentDist, byDirection, byMunicipality, qualityDist, topProblems } from '../utils/analytics'
import { getUserApplicationCount } from '../services/applicationsService'
import { ALL_RO_MUNICIPALITIES, MUNICIPALITY_POPULATION, RO_TOTAL_POPULATION } from '../data/municipalityPopulation'
import { generateAnalyticsPdfReport } from '../services/pdfReportService'
import { ALIGN_LABELS } from '../types'
import { useToast } from './useToast'

export default function Analytics() {
  const { applications, clusters, loading } = useStore()
  const navigate = useNavigate()
  const showToast = useToast()
  const [expanded, setExpanded] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [munLimit, setMunLimit] = useState(8)
  const [perCapitaLimit, setPerCapitaLimit] = useState(8)
  const [showUncoveredList, setShowUncoveredList] = useState(false)

  const handleExportPdf = async (includeDetails: boolean = false) => {
    try {
      setIsExporting(true)
      const fileName = generateAnalyticsPdfReport(applications, clusters, {
        includeDetailedList: includeDetails,
        maxDetailedItems: 150
      })
      showToast(`Отчёт сформирован: ${fileName}`)
    } catch (err) {
      console.error(err)
      showToast('Ошибка при формировании отчёта')
    } finally {
      setIsExporting(false)
    }
  }

  if (loading) return <p className="py-10 text-center text-sm text-slate-400">Загрузка…</p>

  const dirs = byDirection(applications)
  const muns = byMunicipality(applications)
  const qd = qualityDist(applications)
  const ad = alignmentDist(applications)
  const problems = topProblems(clusters, 10)
  const dupPairs = applications.filter((a) => a.analysis.isDuplicate)
  const matrix = [...applications].sort((a, b) => b.analysis.usefulnessScore - a.analysis.usefulnessScore).slice(0, 30)

  const userAdded = useMemo(() => getUserApplicationCount(), [applications])
  const last7Count = useMemo(() => {
    const d7 = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10)
    return applications.filter((a) => a.dateIso >= d7).length
  }, [applications])

  const stats: [string, string | number, string?][] = [
    ['Всего заявок', applications.length],
    ['Новых за 7 дней', last7Count, 'Поступившие за последнюю неделю'],
    ['Добавлено через сайт', userAdded, 'Заявки, поданные жителями через форму портала'],
    ['Уникальных проблем', clusters.length],
    ['Кластеров с повторением 3+', clusters.filter((c) => c.frequency >= 3).length],
    ['Дубликатов', dupPairs.length],
    ['Средняя полезность', Math.round(applications.reduce((s, a) => s + a.analysis.usefulnessScore, 0) / (applications.length || 1))],
    ['С прямым соответствием', applications.filter((a) => a.analysis.alignment === 'direct').length],
  ]

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Аналитика</h1>
          <p className="mt-1 text-sm text-slate-500">Полный аналитический срез по базе инициатив.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExportPdf(false)}
            disabled={isExporting}
            className="flex min-h-[40px] items-center gap-1.5 rounded-md bg-accent px-3.5 text-xs font-medium text-white shadow-sm hover:bg-accent/90 disabled:opacity-50"
          >
            {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            {isExporting ? 'Генерация PDF…' : 'Скачать сводный PDF-отчёт'}
          </button>
          <button
            onClick={() => handleExportPdf(true)}
            disabled={isExporting}
            title="Включает реестр заявок в виде приложения"
            className="flex min-h-[40px] items-center gap-1.5 rounded-md border border-slate-300 px-3 text-xs text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 disabled:opacity-50"
          >
            Полный с реестром
          </button>
        </div>
      </div>

      <Section title="Общая статистика и оперативный мониторинг">
        <Card className="grid grid-cols-2 gap-px overflow-hidden bg-slate-100 dark:bg-slate-800 md:grid-cols-4">
          {stats.map(([l, v, hint]) => (
            <div key={l} className="bg-white p-3 dark:bg-slate-900 sm:p-4">
              <p className="flex items-center gap-1 text-xs text-slate-500">
                {l}
                {hint && <InfoTip text={hint} />}
              </p>
              <p className="mt-1 text-xl font-semibold sm:text-2xl">{v}</p>
            </div>
          ))}
        </Card>
      </Section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Section title="Тематическая структура">
          <Card className="p-3 sm:p-4"><HBar data={dirs} onClick={(name) => { const d = dirs.find((x) => x.name === name); if (d) navigate(`/applications?topic=${encodeURIComponent(d.full)}`) }} /></Card>
        </Section>
        <Section
          title="География проблем (всего заявок)"
          action={
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <button
                onClick={() => setMunLimit(8)}
                className={`rounded px-1.5 py-0.5 font-medium transition ${munLimit === 8 ? 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              >
                Топ-8
              </button>
              <button
                onClick={() => setMunLimit(15)}
                className={`rounded px-1.5 py-0.5 font-medium transition ${munLimit === 15 ? 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              >
                Топ-15
              </button>
              <button
                onClick={() => setMunLimit(muns.length)}
                className={`rounded px-1.5 py-0.5 font-medium transition ${munLimit === muns.length ? 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              >
                Все
              </button>
            </div>
          }
        >
          <Card className="p-3 sm:p-4">
            <HBar
              data={muns.map((m) => ({
                name: m.name,
                value: m.value,
                tooltip: `${m.name}: ${m.value} (${m.share}%) · уникальных проблем: ${m.uniqueProblems}`
              }))}
              suffix="заявок"
              maxItems={munLimit}
              height={munLimit > 10 ? munLimit * 32 + 50 : undefined}
              onClick={(name) => navigate(`/municipalities/${encodeURIComponent(name)}`)}
            />
          </Card>
        </Section>

        <Section
          title="Гражданская активность (на 10 000 жителей)"
          hint="Отношение числа поданных заявок к численности населения муниципалитета. Уравнивает шансы крупных городов и малых районов."
          action={
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <button
                onClick={() => setPerCapitaLimit(8)}
                className={`rounded px-1.5 py-0.5 font-medium transition ${perCapitaLimit === 8 ? 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              >
                Топ-8
              </button>
              <button
                onClick={() => setPerCapitaLimit(15)}
                className={`rounded px-1.5 py-0.5 font-medium transition ${perCapitaLimit === 15 ? 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              >
                Топ-15
              </button>
            </div>
          }
        >
          <Card className="p-3 sm:p-4">
            <HBar
              data={[...muns]
                .sort((a, b) => b.perCapitaActivity - a.perCapitaActivity)
                .map((m) => ({
                  name: m.name,
                  value: m.perCapitaActivity,
                  tooltip: `${m.name}: ${m.perCapitaActivity} на 10 тыс. жителей (всего обращений: ${m.value}, население: ${m.population ? (m.population / 1000).toFixed(0) + ' тыс.' : '—'})`
                }))}
              suffix="на 10 тыс. чел."
              maxItems={perCapitaLimit}
              height={perCapitaLimit > 10 ? perCapitaLimit * 32 + 50 : undefined}
              onClick={(name) => navigate(`/municipalities/${encodeURIComponent(name)}`)}
            />
          </Card>
        </Section>

        <Section
          title="Охват населения инициативами"
          hint="Детальный демографический срез: какая доля жителей РО вовлечена в подачу инициатив, а какие территории пока не подали ни одной заявки"
        >
          <Card className="p-4 sm:p-5">
            {(() => {
              const coveredPopulation = muns.reduce((sum, m) => sum + (m.population || 0), 0)
              const coveragePercent = Math.min(100, Math.round((coveredPopulation / RO_TOTAL_POPULATION) * 100))
              const totalPerCapitaRO = Number(((applications.length / RO_TOTAL_POPULATION) * 10000).toFixed(2))

              // Список активных названий
              const coveredNames = new Set(muns.map((m) => m.name.toLowerCase()))
              // Список неактивных муниципалитетов из всех 55 МО области
              const uncovered = ALL_RO_MUNICIPALITIES.filter((name) => {
                const n = name.toLowerCase()
                return !coveredNames.has(n) && !coveredNames.has(n.replace(/^город\s+/i, ''))
              }).map((name) => ({
                name,
                population: MUNICIPALITY_POPULATION[name] || 0
              })).sort((a, b) => b.population - a.population)

              const uncoveredPopulation = uncovered.reduce((s, u) => s + u.population, 0)

              // Разделение на города и районы
              const coveredCities = muns.filter((m) => !m.name.includes('район'))
              const coveredDistricts = muns.filter((m) => m.name.includes('район'))
              const cityApps = coveredCities.reduce((s, m) => s + m.value, 0)
              const districtApps = coveredDistricts.reduce((s, m) => s + m.value, 0)

              return (
                <div className="space-y-5">
                  {/* Главная плашка прогресса */}
                  <div>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-accent" />
                        <span className="text-2xl font-bold tracking-tight text-accent sm:text-3xl">
                          {coveragePercent}%
                        </span>
                        <span className="text-xs font-medium text-slate-500">
                          населения Ростовской области охвачено
                        </span>
                      </div>
                      <div className="text-right text-xs">
                        <span className="text-slate-400">Плотность по региону:</span>
                        <span className="ml-1.5 font-semibold text-slate-700 dark:text-slate-200">
                          {totalPerCapitaRO} на 10 тыс. чел.
                        </span>
                      </div>
                    </div>

                    <div className="mt-2.5 space-y-1.5">
                      <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-accent/80 to-accent transition-all duration-500"
                          style={{ width: `${coveragePercent}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-400">
                        <span>Охвачено: {(coveredPopulation / 1000000).toFixed(2)} млн жителей ({muns.length} МО)</span>
                        <span>Не охвачено: {(uncoveredPopulation / 1000000).toFixed(2)} млн ({uncovered.length} МО)</span>
                      </div>
                    </div>
                  </div>

                  {/* Срез Города vs Сельские районы */}
                  <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800/60 dark:bg-slate-800/40">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Структура вовлечения по типу территорий</p>
                    <div className="mt-2 grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600 dark:text-slate-300">Городские округа:</span>
                          <span className="font-semibold text-slate-900 dark:text-slate-100">{cityApps} заявок</span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-slate-400">{coveredCities.length} из 12 городов области</p>
                      </div>
                      <div className="border-l border-slate-200 pl-3 dark:border-slate-700">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600 dark:text-slate-300">Муниципальные районы:</span>
                          <span className="font-semibold text-slate-900 dark:text-slate-100">{districtApps} заявок</span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-slate-400">{coveredDistricts.length} из 43 районов области</p>
                      </div>
                    </div>
                  </div>

                  {/* Мини-сетка ключевых факторов */}
                  <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                    <div className="rounded border border-slate-100 p-2 dark:border-slate-800">
                      <p className="text-[11px] text-slate-400">Охвачено МО</p>
                      <p className="mt-0.5 font-semibold text-slate-800 dark:text-slate-200">{muns.length} из 55 МО</p>
                    </div>
                    <div className="rounded border border-slate-100 p-2 dark:border-slate-800">
                      <p className="text-[11px] text-slate-400">Лидер активности</p>
                      <p className="mt-0.5 truncate font-semibold text-accent" title={[...muns].sort((a, b) => b.perCapitaActivity - a.perCapitaActivity)[0]?.name}>
                        {[...muns].sort((a, b) => b.perCapitaActivity - a.perCapitaActivity)[0]?.name || '—'}
                      </p>
                    </div>
                    <div className="rounded border border-slate-100 p-2 dark:border-slate-800">
                      <p className="text-[11px] text-slate-400">Рекорд плотности</p>
                      <p className="mt-0.5 font-semibold text-slate-800 dark:text-slate-200">
                        {Math.max(...muns.map((m) => m.perCapitaActivity))} на 10 тыс.
                      </p>
                    </div>
                    <div className="rounded border border-slate-100 p-2 dark:border-slate-800">
                      <p className="text-[11px] text-slate-400">«Белых пятен» (МО)</p>
                      <p className="mt-0.5 font-semibold text-amber-600 dark:text-amber-400">{uncovered.length} районов</p>
                    </div>
                  </div>

                  {/* Раскрывающийся список неохваченных районов ("Зоны роста") */}
                  {uncovered.length > 0 && (
                    <div className="border-t border-slate-100 pt-2 dark:border-slate-800">
                      <button
                        onClick={() => setShowUncoveredList(!showUncoveredList)}
                        className="flex w-full items-center justify-between text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                      >
                        <span className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-amber-500" />
                          Территории без поданных заявок ({uncovered.length} районов)
                        </span>
                        {showUncoveredList ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>

                      {showUncoveredList && (
                        <div className="mt-2.5 max-h-48 overflow-y-auto rounded-md border border-slate-100 bg-slate-50/50 p-2 text-xs dark:border-slate-800 dark:bg-slate-900/40">
                          <p className="mb-2 text-[11px] text-slate-400">
                            Муниципалитеты, от жителей которых ещё не зарегистрировано предложений в текущей базе:
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {uncovered.map((u) => (
                              <span
                                key={u.name}
                                className="inline-flex items-center gap-1 rounded bg-white px-2 py-1 text-[11px] text-slate-700 shadow-xs dark:bg-slate-800 dark:text-slate-300"
                              >
                                {u.name}
                                <span className="text-[10px] text-slate-400">({(u.population / 1000).toFixed(0)} тыс.)</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })()}
          </Card>
        </Section>

        <Section title="Качество заявок">
          <Card className="p-3 sm:p-4"><VBar data={qd.map((d) => ({ name: d.label, value: d.value }))} onClick={(name) => { const q = qd.find((x) => x.label === name); if (q) navigate(`/applications?quality=${q.key}`) }} /></Card>
        </Section>
        <Section title="Стратегическое соответствие">
          <Card className="p-3 sm:p-4"><VBar data={ad.map((d) => ({ name: d.label, value: d.value }))} color="#0E9F6E" onClick={(name) => { const q = ad.find((x) => x.label === name); if (q) navigate(`/applications?align=${q.key}`) }} /></Card>
        </Section>
      </div>

      <Section title="Динамика"><Card className="p-3 sm:p-4"><DynamicsChart apps={applications} /></Card></Section>

      <Section title="Кластеры проблем">
        <Card className="divide-y divide-slate-100 dark:divide-slate-800">
          {problems.map((c) => (
            <Link key={c.id} to={`/clusters/${c.id}`} className="flex w-full min-w-0 items-center justify-between gap-2 overflow-hidden px-4 py-3 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/50">
              <span className="min-w-0 flex-1 truncate">{c.title}</span>
              <span className="flex shrink-0 items-center gap-2"><Badge tone="slate">{c.frequency} заявок</Badge><Badge tone="blue">{c.impactScore}</Badge></span>
            </Link>
          ))}
        </Card>
      </Section>

      <Section title="Дубликаты" hint="Автообнаружение: косинусная близость текстов ≥ 85%">
        {dupPairs.length === 0 ? <Card className="p-4 text-xs text-slate-500">Дубликатов не обнаружено.</Card> : (
          <Card className="divide-y divide-slate-100 dark:divide-slate-800">
            {dupPairs.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center gap-2 px-4 py-3 text-xs">
                <Link to={`/applications/${a.id}`} className="font-medium text-accent">#{a.id}</Link>
                <span className="text-slate-500">дубликат</span>
                <Link to={`/applications/${a.analysis.duplicateOf}`} className="font-medium text-accent">#{a.analysis.duplicateOf}</Link>
                <Badge tone="amber">схожесть {Math.round((a.analysis.similarApplications.find((s) => s.id === a.analysis.duplicateOf)?.score || 0.85) * 100)}%</Badge>
                <span className="min-w-0 flex-1 truncate text-slate-400">{a.analysis.normalizedTitle}</span>
              </div>
            ))}
          </Card>
        )}
      </Section>

      <Section title="Матрица соответствия Стратегии" hint="Аналитическая классификация. Клик по строке — объяснение. Официальный статус устанавливает только ответственный орган. Таблицу можно прокручивать по горизонтали.">
        <Card>
          <TableScroll>
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className="border-b border-slate-200 text-[11px] uppercase text-slate-500 dark:border-slate-800"><tr><th className="px-3 py-2.5">Заявка</th><th className="px-3 py-2.5">Направление</th><th className="px-3 py-2.5">Раздел</th><th className="px-3 py-2.5">Соответствие</th></tr></thead>
              <tbody>
                {matrix.map((a) => {
                  const m = a.analysis.strategyMatches[0]
                  const isExpanded = expanded === a.id
                  return (
                    <Fragment key={a.id}>
                      <tr onClick={() => setExpanded(isExpanded ? null : a.id)} className="cursor-pointer border-b border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50">
                        <td className="px-3 py-2.5"><Link to={`/applications/${a.id}`} onClick={(e) => e.stopPropagation()} className="font-medium text-accent hover:underline">#{a.id}</Link> <span className="text-slate-500">{a.analysis.normalizedTitle.slice(0, 50)}…</span></td>
                        <td className="px-3 py-2.5 text-slate-600 dark:text-slate-400">{a.topic}</td>
                        <td className="px-3 py-2.5 text-slate-600 dark:text-slate-400">{m?.section ?? '—'}</td>
                        <td className="px-3 py-2.5">{m ? <AlignBadge level={m.level} /> : <Badge tone="slate">{ALIGN_LABELS.none}</Badge>}</td>
                      </tr>
                      {isExpanded && (
                        <tr className="border-b border-slate-100 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-800/30">
                          <td colSpan={4} className="px-3 py-2.5 text-slate-600 dark:text-slate-400">
                            {a.analysis.strategyMatches.length ? a.analysis.strategyMatches.map((mm, i) => <p key={i} className="mb-1">{mm.explanation}</p>) : 'Соответствий Стратегии не найдено.'}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </TableScroll>
        </Card>
      </Section>

      <Section title="Муниципальные сравнения" hint="Таблицу можно прокручивать по горизонтали">
        <Card className="p-3 sm:p-4">
          <TableScroll>
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead><tr className="text-slate-500">{['Муниципалитет', 'Заявок', 'Доля', 'Качественных', 'Стратегических', 'Проблем', 'Дубликатов', 'Ср. полезность'].map((h) => <th key={h} className="py-2 pr-4 font-medium">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {muns.map((m) => (
                  <tr key={m.name}><td className="py-2 pr-4"><Link to={`/municipalities/${encodeURIComponent(m.name)}`} className="font-medium text-accent hover:underline">{m.name}</Link></td>
                    <td className="py-2 pr-4">{m.value}</td><td className="py-2 pr-4">{m.share}%</td><td className="py-2 pr-4">{m.quality}</td><td className="py-2 pr-4">{m.strategic}</td><td className="py-2 pr-4">{m.uniqueProblems}</td><td className="py-2 pr-4">{m.duplicates}</td><td className="py-2 pr-4 font-medium">{m.avgScore}</td></tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        </Card>
      </Section>
    </div>
  )
}