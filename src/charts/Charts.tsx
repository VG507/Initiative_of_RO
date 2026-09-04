import { useMemo, useState, type ReactNode } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Application } from '../types'
import { dynamicsSeries } from '../utils/analytics'

function ChartTooltip({ active, payload, label, suffix }: any) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-slate-700 dark:bg-slate-800">
      <div className="font-medium text-slate-900 dark:text-slate-100">{p.tooltip ?? label ?? p.name}</div>
      <div className="mt-0.5 text-slate-500 dark:text-slate-400">{p.value} {suffix ?? ''}</div>
    </div>
  )
}

function A11yChart({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="img" aria-label={label}>
      <div aria-hidden="true">{children}</div>
    </div>
  )
}

const dataLabel = (data: { name: string; value: number }[]) =>
  data.map((d) => `${d.name} — ${d.value}`).join(', ')

const tickFmt = (v: string) => (v && v.length > 14 ? v.slice(0, 13) + '…' : v)

export function HBar({ data, height = 300, onClick, suffix = 'заявок', ariaLabel }: {
  data: { name: string; value: number; tooltip?: string }[]
  height?: number; onClick?: (name: string) => void; suffix?: string; ariaLabel?: string
}) {
  return (
    <A11yChart label={ariaLabel ?? `Распределение заявок: ${dataLabel(data)}`}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
          onClick={(s: any) => { const p = s?.activePayload?.[0]?.payload; if (p && onClick) onClick(p.name) }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
          <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
          <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} tickFormatter={tickFmt} />
          <Tooltip content={<ChartTooltip suffix={suffix} />} cursor={{ fill: '#0F4C810D' }} />
          <Bar dataKey="value" fill="#0F4C81" radius={[0, 3, 3, 0]} maxBarSize={22} isAnimationActive={false}>
            {data.map((_, i) => <Cell key={i} fill={i === 0 ? '#0F4C81' : '#5B8DB8'} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </A11yChart>
  )
}

export function VBar({ data, height = 260, color = '#0F4C81', onClick, suffix = 'заявок', ariaLabel }: {
  data: { name: string; value: number; tooltip?: string }[]
  height?: number; color?: string; onClick?: (name: string) => void; suffix?: string; ariaLabel?: string
}) {
  // наклоняем подписи, если их много или они длинные — иначе наплывают
  const angled = data.length > 4 || data.some((d) => d.name.length > 10)
  return (
    <A11yChart label={ariaLabel ?? `Распределение заявок: ${dataLabel(data)}`}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
          onClick={(s: any) => { const p = s?.activePayload?.[0]?.payload; if (p && onClick) onClick(p.name) }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} interval={0}
            angle={angled ? -30 : 0} textAnchor={angled ? 'end' : 'middle'}
            height={angled ? 64 : 30} tickFormatter={tickFmt} />
          <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
          <Tooltip content={<ChartTooltip suffix={suffix} />} cursor={{ fill: '#0F4C810D' }} />
          <Bar dataKey="value" fill={color} radius={[3, 3, 0, 0]} maxBarSize={34} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </A11yChart>
  )
}

export function DynamicsChart({ apps }: { apps: Application[] }) {
  const [g, setG] = useState<'day' | 'week' | 'month'>('day')
  const data = useMemo(() => dynamicsSeries(apps, g), [apps, g])
  const labels = { day: 'День', week: 'Неделя', month: 'Месяц' } as const
  return (
    <div>
      <div className="mb-2 flex justify-end gap-1" role="group" aria-label="Период">
        {(Object.keys(labels) as (keyof typeof labels)[]).map((k) => (
          <button key={k} onClick={() => setG(k)} className={`rounded-md px-2.5 py-1 text-xs ${g === k ? 'bg-accent text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'}`}>{labels[k]}</button>
        ))}
      </div>
      <A11yChart label={`Динамика поступления заявок (${labels[g].toLowerCase()}): ${dataLabel(data)}`}>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <defs><linearGradient id="dg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0F4C81" stopOpacity={0.25} /><stop offset="100%" stopColor="#0F4C81" stopOpacity={0.02} /></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
            <Tooltip content={<ChartTooltip suffix="заявок" />} />
            <Area type="monotone" dataKey="value" stroke="#0F4C81" strokeWidth={2} fill="url(#dg)" isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </A11yChart>
    </div>
  )
}