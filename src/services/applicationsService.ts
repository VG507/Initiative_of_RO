import seedRows from '../data/seed'
import { analyzeDataset, findMostSimilar } from '../analysis/engine'
import type { AnalysisResult, Application, NewApplicationInput, SeedRow } from '../types'

const LS_APPS = 'don-initiatives:user-applications'
const LS_SUBMIT = 'don-initiatives:submissions'

export interface ApplicationsRepository {
  getApplications(): Promise<AnalysisResult>
  getApplication(id: string): Promise<Application | undefined>
  createApplication(application: NewApplicationInput): Promise<Application>
  findDuplicate(text: string, subtopic: string): Promise<{ id: string; score: number; title: string } | null>
}

// Абстракция под будущий backend: достаточно реализовать этот интерфейс
// (Supabase / Firebase / REST) — UI менять не придётся.
function loadUser(): SeedRow[] {
  try { return JSON.parse(localStorage.getItem(LS_APPS) || '[]') } catch { return [] }
}
function saveUser(rows: SeedRow[]) { localStorage.setItem(LS_APPS, JSON.stringify(rows)) }

export function checkRateLimit(): { ok: boolean; message?: string } {
  try {
    const ts: number[] = JSON.parse(localStorage.getItem(LS_SUBMIT) || '[]')
    if (ts.filter((t) => t > Date.now() - 3600_000).length >= 5)
      return { ok: false, message: 'Превышен лимит отправки (5 заявок в час). Попробуйте позже.' }
  } catch { /* noop */ }
  return { ok: true }
}
function trackSubmission() {
  try {
    const ts: number[] = JSON.parse(localStorage.getItem(LS_SUBMIT) || '[]')
    ts.push(Date.now())
    localStorage.setItem(LS_SUBMIT, JSON.stringify(ts.slice(-50)))
  } catch { /* noop */ }
}

function nextId(rows: SeedRow[]): string {
  let max = 0
  for (const r of rows) { const m = r.id.match(/RO-(\d+)/); if (m) max = Math.max(max, parseInt(m[1], 10)) }
  return `RO-${String(max + 1).padStart(4, '0')}`
}

export function anonymize(text: string): string {
  return text
    .replace(/меня зовут [А-ЯЁA-Z][а-яёa-z]+/gi, '')
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/gi, '[контакт]')
    .replace(/(\+7|8)[\s(-]?\d{3}[\s)-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}/g, '[контакт]')
    .replace(/\s{2,}/g, ' ').trim()
}

class LocalRepository implements ApplicationsRepository {
  async getApplications(): Promise<AnalysisResult> {
    await new Promise((r) => setTimeout(r, 200))
    return analyzeDataset([...seedRows, ...loadUser()])
  }
  async getApplication(id: string) { return (await this.getApplications()).applications.find((a) => a.id === id) }
  async createApplication(input: NewApplicationInput): Promise<Application> {
    const limit = checkRateLimit()
    if (!limit.ok) throw new Error(limit.message)
    if (!input.text || input.text.trim().length < 30) throw new Error('Опишите проблему подробнее (минимум 30 символов)')
    if (!input.city) throw new Error('Укажите муниципалитет')
    if (!input.topic || !input.subtopic) throw new Error('Укажите тему и подтему')
    const users = loadUser()
    const now = new Date()
    const row: SeedRow = {
      id: nextId([...seedRows, ...users]),
      city: input.city, topic: input.topic, subtopic: input.subtopic,
      text: anonymize(input.text),
      statusInitiative: null, statusSubtask: null,
      date: `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`,
      time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
      comment: null, attachmentUrl: input.attachmentUrl || null,
    }
    users.push(row)
    saveUser(users)
    trackSubmission()
    const app = (await this.getApplications()).applications.find((a) => a.id === row.id)
    if (!app) throw new Error('Не удалось сохранить заявку')
    return app
  }
  async findDuplicate(text: string, subtopic: string) {
    const { applications } = await this.getApplications()
    const best = findMostSimilar(text, subtopic, applications)
    if (best && best.score >= 0.8) {
      const a = applications.find((x) => x.id === best.id)!
      return { id: a.id, score: best.score, title: a.analysis.normalizedTitle }
    }
    return null
  }
}

export const applicationsRepository: ApplicationsRepository = new LocalRepository()

// Точка подключения LLM в будущем: реализуйте AnalysisEngine с вызовом API
export interface AnalysisEngine { analyze(text: string, topic: string, subtopic: string): unknown }
export const ruleBasedAnalysisEngine: AnalysisEngine = { analyze: () => null }
export function getUserApplicationCount(): number {
  try { return (JSON.parse(localStorage.getItem(LS_APPS) || '[]') as SeedRow[]).length } catch { return 0 }
}