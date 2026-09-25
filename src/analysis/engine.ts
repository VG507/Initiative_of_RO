import type {
  AnalysisResult, Application, ApplicationAnalysis, ApplicationStatus,
  ProblemCluster, QualityLevel, SeedRow, SimilarRef, StrategicAlignment,
} from '../types'
import { matchStrategy } from '../strategy/strategyData'
import { computeIdf, cosine, decodeEntities, makeTitle, sentences, tfidfMap, tokenize, trim90 } from './textUtils'
import { computeEconomicEffect, computeExecutionTracking } from '../services/executionEconomicService'

const PLACE_RE = /(улиц|проспект|бульвар|мкр|микрорайон|район|снт|сквер|площад|набережн|трасс|школ[аыуе]|садик|детск сад|стадион|арен|парковк|парк\b|автовокзал|поселк|хутор|станиц)/i
const ACTION = ['предлаг','прошу','необходим','нужн','созда','постро','установ','провест','организова','разреш','разработ','открыт','модерниз','восстанов','обустро','расшир','внедр','запуст','рассмотр','перевест','ужесточ','принять','вернуть','возродить','увеличить','сделайте','постройте']
const SOCIAL = ['детей','дети','школьник','семь','семей','пожил','жител','молодеж','молодёж','родител','студент','больн','граждан','населени','люд']
const AUDIENCE = ['жител','населени','граждан','многих','люд','тысяч']
const PROB = ['не хватает','нет ','отсутств','плох','плачевн','не работает','не ремонти','проблем','к сожалению','обделен','запущен','опасн','темно','грязн','трудност','не соответств','не могу','долго','никто','жалоб','разрушен','ямы','аварийн','невозможно','страдают','неудобн','переполнен','разбит']
const PROP = ['прошу','предлагаю','предлагает','необходимо','нужно','сделайте','постройте','поставить','поставьте','установить','создать','провести','организовать','разрешить','разработать','открыть','модерниз','восстанов','обустроить','расширить','внедрить','рассмотреть возможность','перевести','ужесточить','принять','вернуть','возродить','увеличить','требуется','хотелось бы','просьба','обращаюсь с просьбой']

const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n))

export function normalizeCity(city: string): string { return city.replace(/^город\s+/i, '').trim() }
export function toIsoDate(raw: unknown): string {
  if (raw == null) return ''
  if (raw instanceof Date && !isNaN(raw.getTime())) {
    return new Date(raw.getTime() - raw.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
  }
  const s = String(raw).trim()
  if (!s || s === '*') return ''
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (iso) return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`
  const dmy = s.match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})/)
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`
  if (/^\d{1,6}(\.\d+)?$/.test(s)) {
    const n = parseFloat(s)
    if (n > 20000 && n < 60000) { // серийная дата Excel
      return new Date(Math.round((n - 25569) * 86400000)).toISOString().slice(0, 10)
    }
  }
  const d = new Date(s)
  return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10)
}

function detectRelevance(text: string): { relevant: boolean; reason?: string } {
  const clean = text.trim()
  if (clean.length < 35) return { relevant: false, reason: 'Слишком короткое сообщение' }
  const t = clean.toLowerCase().replace(/ё/g, 'е')

  // 1. Потребительский эгоизм, бытовые капризы и троллинг
  const trollPatterns = [
    /(купите мне|купи мне|хочу квасу|хочу пива|хочу кушать|хочу денег|скиньтесь мне|дайте мне денег|подарите мне)/i,
    /(квасу|квас).*(квасу|квас).*(квасу|квас)/i,
    /([а-яa-z])\1{4,}/i, // повторение одной буквы 5+ раз подряд (например, кваааас)
    /(ха-ха|лол|кек|прикол|тест123|абракадабра|фыва)/i
  ]
  if (trollPatterns.some((re) => re.test(t))) {
    return { relevant: false, reason: 'Сообщение не содержит общественной инициативы (бытовая просьба или неконструктивный текст)' }
  }

  // 2. Проверка лексики спама и повторов слов
  const words = t.match(/[а-яa-z]{3,}/g) || []
  if (words.length > 4) {
    const wordFreq = new Map<string, number>()
    for (const w of words) wordFreq.set(w, (wordFreq.get(w) || 0) + 1)
    const maxFreq = Math.max(...wordFreq.values())
    if (maxFreq / words.length > 0.45 && words.length >= 6) {
      return { relevant: false, reason: 'Высокая концентрация повторяющихся бессмысленных слов' }
    }
  }

  // 3. Технический мусор (HTML / CSS / код)
  const tech = ['css', 'html', 'javascript', 'класс', 'элемент', 'код', 'браузер', 'тег'].filter((k) => t.includes(k)).length
  const civic = [
    'город', 'улиц', 'район', 'парк', 'транспорт', 'жкх', 'школ', 'област', 'муниципал', 'администрац',
    'благоустройств', 'дорог', 'жител', 'снт', 'деревн', 'посел', 'маршрут', 'больниц', 'поликлиник',
    'детсад', 'эколог', 'мусор', 'водоснабжен', 'освещен', 'тротуар', 'остановк', 'ремонт', 'детск'
  ].filter((k) => t.includes(k)).length
  if (tech >= 2 && civic === 0) return { relevant: false, reason: 'Содержание не связано с региональной проблематикой' }

  // 4. Личные судебные или уголовные жалобы без предложений
  if (/(розыск|военнослужащ|избива|полици|уголовн)/.test(t) && !/(предлагаю|инициатив|стратеги|развит|прошу организовать|необходимо создать)/.test(t))
    return { relevant: false, reason: 'Обращение носит личный (правоохранительный) характер и не является предложением по развитию региона' }

  return { relevant: true }
}

function classifySentences(text: string) {
  const solMatch = text.match(/Предлагаемое решение:\s*([^.\n]+(?:\.[^.\n]+)*?)(?=\s*Ожидаемый|$)/i)
  const probMatch = text.match(/(?:^|Проблема:\s*)([^.\n]+?(?:на улице[^.\n]*|[^.\n]+?))(?=\s*Предлагаемое|$)/i)
  const sents = sentences(text)
  const problem: string[] = [], proposal: string[] = []
  if (probMatch && text.includes('Предлагаемое решение')) {
    problem.push(trim90(probMatch[1].replace(/^Проблема:\s*/i, '').trim()))
  }
  if (solMatch) {
    proposal.push(trim90(solMatch[1].trim()))
  }
  for (const s of sents) {
    const l = s.toLowerCase()
    if (PROP.some((k) => l.includes(k)) && proposal.length < 3) proposal.push(trim90(s))
    else if (PROB.some((k) => l.includes(k)) && problem.length < 3) problem.push(trim90(s))
  }
  return { problem, proposal }
}

function findEffect(text: string, proposal: string[]): string | null {
  const resMatch = text.match(/Ожидаемый (?:результат|эффект):\s*([^.\n]+[.!?]?)/i)
  if (resMatch) return trim90(resMatch[1].trim())
  const marks = ['чтобы', 'позволит', 'улучшит', 'положительно скажется', 'будет способствовать', 'повысится', 'привлекательн', 'обеспечит', 'снизит', 'предотвратит', 'безопасн', 'комфортн', 'поможет', 'сократит', 'развити', 'решит']
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

function computeScores(
  text: string,
  ctx: { clusterSize: number; similarCount: number; isDuplicate: boolean; alignment: StrategicAlignment; isRelevant?: boolean }
) {
  if (ctx.isRelevant === false) {
    return { concreteness: 0, feasibility: 0, impact: 0, strategyScore: 0, info: 0, uniqueness: 0, usefulness: 0 }
  }
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
    const apps: Application[] = rows.map((r) => {
    const city = decodeEntities(r.city)
    return {
      ...r,
      city,
      topic: decodeEntities(r.topic),
      subtopic: decodeEntities(r.subtopic),
      text: decodeEntities(r.text),
      statusInitiative: r.statusInitiative ? decodeEntities(r.statusInitiative) : null,
      cityNorm: normalizeCity(city),
      dateIso: toIsoDate(r.date),
      analysis: undefined as unknown as ApplicationAnalysis,
    }
  })
  const rel = apps.map((a) => detectRelevance(a.text))
  const toks = apps.map((a) => tokenize(`${a.subtopic} ${a.cityNorm} ${a.text}`))
  const idf = computeIdf(toks)
  const tfs = toks.map((t) => tfidfMap(t, idf))

  // Кандидатные пары через инвертированный индекс с адаптивным лимитом частоты
  const maxDf = Math.max(15, Math.floor(apps.length * 0.45))
  const inverted = new Map<string, number[]>()
  toks.forEach((list, i) => {
    for (const t of new Set(list)) {
      const arr = inverted.get(t)
      if (arr) arr.push(i)
      else inverted.set(t, [i])
    }
  })
  const pairKeys = new Set<number>()
  for (const ids of inverted.values()) {
    if (ids.length < 2 || ids.length > maxDf) continue
    for (let x = 0; x < ids.length; x++) {
      for (let y = x + 1; y < ids.length; y++) {
        pairKeys.add(ids[x] * 100000 + ids[y])
      }
    }
  }

  const similar: SimilarRef[][] = apps.map(() => [])
  const duplicateOf: (string | undefined)[] = apps.map(() => undefined)

  // 1. Предварительный проход: выявляем дубликаты (косинус >= 0.85)
  for (const key of pairKeys) {
    const x = Math.floor(key / 100000), y = key % 100000
    const s = cosine(tfs[x], tfs[y])
    if (s >= 0.85 && duplicateOf[y] === undefined) {
      duplicateOf[y] = apps[x].id
    }
  }

  // 2. Формируем граф сходств: в кластеризацию идут ТОЛЬКО уникальные заявки
  const edges: { x: number; y: number; s: number }[] = []
  for (const key of pairKeys) {
    const x = Math.floor(key / 100000), y = key % 100000
    const sameTopic = apps[x].topic === apps[y].topic
    const s = cosine(tfs[x], tfs[y])

    if (s >= 0.42 && (sameTopic || s >= 0.70)) {
      similar[x].push({ id: apps[y].id, score: s })
      similar[y].push({ id: apps[x].id, score: s })
      // Исключаем дубликаты из кластеризации:
      if (!duplicateOf[x] && !duplicateOf[y]) {
        edges.push({ x, y, s })
      }
    }
  }
  similar.forEach((l) => l.sort((a, b) => b.score - a.score))

  // Average-Linkage кластеризация уникальных заявок
  edges.sort((a, b) => b.s - a.s)
  const clustersList: number[][] = []
  const assigned = new Int32Array(apps.length).fill(-1)

  for (const edge of edges) {
    const { x, y } = edge
    const cx = assigned[x]
    const cy = assigned[y]

    if (cx === -1 && cy === -1) {
      const cid = clustersList.length
      clustersList.push([x, y])
      assigned[x] = cid
      assigned[y] = cid
    } else if (cx !== -1 && cy === -1) {
      const members = clustersList[cx]
      const avgSim = members.reduce((sum, m) => sum + cosine(tfs[y], tfs[m]), 0) / members.length
      if (avgSim >= 0.38) {
        members.push(y)
        assigned[y] = cx
      }
    } else if (cx === -1 && cy !== -1) {
      const members = clustersList[cy]
      const avgSim = members.reduce((sum, m) => sum + cosine(tfs[x], tfs[m]), 0) / members.length
      if (avgSim >= 0.38) {
        members.push(x)
        assigned[x] = cy
      }
    } else if (cx !== cy) {
      const mx = clustersList[cx]
      const my = clustersList[cy]
      if (mx.length > 0 && my.length > 0) {
        let totalSim = 0
        for (const ix of mx) {
          for (const iy of my) {
            totalSim += cosine(tfs[ix], tfs[iy])
          }
        }
        const avgInterSim = totalSim / (mx.length * my.length)
        if (avgInterSim >= 0.40) {
          for (const iy of my) {
            assigned[iy] = cx
            mx.push(iy)
          }
          my.length = 0
        }
      }
    }
  }

  // Оставшиеся нераспределенные УНИКАЛЬНЫЕ заявки формируют самостоятельные кластеры
  apps.forEach((_, i) => {
    if (!duplicateOf[i] && assigned[i] === -1) {
      const cid = clustersList.length
      clustersList.push([i])
      assigned[i] = cid
    }
  })

  apps.forEach((a, i) => {
    const clusterMembers = assigned[i] !== -1 ? (clustersList[assigned[i]] || [i]) : [i]
    const size = clusterMembers.length
    const strategy = rel[i].relevant ? matchStrategy(a.text, a.topic, a.subtopic) : { matches: [], alignment: 'none' as StrategicAlignment, score: 0 }
    const sc = computeScores(a.text, {
      clusterSize: size,
      similarCount: similar[i].length,
      isDuplicate: !!duplicateOf[i],
      alignment: strategy.alignment,
      isRelevant: rel[i].relevant
    })
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
    const execution = computeExecutionTracking({
      id: a.id,
      topic: a.topic,
      dateIso: a.dateIso,
      statusInitiative: a.statusInitiative,
      analysis: {
        usefulnessScore: sc.usefulness,
        alignment: strategy.alignment,
        quality,
        isDuplicate: !!duplicateOf[i],
        relevance: rel[i].relevant ? 'relevant' : 'irrelevant',
      }
    })

    const economic = computeEconomicEffect({
      id: a.id,
      topic: a.topic,
      analysis: {
        usefulnessScore: sc.usefulness,
        socialImpactScore: sc.impact,
        alignment: strategy.alignment,
        relevance: rel[i].relevant ? 'relevant' : 'irrelevant',
      }
    })

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
      execution, economic,
    }
  })

  const clusters: ProblemCluster[] = []
  const validClusters = clustersList.filter((m) => m.length > 0)
  validClusters.forEach((membersIdx, ci) => {
    const members = membersIdx.map((i) => apps[i])
    const titles = members.map((m) => m.analysis.normalizedTitle)
    const title = titles.reduce((s1, s2) => (s1.length <= s2.length ? s1 : s2))
    const alignment = members.reduce<StrategicAlignment>((best, m) => (ALIGN_RANK[m.analysis.alignment] > ALIGN_RANK[best] ? m.analysis.alignment : best), 'none')
    const agg = new Map<string, { m: typeof members[0]['analysis']['strategyMatches'][0]; n: number }>()
    for (const m of members) for (const sm of m.analysis.strategyMatches) {
      const k = `${sm.direction}|${sm.section}|${sm.initiative ?? ''}`
      const e = agg.get(k); if (e) e.n++; else agg.set(k, { m: sm, n: 1 })
    }
    const strategyMatches = [...agg.values()].sort((a, b) => b.n - a.n).slice(0, 3).map((e) => e.m)
    const municipalities = [...new Set(members.map((m) => m.cityNorm))]
    const scope: 'regional' | 'local' = municipalities.length >= 3 ? 'regional' : 'local'
    const clusterId = `CL-${String(ci + 1).padStart(3, '0')}`

    // Считаем число дубликатов, поданных к заявкам этого кластера
    const memberIds = new Set(members.map((m) => m.id))
    const duplicatesCount = apps.filter((a) => a.analysis.duplicateOf && memberIds.has(a.analysis.duplicateOf)).length

    clusters.push({
      id: clusterId,
      title: trim80(title),
      subtopic: mode(members.map((m) => m.subtopic)),
      direction: mode(members.map((m) => m.topic)),
      applicationIds: members.map((m) => m.id),
      municipalities,
      frequency: members.length,
      averageUsefulness: Math.round(members.reduce((s, m) => s + m.analysis.usefulnessScore, 0) / members.length),
      impactScore: 0,
      scope,
      duplicatesCount,
      alignment,
      strategyMatches,
    })
    members.forEach((m) => { m.analysis.clusterId = clusterId })
  })

  // Привязываем дубликаты к кластеру их оригинальной заявки
  apps.forEach((a) => {
    if (a.analysis.isDuplicate && a.analysis.duplicateOf) {
      const orig = apps.find((x) => x.id === a.analysis.duplicateOf)
      if (orig?.analysis?.clusterId) {
        a.analysis.clusterId = orig.analysis.clusterId
      }
    }
  })

  const raw = clusters.map((c) => c.frequency * c.averageUsefulness * ALIGN_W[c.alignment] * (c.scope === 'regional' ? 1.2 : 1.0))
  const max = Math.max(...raw, 1)
  clusters.forEach((c, i) => { c.impactScore = Math.round((raw[i] / max) * 100) })

  return { applications: apps, clusters }
}

function trim80(s: string): string { return s.length > 80 ? s.slice(0, 77).replace(/\s+\S*$/, '') + '…' : s }

export function findMostSimilar(text: string, subtopic: string, apps: Application[]): SimilarRef | null {
  const allToks = apps.map((a) => tokenize(`${a.subtopic} ${a.cityNorm} ${a.text}`))
  const queryToks = tokenize(`${subtopic} ${text}`)
  const idf = computeIdf([...allToks, queryToks])
  const queryTfIdf = tfidfMap(queryToks, idf)
  let best: SimilarRef | null = null
  for (let i = 0; i < apps.length; i++) {
    const a = apps[i]
    const s = cosine(queryTfIdf, tfidfMap(allToks[i], idf))
    if (!best || s > best.score) best = { id: a.id, score: s }
  }
  return best && best.score >= 0.5 ? best : null
}