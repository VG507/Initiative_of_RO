import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Info, X } from 'lucide-react'
import { useStore } from '../store/useStore'
import { ALIGN_LABELS, QUALITY_LABELS, type StrategicAlignment } from '../types'

export function Card({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={`rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 ${className}`}>{children}</div>
}

const TONES: Record<string, string> = {
  emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  blue: 'bg-accent/10 text-accent dark:bg-accent/20 dark:text-accent-200',
  sky: 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
  amber: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  orange: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  slate: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  red: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
}

export function Badge({ tone = 'slate', children }: { tone?: keyof typeof TONES | string; children: ReactNode }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium ${TONES[tone] || TONES.slate}`}>{children}</span>
}

export const qualityTone = (q: string) => ({ high: 'emerald', useful: 'blue', analysis: 'amber', low: 'orange', irrelevant: 'slate' }[q] || 'slate')
export const alignTone = (a: StrategicAlignment) => ({ direct: 'emerald', high: 'blue', medium: 'sky', weak: 'slate', none: 'slate' }[a] || 'slate')

export function ScoreBadge({ value }: { value: number }) {
  const tone = value >= 90 ? 'emerald' : value >= 70 ? 'blue' : value >= 50 ? 'amber' : value >= 25 ? 'orange' : 'slate'
  return <Badge tone={tone}>Полезность {value}</Badge>
}
export function AlignBadge({ level }: { level: StrategicAlignment }) {
  return <Badge tone={alignTone(level)}>● {ALIGN_LABELS[level]}</Badge>
}
export function QualityBadge({ quality }: { quality: string }) {
  return <Badge tone={qualityTone(quality)}>● {QUALITY_LABELS[quality as keyof typeof QUALITY_LABELS]}</Badge>
}

export function InfoTip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex" tabIndex={0} aria-label={text}>
      <Info className="h-3.5 w-3.5 cursor-help text-slate-400" />
      <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-1 w-56 -translate-x-1/2 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-normal leading-snug text-slate-600 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus:opacity-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">{text}</span>
    </span>
  )
}

export function KpiCard({ label, value, hint, onClick }: { label: string; value: number | string; hint?: string; onClick?: () => void }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag onClick={onClick} className={`flex flex-col rounded-lg border border-slate-200 bg-white p-4 text-left dark:border-slate-800 dark:bg-slate-900 ${onClick ? 'transition hover:border-accent/50 hover:shadow-sm' : ''}`}>
      <span className="flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">{label}{hint && <InfoTip text={hint} />}</span>
      <span className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">{value}</span>
    </Tag>
  )
}

export function Skeleton({ className = 'h-4 w-full' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-slate-200 dark:bg-slate-800 ${className}`} />
}
export function SkeletonGrid({ n = 8 }: { n?: number }) {
  return <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{Array.from({ length: n }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: { label: string; to?: string; onClick?: () => void } }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-900">
      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</p>
      {description && <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">{description}</p>}
      {action && (
        action.onClick || !action.to ? <button onClick={action.onClick} className="mt-4 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-600">{action.label}</button>
        : <Link to={action.to} className="mt-4 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-600">{action.label}</Link>
      )}
    </div>
  )
}

export function Select({ value, onChange, options, ariaLabel }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; ariaLabel?: string }) {
  return (
    <select aria-label={ariaLabel} value={value} onChange={(e) => onChange(e.target.value)}
      className="h-9 w-full rounded-md border border-slate-300 bg-white px-2.5 text-sm text-slate-900 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

export function MultiSelect({ label, options, selected, onChange }: { label: string; options: { value: string; label: string; count?: number }[]; selected: string[]; onChange: (v: string[]) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (open && ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])
  const toggle = (v: string) => onChange(selected.includes(v) ? selected.filter((s) => s !== v) : [...selected, v])
  return (
    <div className="relative" ref={ref}>
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-full items-center justify-between gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900">
        <span className={selected.length ? 'text-slate-900 dark:text-slate-100' : 'text-slate-500'}>{label}{selected.length ? `: ${selected.length}` : ''}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
      </button>
      {open && (
        <div className="absolute z-40 mt-1 max-h-72 w-full min-w-[230px] overflow-auto rounded-md border border-slate-200 bg-white p-1.5 shadow-lg dark:border-slate-700 dark:bg-slate-900">
          {options.map((o) => (
            <label key={o.value} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800">
              <input type="checkbox" aria-label={o.label} className="h-4 w-4 accent-[#0F4C81]" checked={selected.includes(o.value)} onChange={() => toggle(o.value)} />
              <span className="text-slate-700 dark:text-slate-300">{o.label}</span>
              {o.count !== undefined && <span className="ml-auto text-xs text-slate-400">{o.count}</span>}
            </label>
          ))}
          {selected.length > 0 && <button onClick={() => onChange([])} className="mt-1 w-full rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800">Очистить</button>}
        </div>
      )}
    </div>
  )
}

export function Pagination({ page, size, total, onPage, onSize }: { page: number; size: number; total: number; onPage: (p: number) => void; onSize: (n: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / size))
  const nums: number[] = []
  for (let i = Math.max(1, page - 2); i <= Math.min(pages, page + 2); i++) nums.push(i)
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
      <p className="text-xs text-slate-500">{total === 0 ? '0' : `${(page - 1) * size + 1}–${Math.min(page * size, total)}`} из {total}</p>
      <div className="flex items-center gap-1">
        <select aria-label="Заявок на страницу" value={size} onChange={(e) => onSize(Number(e.target.value))} className="h-8 rounded-md border border-slate-300 bg-white px-1.5 text-xs dark:border-slate-700 dark:bg-slate-900">
          {[20, 50, 100].map((n) => <option key={n} value={n}>{n} / стр.</option>)}
        </select>
        <button aria-label="Назад" disabled={page <= 1} onClick={() => onPage(page - 1)} className="rounded-md border border-slate-300 p-1.5 disabled:opacity-40 dark:border-slate-700"><ChevronLeft className="h-4 w-4" /></button>
        {nums.map((n) => (
          <button key={n} onClick={() => onPage(n)} className={`h-8 w-8 rounded-md border text-xs ${n === page ? 'border-accent bg-accent text-white' : 'border-slate-300 dark:border-slate-700'}`}>{n}</button>
        ))}
        <button aria-label="Вперёд" disabled={page >= pages} onClick={() => onPage(page + 1)} className="rounded-md border border-slate-300 p-1.5 disabled:opacity-40 dark:border-slate-700"><ChevronRight className="h-4 w-4" /></button>
      </div>
    </div>
  )
}

export function Toasts() {
  const toast = useStore((s) => s.toast)
  const hide = useStore((s) => s.hideToast)
  useEffect(() => { if (toast) { const t = setTimeout(hide, 7000); return () => clearTimeout(t) } }, [toast])
  if (!toast) return null
  return (
    <div role="status" className="fixed bottom-4 right-4 z-[100] flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-xl dark:border-slate-700 dark:bg-slate-800">
      <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
      <span className="text-sm">{toast.message}</span>
      {toast.actionLabel && toast.actionTo && <Link to={toast.actionTo} className="rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-white">{toast.actionLabel}</Link>}
      <button onClick={hide} aria-label="Закрыть"><X className="h-4 w-4 text-slate-400" /></button>
    </div>
  )
}

export function Section({ title, children, hint }: { title: string; children: ReactNode; hint?: string }) {
  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}{hint && <InfoTip text={hint} />}</h2>
      {children}
    </section>
  )
}
