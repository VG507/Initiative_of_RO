import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { useStore } from '../store/useStore'
import { applicationsRepository, checkRateLimit } from '../services/applicationsService'
import { Card, Select } from '../components/ui'
import { STRATEGY_DIRECTIONS } from '../strategy/strategyData'

export default function Submit() {
  const navigate = useNavigate()
  const { applications, refresh, showToast } = useStore()
  const [form, setForm] = useState({ problem: '', proposal: '', city: '', topic: '', subtopic: '', effect: '', attachmentUrl: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [dupWarn, setDupWarn] = useState<{ id: string; title: string } | null>(null)
  const [force, setForce] = useState(false)
  const [sending, setSending] = useState(false)
  const [rateMsg, setRateMsg] = useState<string | null>(null)

  const cities = [...new Set(applications.map((a) => a.cityNorm))].sort((a, b) => a.localeCompare(b, 'ru'))
  const topicOpts = STRATEGY_DIRECTIONS.map((d) => ({ value: d.name, label: d.short }))
  const subOpts = [...new Set(applications.filter((a) => !form.topic || a.topic === form.topic).map((a) => a.subtopic))].map((s) => ({ value: s, label: s }))

  const set = (k: string, v: string) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => ({ ...e, [k]: '' })) }

  const validate = () => {
    const e: Record<string, string> = {}
    if (form.problem.trim().length < 30) e.problem = 'Опишите проблему подробнее (минимум 30 символов)'
    if (form.problem.trim().length > 8000) e.problem = 'Слишком длинное сообщение (максимум 8000 символов)'
    if (form.proposal.trim() && form.proposal.trim().length < 10) e.proposal = 'Слишком короткое предложение'
    if (!form.city) e.city = 'Укажите муниципалитет'
    if (!form.topic) e.topic = 'Укажите тему'
    if (!form.subtopic) e.subtopic = 'Укажите подтему'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setRateMsg(null)
    if (!validate()) return
    const limit = checkRateLimit()
    if (!limit.ok) { setRateMsg(limit.message!); return }
    const combined = [form.problem.trim(), form.proposal.trim() && `Предлагаемое решение: ${form.proposal.trim()}`, form.effect.trim() && `Ожидаемый результат: ${form.effect.trim()}`].filter(Boolean).join('\n\n')
    if (!force) {
      const dup = await applicationsRepository.findDuplicate(combined, form.subtopic)
      if (dup) { setDupWarn(dup); return }
    }
    setSending(true)
    try {
      const app = await applicationsRepository.createApplication({ city: form.city, topic: form.topic, subtopic: form.subtopic, text: combined, attachmentUrl: form.attachmentUrl || undefined })
      await refresh()
      showToast('Спасибо. Инициатива добавлена в аналитическую базу.', { label: 'Посмотреть заявку', to: `/applications/${app.id}` })
      navigate(`/applications/${app.id}`)
    } catch (err) {
      setRateMsg((err as Error).message)
    } finally { setSending(false) }
  }

  const inputCls = 'w-full rounded-md border border-slate-300 bg-white p-2.5 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent dark:border-slate-700 dark:bg-slate-900'
  const errCls = (k: string) => errors[k] ? 'border-red-400' : ''

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Предложить инициативу</h1>
        <p className="mt-1 text-sm text-slate-500">Заявка будет обезличена, получит предварительную оценку полезности и будет сопоставлена со Стратегией-2030. Сохраняется в вашем браузере.</p>
      </div>

      {dupWarn && (
        <Card className="border-amber-300 p-4 dark:border-amber-700">
          <p className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-300"><AlertTriangle className="h-4 w-4" />Найдена похожая заявка</p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">«{dupWarn.title}» (#{dupWarn.id}). Повторные обращения повышают значимость проблемы, но, возможно, вы хотели дополнить именно её?</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button onClick={() => { setForce(true); setDupWarn(null) }} className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white">Всё равно отправить</button>
            <button onClick={() => navigate(`/applications/${dupWarn.id}`)} className="rounded-md border border-slate-300 px-3 py-1.5 text-xs dark:border-slate-700">Открыть похожую</button>
            <button onClick={() => setDupWarn(null)} className="rounded-md border border-slate-300 px-3 py-1.5 text-xs dark:border-slate-700">Изменить текст</button>
          </div>
        </Card>
      )}

      <form onSubmit={submit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="problem" className="text-xs font-medium text-slate-600 dark:text-slate-300">Что вас беспокоит? *</label>
          <textarea id="problem" value={form.problem} onChange={(e) => set('problem', e.target.value)} rows={5} aria-required
            className={`mt-1 ${inputCls} ${errCls('problem')}`} placeholder="Опишите проблему: что не так, где именно, кого это касается…" />
          {errors.problem && <p className="mt-1 text-xs text-red-500">{errors.problem}</p>}
        </div>
        <div>
          <label htmlFor="proposal" className="text-xs font-medium text-slate-600 dark:text-slate-300">Что предлагаете сделать?</label>
          <textarea id="proposal" value={form.proposal} onChange={(e) => set('proposal', e.target.value)} rows={3}
            className={`mt-1 ${inputCls} ${errCls('proposal')}`} placeholder="Конкретное предложение…" />
          {errors.proposal && <p className="mt-1 text-xs text-red-500">{errors.proposal}</p>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="city" className="text-xs font-medium text-slate-600 dark:text-slate-300">Муниципалитет *</label>
            <div className="mt-1"><Select ariaLabel="Муниципалитет" value={form.city} onChange={(v) => set('city', v)} options={[{ value: '', label: 'Выберите…' }, ...cities.map((c) => ({ value: c, label: c }))]} /></div>
            {errors.city && <p className="mt-1 text-xs text-red-500">{errors.city}</p>}
          </div>
          <div>
            <label htmlFor="topic" className="text-xs font-medium text-slate-600 dark:text-slate-300">Тема *</label>
            <div className="mt-1"><Select ariaLabel="Тема" value={form.topic} onChange={(v) => { set('topic', v); set('subtopic', '') }} options={[{ value: '', label: 'Выберите…' }, ...topicOpts]} /></div>
            {errors.topic && <p className="mt-1 text-xs text-red-500">{errors.topic}</p>}
          </div>
        </div>
        <div>
          <label htmlFor="subtopic" className="text-xs font-medium text-slate-600 dark:text-slate-300">Подтема *</label>
          <div className="mt-1"><Select ariaLabel="Подтема" value={form.subtopic} onChange={(v) => set('subtopic', v)} options={[{ value: '', label: form.topic ? 'Выберите…' : 'Сначала выберите тему' }, ...subOpts]} /></div>
          {errors.subtopic && <p className="mt-1 text-xs text-red-500">{errors.subtopic}</p>}
        </div>
        <div>
          <label htmlFor="effect" className="text-xs font-medium text-slate-600 dark:text-slate-300">Ожидаемый результат</label>
          <textarea id="effect" value={form.effect} onChange={(e) => set('effect', e.target.value)} rows={2} className={`mt-1 ${inputCls}`} placeholder="Что изменится, если предложение реализуют…" />
        </div>
        <div>
          <label htmlFor="att" className="text-xs font-medium text-slate-600 dark:text-slate-300">Ссылка на вложение (необязательно)</label>
          <input id="att" value={form.attachmentUrl} onChange={(e) => set('attachmentUrl', e.target.value)} className={`mt-1 ${inputCls}`} placeholder="https://…" />
        </div>
        {rateMsg && <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-900/30 dark:text-red-300">{rateMsg}</p>}
        <p className="text-[11px] text-slate-400">Не указывайте персональные данные (свои и чужие): имена, телефоны, e-mail. Они будут обезличены автоматически.</p>
        <button type="submit" disabled={sending} className="w-full rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-600 disabled:opacity-50">
          {sending ? 'Отправка…' : 'Отправить инициативу'}
        </button>
      </form>
    </div>
  )
}