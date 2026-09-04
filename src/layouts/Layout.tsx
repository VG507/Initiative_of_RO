import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Activity, BarChart3, CheckCircle2, ClipboardList, Layers, LayoutDashboard, Lightbulb, MapPin, Menu, Moon, Plus, Search, Sun, Target, X } from 'lucide-react'
import { useStore } from '../store/useStore'
import { Toasts } from '../components/ui'

const NAV = [
  { group: 'Аналитика', items: [
    { to: '/', label: 'Главная', icon: LayoutDashboard },
    { to: '/applications', label: 'Все заявки', icon: ClipboardList },
    { to: '/clusters', label: 'Кластеры проблем', icon: Layers },
    { to: '/municipalities', label: 'Муниципалитеты', icon: MapPin },
    { to: '/analytics', label: 'Аналитика', icon: BarChart3 },
    { to: '/monitoring', label: 'Мониторинг', icon: Activity },
  ]},
  { group: 'Стратегия', items: [
    { to: '/strategy', label: 'Структура стратегии', icon: Target },
    { to: '/strategy/included', label: 'Вошло в стратегию', icon: CheckCircle2 },
    { to: '/strategy/candidates', label: 'Потенциальные инициативы', icon: Lightbulb },
  ]},
]

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
      {NAV.map((g) => (
        <div key={g.group}>
          <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{g.group}</p>
          <div className="space-y-0.5">
            {g.items.map((i) => (
              <NavLink key={i.to} to={i.to} end={i.to === '/'} onClick={onNavigate}
                className={({ isActive }) => `flex items-center gap-2.5 rounded-md px-3 py-2 text-sm ${isActive ? 'bg-accent/10 font-medium text-accent' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}>
                <i.icon className="h-4 w-4 shrink-0" />{i.label}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
      <div>
        <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Действия</p>
        <Link to="/submit" onClick={onNavigate} className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
          <Plus className="h-4 w-4 shrink-0" />Добавить инициативу
        </Link>
      </div>
    </nav>
  )
}

export default function Layout() {
  const { init, theme, toggleTheme, loading, error } = useStore()
  const location = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  useEffect(() => {
    if (q.trim().length < 2) return
    const t = setTimeout(() => navigate(`/applications?q=${encodeURIComponent(q.trim())}`), 400)
    return () => clearTimeout(t)
  }, [q, navigate])
  useEffect(() => { init() }, [init])
  useEffect(() => { document.documentElement.classList.toggle('dark', theme === 'dark') }, [theme])
  useEffect(() => { window.scrollTo(0, 0); setOpen(false) }, [location.pathname])

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:flex">
        <Link to="/" className="flex h-16 items-center gap-2.5 border-b border-slate-200 px-5 dark:border-slate-800">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-sm font-bold text-white">РО</span>
          <span className="text-sm font-semibold leading-tight">Инициативы<br />Ростовской области</span>
        </Link>
        <NavLinks />
        <p className="border-t border-slate-200 p-4 text-[10px] leading-relaxed text-slate-400 dark:border-slate-800">Аналитический инструмент. Классификация соответствия Стратегии выполняется автоматически и не является официальным решением.</p>
      </aside>

      <div className="flex min-h-screen flex-col lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90 sm:px-6">
          <button aria-label="Меню" className="rounded-md p-2 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden" onClick={() => setOpen(true)}><Menu className="h-5 w-5" /></button>
          <form className="relative hidden max-w-md flex-1 sm:block" onSubmit={(e) => { e.preventDefault(); if (q.trim()) navigate(`/applications?q=${encodeURIComponent(q.trim())}`) }}>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} aria-label="Поиск по заявкам" placeholder="Поиск: «дороги в Новочеркасске»…" className="h-9 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent dark:border-slate-700 dark:bg-slate-800" />
          </form>
          <div className="ml-auto flex items-center gap-2">
            <button aria-label="Переключить тему" onClick={toggleTheme} className="rounded-md p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
              {theme === 'light' ? <Moon className="h-5 w-5 text-slate-500" /> : <Sun className="h-5 w-5 text-slate-400" />}
            </button>
            <Link to="/submit" className="hidden rounded-md bg-accent px-3.5 py-2 text-xs font-medium text-white hover:bg-accent-600 sm:block">Добавить инициативу</Link>
          </div>
        </header>

        {error && <div className="border-b border-red-200 bg-red-50 px-6 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-900/30 dark:text-red-300">{error}</div>}

        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
        <footer className="border-t border-slate-200 px-6 py-4 text-[11px] text-slate-400 dark:border-slate-800">
          Данные обезличены · Аналитическая классификация, не официальное решение государственного органа
          {loading && ' · загрузка данных…'}
        </footer>
      </div>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col bg-white dark:bg-slate-900">
            <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-800">
              <span className="text-sm font-semibold">Навигация</span>
              <button aria-label="Закрыть меню" onClick={() => setOpen(false)}><X className="h-5 w-5" /></button>
            </div>
            <NavLinks onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
      <Toasts />
    </div>
  )
}