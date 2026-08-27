import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Copy, Download, Filter, LayoutGrid, List, Search } from 'lucide-react'
import { useStore } from '../store/useStore'
import { Badge, Card, EmptyState, Pagination, Select } from '../components/ui'
import { ApplicationCard, ApplicationTable } from '../components/app/ApplicationViews'
import { FiltersPanel } from '../components/app/FiltersPanel'
import { filtersToSearch, searchToState, SORT_OPTIONS, useFilteredApps } from '../utils/filters'
import { download, toCSV } from '../utils/format'
import { useToast } from './useToast'

const PRESETS = [
  { key: 'all', label: 'Все' }, { key: 'top', label: 'Самые полезные' }, { key: 'new', label: 'Новые' },
  { key: 'frequent', label: 'Часто повторяются' }, { key: 'strategic', label: 'Потенциально стратегические' },
  { key: 'existing', label: 'Уже есть в стратегии' }, { key: 'analysis', label: 'Требуют анализа' },
  { key: 'low', label: 'Низкое качество' }, { key: 'irrelevant', label: 'Нерелевантные' },
]

export default function Applications() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { filters, sort, view, page, pageSize, loading, setFilters, resetFilters, setSort, setView, setPage, setPageSize } = useStore()
  const total = useStore((s) => s.applications.length)
  const filtered = useFilteredApps()
  const [open, setOpen] = useState(false)
  const showToast = useToast()

  // URL -> состояние (при переходе по ссылке с фильтрами)
  useEffect(() => {
    const st = searchToState(new URLSearchParams(searchParams.toString()))
    useStore.setState({ filters: st.filters, sort: st.sort, view: st.view, page: st.page, pageSize: st.size })
  }, [searchParams])

  // Состояние -> URL (ссылку можно скопировать и отправить)
   // Состояние -> URL (ссылку можно скопировать и отправить)
  useEffect(() => {
    const qs = filtersToSearch(filters, sort, view, page, pageSize)
    if (searchParams.toString() !== qs) {
      setSearchParams(qs ? `?${qs}` : '?', { replace: true })
    }
  }, [filters, sort, view, page, pageSize, searchParams, setSearchParams])

  const start = (page - 1) * pageSize
  const pageItems = filtered.slice(start, start + pageSize)
  const activeCount = [filters.cities, filters.topics, filters.subtopics, filters.qualities, filters.alignments, filters.statuses].flat().length
    + (filters.duplicate !== 'all' ? 1 : 0) + (filters.hasAttachment !== 'all' ? 1 : 0)
    + (filters.scoreMin > 0 || filters.scoreMax < 100 ? 1 : 0) + (filters.dateFrom || filters.dateTo ? 1 : 0)
    + (filters.minSimilar > 0 ? 1 : 0)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">Все заявки <span className="text-sm font-normal text-slate-400">{filtered.length} из {total}</span></h1>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => download('initiatives.csv', toCSV(filtered), 'text/csv;charset=utf-8')} className="flex items-center gap-1.5 rounded-md border border-slate-300 px-2.5 py-2 text-xs hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"><Download className="h-3.5 w-3.5" />CSV</button>
          <button onClick={() => download('initiatives.json', JSON.stringify(filtered, null, 2), 'application/json')} className="flex items-center gap-1.5 rounded-md border border-slate-300 px-2.5 py-2 text-xs hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"><Download className="h-3.5 w-3.5" />JSON</button>
          <button onClick={() => { navigator.clipboard?.writeText(window.location.href); showToast('Ссылка скопирована') }} className="flex items-center gap-1.5 rounded-md border border-slate-300 px-2.5 py-2 text-xs hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"><Copy className="h-3.5 w-3.5" />Ссылка</button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button key={p.key} onClick={() => { setFilters({ preset: p.key }); if (p.key === 'new') setSort('date_desc') }}
            className={`rounded-md px-3 py-1.5 text-xs ${filters.preset === p.key ? 'bg-accent text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'}`}>{p.label}</button>
        ))}
      </div>

      <Card className="flex flex-wrap items-center gap-2 p-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={filters.search} aria-label="Поиск" placeholder="Поиск по тексту, теме, муниципалитету, ID…"
            onChange={(e) => { const v = e.target.value; setFilters({ search: v, preset: 'all' }); if (v && sort === 'usefulness_desc') setSort('relevance') }}
            className="h-9 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent dark:border-slate-700 dark:bg-slate-800" />
        </div>
        <div className="w-56"><Select ariaLabel="Сортировка" value={sort} onChange={setSort} options={SORT_OPTIONS} /></div>
        <div className="flex overflow-hidden rounded-md border border-slate-300 dark:border-slate-700">
          <button aria-label="Карточки" onClick={() => setView('cards')} className={`p-2 ${view === 'cards' ? 'bg-accent text-white' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}><LayoutGrid className="h-4 w-4" /></button>
          <button aria-label="Таблица" onClick={() => setView('table')} className={`p-2 ${view === 'table' ? 'bg-accent text-white' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}><List className="h-4 w-4" /></button>
        </div>
        <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-xs dark:border-slate-700">
          <Filter className="h-3.5 w-3.5" />Фильтры{activeCount > 0 && <Badge tone="blue">{activeCount}</Badge>}
        </button>
      </Card>

      {open && <FiltersPanel />}

      {loading ? <p className="py-10 text-center text-sm text-slate-400">Загрузка…</p> : filtered.length === 0 ? (
        <EmptyState title="По выбранным параметрам заявок не найдено" description="Попробуйте изменить фильтры или сбросить их." action={{ label: 'Сбросить фильтры', onClick: resetFilters }} />
      ) : (
        <>
          {view === 'cards'
            ? <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">{pageItems.map((a) => <ApplicationCard key={a.id} app={a} />)}</div>
            : <ApplicationTable apps={pageItems} />}
          <Pagination page={page} size={pageSize} total={filtered.length} onPage={setPage} onSize={setPageSize} />
        </>
      )}
    </div>
  )
}