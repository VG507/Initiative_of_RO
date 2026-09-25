export type QualityLevel = 'high' | 'useful' | 'analysis' | 'low' | 'irrelevant'
export type StrategicAlignment = 'direct' | 'high' | 'medium' | 'weak' | 'none'
export type ApplicationStatus =
  | 'new' | 'analysis' | 'quality' | 'potential_strategic'
  | 'existing' | 'duplicate' | 'irrelevant' | 'nonstrategic'

export interface StrategyMatch {
  direction: string
  section: string
  level: StrategicAlignment
  matchedKeywords: string[]
  explanation: string
  initiative?: string
}
export interface SimilarRef { id: string; score: number }

export type ExecutionStatus =
  | 'under_review'   // На рассмотрении
  | 'approved'       // Одобрена рабочей группой
  | 'in_budget'      // Включена в проект/бюджет
  | 'in_progress'    // В процессе реализации
  | 'completed'      // Исполнено
  | 'rejected'       // Отклонено / мотивированный отказ

export interface ExecutionMilestone {
  title: string
  date: string
  completed: boolean
}

export interface ExecutionTracking {
  status: ExecutionStatus
  statusLabel: string
  isAiEstimated: boolean          // Флаг прогнозной оценки ИИ (не официальный юридический статус)
  recommendedStatus: string       // Рекомендация модели для профильного ведомства
  responsibleBody: string         // Ответственный орган (напр., Минтранс РО)
  targetDate: string | null        // Плановый срок
  completionDate?: string | null   // Фактический срок
  progressPercent: number         // 0 - 100%
  milestones: ExecutionMilestone[]
  verificationNote?: string        // Примечание / ссылка на закупку или акт
}

export interface EconomicEffect {
  estimatedCost: number           // Оценочный бюджет в рублях (модельная оценка)
  costRangeLabel: string          // Ориентировочная сметная вилка (напр., «5.0 – 8.0 млн ₽»)
  costCategory: 'micro' | 'small' | 'medium' | 'large' // <1млн, 1-5млн, 5-20млн, >20млн
  annualSavings: number           // Прямая экономия бюджета в рублях в год
  beneficiariesCount: number      // Число жителей-благополучателей
  socialRoiScore: number          // Индекс S-ROI (социальная отдача на рубль вложений)
  paybackPeriodYears: number | null // Срок окупаемости (для инвест-проектов с экономией)
  isAiEstimated: boolean          // Маркер экспертного прогноза ИИ
}

export interface ApplicationAnalysis {
  usefulnessScore: number
  concretenessScore: number
  feasibilityScore: number
  socialImpactScore: number
  strategicAlignmentScore: number
  informationValueScore: number
  uniquenessScore: number
  quality: QualityLevel
  relevance: 'relevant' | 'irrelevant'
  relevanceReason?: string
  isDuplicate: boolean
  duplicateOf?: string
  similarApplications: SimilarRef[]
  strategyMatches: StrategyMatch[]
  alignment: StrategicAlignment
  clusterId?: string
  normalizedTitle: string
  normalizedProblem: string | null
  normalizedProposal: string | null
  expectedEffect: string | null
  subProblems: string[]
  status: ApplicationStatus
  existingInitiative: boolean
  nonStrategic: boolean
  execution: ExecutionTracking
  economic: EconomicEffect
}

export interface SeedRow {
  id: string
  city: string
  topic: string
  subtopic: string
  text: string
  date: string
  time?: string | null
  statusInitiative?: string | null
  statusSubtask?: string | null
  comment?: string | null
  attachmentUrl?: string | null
}

export interface Application extends SeedRow {
  cityNorm: string
  dateIso: string
  analysis: ApplicationAnalysis
}

export interface ProblemCluster {
  id: string
  title: string
  subtopic: string
  direction: string
  applicationIds: string[]
  municipalities: string[]
  frequency: number
  averageUsefulness: number
  impactScore: number
  scope: 'regional' | 'local'
  duplicatesCount?: number
  alignment: StrategicAlignment
  strategyMatches: StrategyMatch[]
}

export interface StrategySection { name: string; keywords: string[]; tasks: string[] }
export interface StrategyDirection { id: string; name: string; short: string; sections: StrategySection[] }
export interface StrategyInitiative {
  id: string; name: string; direction: string; section: string
  description: string; keywords: string[]; source: string
}

export interface NewApplicationInput {
  city: string; topic: string; subtopic: string
  text: string; attachmentUrl?: string
}

export interface AnalysisResult { applications: Application[]; clusters: ProblemCluster[] }

export interface Filters {
  search: string
  cities: string[]; topics: string[]; subtopics: string[]
  qualities: QualityLevel[]; alignments: StrategicAlignment[]; statuses: string[]
  duplicate: 'all' | 'unique' | 'similar' | 'duplicates'
  scoreMin: number; scoreMax: number; minSimilar: number
  dateFrom: string | null; dateTo: string | null
  hasAttachment: 'all' | 'yes' | 'no'
  preset: string
}

export const QUALITY_LABELS: Record<QualityLevel, string> = {
  high: 'Высокая ценность', useful: 'Полезная', analysis: 'Требует анализа',
  low: 'Низкая ценность', irrelevant: 'Нерелевантная',
}
export const ALIGN_LABELS: Record<StrategicAlignment, string> = {
  direct: 'Прямое соответствие', high: 'Высокое соответствие', medium: 'Среднее',
  weak: 'Слабое', none: 'Нет соответствия',
}
export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  new: 'Новая', analysis: 'Анализируется', quality: 'Качественная',
  potential_strategic: 'Потенциально стратегическая', existing: 'Уже существует',
  duplicate: 'Дубликат', irrelevant: 'Нерелевантная', nonstrategic: 'Нестратегическая',
}

export const EXECUTION_LABELS: Record<ExecutionStatus, string> = {
  under_review: 'На рассмотрении',
  approved: 'Одобрена рабочей группой',
  in_budget: 'Включена в бюджет/программу',
  in_progress: 'В процессе реализации',
  completed: 'Исполнено',
  rejected: 'Отклонено / Отказ',
}

export const EXECUTION_TONES: Record<ExecutionStatus, string> = {
  under_review: 'slate',
  approved: 'blue',
  in_budget: 'sky',
  in_progress: 'amber',
  completed: 'emerald',
  rejected: 'orange',
}