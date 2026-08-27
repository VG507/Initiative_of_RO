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