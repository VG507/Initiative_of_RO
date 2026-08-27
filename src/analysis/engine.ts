import type {
  AnalysisResult, Application, ApplicationAnalysis, ApplicationStatus,
  ProblemCluster, QualityLevel, SeedRow, SimilarRef, StrategicAlignment,
} from '../types'
import { matchStrategy } from '../strategy/strategyData'
import { cosine, makeTitle, sentences, tfMap, tokenize, trim90 } from './textUtils'

const PLACE_RE = /(улиц|проспект|бульвар|мкр|микрорайон|район|снт|сквер|площад|набережн|трасс|школ[аыуе]|садик|детск сад|стадион|арен|парковк|парк\b|автовокзал|поселк|хутор|станиц)/i
const ACTION = ['предлаг','прошу','необходим','нужн','созда','постро','установ','провест','организова','разреш','разработ','открыт','модерниз','восстанов','обустро','расшир','внедр','запуст','рассмотр','перевест','ужесточ','принять','вернуть','возродить','увеличить','сделайте','постройте']
const SOCIAL = ['детей','дети','школьник','семь','семей','пожил','жител','молодеж','молодёж','родител','студент','больн','граждан','населени','люд']
const AUDIENCE = ['жител','населени','граждан','многих','люд','тысяч']
const PROB = ['не хватает','нет ','отсутств','плох','плачевн','не работает','не ремонти','проблем','к сожалению','обделен','запущен','опасн','темно','грязн','трудност','не соответств','не могу','долго','никто','жалоб']
const PROP = ['прошу','предлагаю','предлагает','необходимо','нужно','сделайте','постройте','поставить','поставьте','установить','создать','провести','организовать','разрешить','разработать','открыть','модерниз','восстанов','обустроить','расширить','внедрить','рассмотреть возможность','перевести','ужесточить','принять','вернуть','возродить','увеличить']

const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n))

export function normalizeCity(city: string): string { return city.replace(/^город\s+/i, '').trim() }
export function toIsoDate(dmy: string): string {
  const m = dmy.match(/(\d{2})\.(\d{2})\.(\d{4})/)
  return m ? `${m[3]}-${m[2]}-${m[1]}` : dmy
}

function detectRelevance(text: string): { relevant: boolean; reason?: string } {
  if (text.trim().length < 30) return { relevant: false, reason: 'Слишком короткое сообщение' }
  const t = text.toLowerCase().replace(/ё/g, 'е')
  const tech = ['css', 'html', 'javascript', 'класс', 'элемент', 'код', 'браузер', 'тег'].filter((k) => t.includes(k)).length
  const civic = ['город', 'улиц', 'район', 'парк', 'транспорт', 'жкх', 'школ', 'област', 'муниципал', 'администрац', 'благоустройств', 'дорог', 'жител', 'снт'].filter((k) => t.includes(k)).length
  if (tech >= 2 && civic === 0) return { relevant: false, reason: 'Содержание не связано с региональной проблематикой' }
  if (/(розыск|военнослужащ|избива|полици|уголовн)/.test(t) && !/(предлагаю|инициатив|стратеги|развит)/.test(t))
    return { relevant: false, reason: 'Обращение носит личный (правоохранительный) характер и не является предложением по развитию региона' }
  return { relevant: true }
}

function classifySentences(text: string) {
  const sents = sentences(text)
  const problem: string[] = [], proposal: string[] = []
  for (const s of sents) {
    const l = s.toLowerCase()
    if (PROP.some((k) => l.includes(k)) && proposal.length < 3) proposal.push(trim90(s))
    else if (PROB.some((k) => l.includes(k)) && problem.length < 3) problem.push(trim90(s))
  }
  return { problem, proposal }
}

function findEffect(text: string, proposal: string[]): string | null {
  const marks = ['чтобы', 'позволит', 'улучшит', 'положительно скажется', 'будет способствовать', 'повысится', 'привлекательн']
  for (const s of sentences(text)) {
    if (proposal.some((p) => p.startsWith(s.slice(0, 40)))) continue
    if (marks.some((m) => s.toLowerCase().includes(m))) return trim90(s)
  }
  return null
}

function extractSubProblems(text: string): string[] {
  const re = /(?:^|[\n.!?;:])\s*(\d[\).]\s+[^\n]{5,120})/g
  const found: string[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) found.push(m[1])
  if (found.length >= 2 && found[0].trim().startsWith('1')) return found.map((f) => trim90(f.replace(/^\d[\).]\s*/, '')))
  return []
}

function computeScores(text: string, ctx: { clusterSize: number; similarCount: number; isDuplicate: boolean; alignment: StrategicAlignment }) {
  const L = text.length, low = text.toLowerCase()
  const hasPlace = PLACE_RE.test(text)
  const hasDigits = /\d/.test(text)
  const hasAction = ACTION.some((k) => low.includes(k))
  const hasSocial = SOCIAL.some((k) => low.includes(k))
  const hasAudience = AUDIENCE.some((k) => low.includes(k))
  const hasMany = /\d+\s*(тыс|тысяч|млн|миллион)/i.test(text)
  const absolutist = /(запретить|во всей россии|немедленно|всех обязат)/i.test(text)
  const concreteness = clamp(6 + (hasPlace ? 4 : 0) + (hasDigits ? 4 : 0) + (L >= 150 && L <= 6000 ? 3 : L >= 80 ? 1 : 0) + (hasAction ? 3 : 0), 0, 20)
  const feasibility = clamp(8 + (hasAction ? 6 : 0) + (hasPlace ? 2 : 0) + (absolutist ? -8 : 4), 0, 20)
  const impact = clamp(6 + (hasSocial ? 4 : 0) + (hasAudience ? 4 : 0) + (hasMany ? 2 : 0) + Math.min(6, Math.max(0, ctx.clusterSize - 1)), 0, 20)
  const strategyScore = ctx.alignment === 'direct' ? 20 : ctx.alignment === 'high' ? 16 : ctx.alignment === 'medium' ? 10 : ctx.alignment === 'weak' ? 4 : 0
  const info = clamp(L >= 2500 ? 10 : L >= 800 ? 9 : L >= 300 ? 7 : L >= 100 ? 5 : 2, 0, 10)
  const uniqueness = ctx.isDuplicate ? 1 : ctx.similarCount > 0 ? clamp(8 - ctx.similarCount, 2, 10) : 10
  return { concreteness, feasibility, impact, strategyScore, info, uniqueness, usefulness: concreteness + feasibility + impact + strategyScore + info + uniqueness }
}

function qualityOf(score: number, relevant: boolean): QualityLevel {
  if (!relevant) return 'irrelevant'
  if (score >= 90) return 'high'
  if (score >= 70) return 'useful'
  if (score >= 50) return 'analysis'
  if (score >= 25) return 'low'
  return 'irrelevant'
}

const ALIGN_W: Record<StrategicAlignment, number> = { direct: 1.5, high: 1.3, medium: 1.1, weak: 1, none: 0.8 }
const ALIGN_RANK: Record<StrategicAlignment, number> = { direct: 4, high: 3, medium: 2, weak: 1, none: 0 }

function mode(items: string[]): string {
  const m = new Map<string, number>()
  for (const i of items) m.set(i, (m.get(i) || 0) + 1)
  return [...m.entries()].sort((a, b) => b[1] - a[1])[0][0]
}

export function analyzeDataset(rows: SeedRow[]): AnalysisResult {
  const apps: Application[] = rows.map((r) => ({
    ...r, cityNorm: normalizeCity(r.city), dateIso: toIsoDate(r.date),
    analysis: undefined as unknown as ApplicationAnalysis,
  }))
  const rel = apps.map((a) => detectRelevance(a.text))
  const toks = apps.map((a) => tokenize(`${a.subtopic} ${a.cityNorm} ${a.text}`))
  const tfs = toks.map(tfMap)

  // Кандидатные пары через инвертированный индекс (масштабируемо до 10 000+ заявок)
  const inverted = new Map<string, number[]>()
  toks.forEach((list, i) => { for (const t of new Set(list)) { const arr = inverted.get(t); if (arr) arr.push(i); else inverted.set(t, [i]) } })
  const pairKeys = new Set<number>()
  for (const ids of inverted.values()) {
    if (ids.length < 2 || ids.length > 15) continue
    for (let x = 0; x < ids.length; x++) for (let y = x + 1; y < ids.length; y++) pairKeys.add(ids[x] * 100000 + ids[y])
  }
  const similar: SimilarRef[][] = apps.map(() => [])
  const duplicateOf: (string | undefined)[] = apps.map(() => undefined)
  const parent = apps.map((_, i) => i)
  const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x])))
  for (const key of pairKeys) {
    const x = Math.floor(key / 100000), y = key % 100000
    const s = cosine(tfs[x], tfs[y])
    if (s < 0.42) continue
    similar[x].push({ id: apps[y].id, score: s })
    similar[y].push({ id: apps[x].id, score: s })
    const rx = find(x), ry = find(y)
    if (rx !== ry) parent[Math.max(rx, ry)] = Math.min(rx, ry)
    if (s >= 0.85) duplicateOf[y] = apps[x].id
  }
  similar.forEach((l) => l.sort((a, b) => b.score - a.score))

  const clusterMembers = new Map<number, number[]>()
  apps.forEach((_, i) => { const r = find(i); const arr = clusterMembers.get(r); if (arr) arr.push(i); else clusterMembers.set(r, [i]) })

  apps.forEach((a, i) => {
    const size = clusterMembers.get(find(i))!.length
    const strategy = rel[i].relevant ? matchStrategy(a.text, a.topic, a.subtopic) : { matches: [], alignment: 'none' as StrategicAlignment, score: 0 }
    const sc = computeScores(a.text, { clusterSize: size, similarCount: similar[i].length, isDuplicate: !!duplicateOf[i], alignment: strategy.alignment })
    const { problem, proposal } = classifySentences(a.text)
    const existingInitiative = (a.statusInitiative || '').trim().toLowerCase() === 'уже есть'
    const nonStrategic = (a.statusInitiative || '').trim().toLowerCase() === 'нестратегическая'
    const quality = qualityOf(sc.usefulness, rel[i].relevant)
    let status: ApplicationStatus
    if (!rel[i].relevant) status = 'irrelevant'
    else if (nonStrategic) status = 'nonstrategic'
    else if (duplicateOf[i]) status = 'duplicate'
    else if (existingInitiative) status = 'existing'
    else if (strategy.alignment === 'direct' || strategy.alignment === 'high') status = 'potential_strategic'
    else if (quality === 'useful' || quality === 'high') status = 'quality'
    else status = 'new'
    a.analysis = {
      usefulnessScore: sc.usefulness, concretenessScore: sc.concreteness, feasibilityScore: sc.feasibility,
      socialImpactScore: sc.impact, strategicAlignmentScore: sc.strategyScore, informationValueScore: sc.info, uniquenessScore: sc.uniqueness,
      quality, relevance: rel[i].relevant ? 'relevant' : 'irrelevant', relevanceReason: rel[i].reason,
      isDuplicate: !!duplicateOf[i], duplicateOf: duplicateOf[i], similarApplications: similar[i].slice(0, 12),
      strategyMatches: strategy.matches, alignment: strategy.alignment,
      normalizedTitle: makeTitle(a.text, a.subtopic),
      normalizedProblem: problem[0] ?? null, normalizedProposal: proposal[0] ?? null,
      expectedEffect: findEffect(a.text, proposal), subProblems: extractSubProblems(a.text),
      status, existingInitiative, nonStrategic,
    }
  })

  const clusters: ProblemCluster[] = []
  const roots = [...clusterMembers.keys()].sort((a, b) => a - b)
  roots.forEach((root, ci) => {
    const members = clusterMembers.get(root)!.map((i) => apps[i])
    const titles = members.map((m) => m.analysis.normalizedTitle)
    const title = titles.reduce((s1, s2) => (s1.length <= s2.length ? s1 : s2))
    const alignment = members.reduce<StrategicAlignment>((best, m) => (ALIGN_RANK[m.analysis.alignment] > ALIGN_RANK[best] ? m.analysis.alignment : best), 'none')
    const agg = new Map<string, { m: typeof members[0]['analysis']['strategyMatches'][0]; n: number }>()
    for (const m of members) for (const sm of m.analysis.strategyMatches) {
      const k = `${sm.direction}|${sm.section}|${sm.initiative ?? ''}`
      const e = agg.get(k); if (e) e.n++; else agg.set(k, { m: sm, n: 1 })
    }
    const strategyMatches = [...agg.values()].sort((a, b) => b.n - a.n).slice(0, 3).map((e) => e.m)
    clusters.push({
      id: `CL-${String(ci + 1).padStart(3, '0')}`, title: trim80(title),
      subtopic: mode(members.map((m) => m.subtopic)), direction: mode(members.map((m) => m.topic)),
      applicationIds: members.map((m) => m.id), municipalities: [...new Set(members.map((m) => m.cityNorm))],
      frequency: members.length,
      averageUsefulness: Math.round(members.reduce((s, m) => s + m.analysis.usefulnessScore, 0) / members.length),
      impactScore: 0, alignment, strategyMatches,
    })
    members.forEach((m) => { m.analysis.clusterId = clusters[clusters.length - 1].id })
  })
  const raw = clusters.map((c) => c.frequency * c.averageUsefulness * ALIGN_W[c.alignment])
  const max = Math.max(...raw, 1)
  clusters.forEach((c, i) => { c.impactScore = Math.round((raw[i] / max) * 100) })

  return { applications: apps, clusters }
}

function trim80(s: string): string { return s.length > 80 ? s.slice(0, 77).replace(/\s+\S*$/, '') + '…' : s }

export function findMostSimilar(text: string, subtopic: string, apps: Application[]): SimilarRef | null {
  const tf = tfMap(tokenize(`${subtopic} ${text}`))
  let best: SimilarRef | null = null
  for (const a of apps) {
    const s = cosine(tf, tfMap(tokenize(`${a.subtopic} ${a.cityNorm} ${a.text}`)))
    if (!best || s > best.score) best = { id: a.id, score: s }
  }
  return best && best.score >= 0.5 ? best : null
}