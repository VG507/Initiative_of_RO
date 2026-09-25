import { useMemo, useState, type ReactNode } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Application } from '../types'
import { dynamicsSeries } from '../utils/analytics'
import { useIsMobile } from '../hooks/useIsMobile'
import { useStore } from '../store/useStore'

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

const trunc = (v: string, max: number) => {
  if (!v || v.length <= max) return v
  const cut = v.slice(0, max)
  const sp = cut.lastIndexOf(' ')
  return (sp > max * 0.55 ? cut.slice(0, sp) : cut).trim() + '…'
}

function CategoryTick({ x, y, payload, mobile, width, isDark }: any) {
  const value: string = payload?.value ?? ''
  const fs = mobile ? 10 : 11.5
  const textColor = isDark ? '#cbd5e1' : '#334155'
  const maxChars = Math.max(12, Math.floor((width || 170) / (mobile ? 6.5 : 7.2)))
  
  if (value.length > maxChars) {
    const sp = value.lastIndexOf(' ', maxChars)
    const splitIdx = sp > 4 ? sp : maxChars
    const line1 = value.slice(0, splitIdx)
    const line2 = trunc(value.slice(splitIdx).trim(), maxChars)
    return (
      <g transform={`translate(${x},${y})`}>
        <text x={-8} y={-5} textAnchor="end" fontSize={fs} fontWeight={500} fill={textColor}>{line1}</text>
        <text x={-8} y={8} textAnchor="end" fontSize={fs - 1} fill={isDark ? '#94a3b8' : '#64748b'}>{line2}</text>
      </g>
    )
  }
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={-8} y={3} textAnchor="end" fontSize={fs} fontWeight={500} fill={textColor}>{value}</text>
    </g>
  )
}

export function HBar({ data, height, maxItems = 10, onClick, suffix = 'заявок', ariaLabel }: {
  data: { name: string; value: number; tooltip?: string }[]
  height?: number; maxItems?: number; onClick?: (name: string) => void; suffix?: string; ariaLabel?: string
}) {
  const isMobile = useIsMobile()
  const theme = useStore((s) => s.theme)
  const isDark = theme === 'dark'
  
  // Ограничиваем количество строк, чтобы график не превращался в нечитаемый забор
  const displayData = data.slice(0, maxItems)
  const dynamicHeight = height ?? Math.max(260, displayData.length * 36 + 40)
  const yw = isMobile ? 120 : 160
  const gridStroke = isDark ? '#334155' : '#f1f5f9'
  const cursorFill = isDark ? 'rgba(255, 255, 255, 0.05)' : '#0F4C810D'

  return (
    <A11yChart label={ariaLabel ?? `Распределение заявок: ${dataLabel(displayData)}`}>
      <ResponsiveContainer width="100%" height={dynamicHeight}>
        <BarChart
          data={displayData}
          layout="vertical"
          margin={{ top: 8, right: 36, left: 10, bottom: 8 }}
          onClick={(s: any) => { const p = s?.activePayload?.[0]?.payload; if (p && onClick) onClick(p.name) }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={gridStroke} />
          <XAxis type="number" tick={{ fontSize: 10, fill: isDark ? '#64748b' : '#94a3b8' }} allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="name"
            width={yw}
            interval={0}
            tickLine={false}
            axisLine={{ stroke: isDark ? '#334155' : '#cbd5e1' }}
            tick={<CategoryTick mobile={isMobile} width={yw} isDark={isDark} />}
          />
          <Tooltip content={<ChartTooltip suffix={suffix} />} cursor={{ fill: cursorFill }} />
          <Bar
            dataKey="value"
            fill="#0F4C81"
            radius={[0, 4, 4, 0]}
            maxBarSize={20}
            isAnimationActive={false}
            label={{
              position: 'right',
              fill: isDark ? '#94a3b8' : '#475569',
              fontSize: 11,
              fontWeight: 600,
              offset: 8
            }}
          >
            {displayData.map((_, i) => (
              <Cell
                key={i}
                className="cursor-pointer transition-opacity hover:opacity-80"
                fill={i === 0 ? (isDark ? '#38bdf8' : '#0F4C81') : (isDark ? '#0284c7' : '#3B82F6')}
              />
            ))}
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
  const isMobile = useIsMobile()
  const theme = useStore((s) => s.theme)
  const isDark = theme === 'dark'
  const gridStroke = isDark ? '#334155' : '#e2e8f0'
  const cursorFill = isDark ? 'rgba(255, 255, 255, 0.05)' : '#0F4C810D'
  const barColor = isDark && color === '#0F4C81' ? '#38bdf8' : color

  const angled = data.length > (isMobile ? 3 : 5) || data.some((d) => d.name.length > (isMobile ? 9 : 12))
  return (
    <A11yChart label={ariaLabel ?? `Распределение заявок: ${dataLabel(data)}`}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: isMobile ? -14 : -20, bottom: 0 }}
          onClick={(s: any) => { const p = s?.activePayload?.[0]?.payload; if (p && onClick) onClick(p.name) }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
          <XAxis dataKey="name" tick={{ fontSize: isMobile ? 9 : 10, fill: isDark ? '#94a3b8' : '#64748b' }} interval={0}
            angle={angled ? -35 : 0} textAnchor={angled ? 'end' : 'middle'}
            height={angled ? (isMobile ? 64 : 56) : 30}
            tickFormatter={(v: string) => trunc(v, isMobile ? 10 : 18)} />
          <YAxis tick={{ fontSize: isMobile ? 9 : 11, fill: isDark ? '#64748b' : '#94a3b8' }} allowDecimals={false} />
          <Tooltip content={<ChartTooltip suffix={suffix} />} cursor={{ fill: cursorFill }} />
          <Bar dataKey="value" fill={barColor} radius={[3, 3, 0, 0]} maxBarSize={34} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </A11yChart>
  )
}

export function DynamicsChart({ apps }: { apps: Application[] }) {
  const [g, setG] = useState<'day' | 'week' | 'month'>('day')
  const isMobile = useIsMobile()
  const theme = useStore((s) => s.theme)
  const isDark = theme === 'dark'
  const gridStroke = isDark ? '#334155' : '#e2e8f0'
  const strokeColor = isDark ? '#38bdf8' : '#0F4C81'

  const data = useMemo(() => dynamicsSeries(apps, g), [apps, g])
  const labels = { day: 'День', week: 'Неделя', month: 'Месяц' } as const
  return (
    <div>
      <div className="mb-2 flex justify-end gap-1.5" role="group" aria-label="Период">
        {(Object.keys(labels) as (keyof typeof labels)[]).map((k) => (
          <button key={k} onClick={() => setG(k)} className={`min-h-[44px] rounded-md px-3 text-xs ${g === k ? 'bg-accent text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'}`}>{labels[k]}</button>
        ))}
      </div>
      <A11yChart label={`Динамика поступления заявок (${labels[g].toLowerCase()}): ${dataLabel(data)}`}>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 8, right: 8, left: isMobile ? -14 : -20, bottom: 0 }}>
            <defs>
              <linearGradient id="dg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={strokeColor} stopOpacity={isDark ? 0.35 : 0.25} />
                <stop offset="100%" stopColor={strokeColor} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
            <XAxis dataKey="name" tick={{ fontSize: isMobile ? 9 : 10, fill: isDark ? '#94a3b8' : '#64748b' }} interval={isMobile && data.length > 5 ? 1 : 0} />
            <YAxis tick={{ fontSize: isMobile ? 9 : 11, fill: isDark ? '#64748b' : '#94a3b8' }} allowDecimals={false} />
            <Tooltip content={<ChartTooltip suffix="заявок" />} />
            <Area type="monotone" dataKey="value" stroke={strokeColor} strokeWidth={2} fill="url(#dg)" isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </A11yChart>
    </div>
  )
}