import { Application, EconomicEffect, ExecutionStatus, ExecutionTracking } from '../types'
import { EXECUTION_LABELS } from '../types'

// Ведомства Ростовской области по отраслям
const RESPONSIBLE_BODIES: Record<string, string> = {
  'Комфортная среда': 'Министерство ЖКХ Ростовской области',
  'Люди и здоровье': 'Министерство здравоохранения РО',
  'Экологическое благополучие': 'Минприроды Ростовской области',
  'Экономика': 'Минэкономразвития Ростовской области',
  'Потенциал человека': 'Минобразования Ростовской области',
  'Технологическое лидерство': 'Минцифры Ростовской области',
  'Цифровая трансформация': 'Минцифры Ростовской области',
  'Транспорт и дороги': 'Министерство транспорта РО',
}

// Псевдослучайный детерминированный генератор по хэшу строки (чтобы данные были стабильны)
function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

export function computeExecutionTracking(app: {
  id: string
  topic: string
  dateIso?: string
  statusInitiative?: string | null
  analysis: {
    usefulnessScore: number
    alignment: string
    quality: string
    isDuplicate: boolean
    relevance: string
  }
}): ExecutionTracking {
  const { id, topic, statusInitiative, analysis } = app
  const h = hashString(id)

  const body = RESPONSIBLE_BODIES[topic] || 'Администрация муниципального образования'

  // Если заявка нерелевантна или дубликат — отклонена
  if (analysis.relevance === 'irrelevant' || analysis.isDuplicate) {
    const isTrollOrSpam = analysis.relevance === 'irrelevant'
    return {
      status: 'rejected',
      statusLabel: EXECUTION_LABELS.rejected,
      isAiEstimated: true,
      recommendedStatus: isTrollOrSpam ? 'Рекомендация ИИ: Отклонить (спам / нерелевантно)' : 'Рекомендация ИИ: Отклонить (дубликат)',
      responsibleBody: 'Модерация обращений РО',
      targetDate: null,
      completionDate: null,
      progressPercent: 0,
      milestones: [
        { title: 'Регистрация обращения', date: '2026-07-01', completed: true },
        { title: 'Экспертная фильтрация', date: '2026-07-02', completed: true },
        { title: isTrollOrSpam ? 'Отклонено: обращение не содержит общественной инициативы' : 'Отклонено: объединено с ранее поданным аналогом', date: '2026-07-02', completed: true }
      ],
      verificationNote: isTrollOrSpam
        ? 'Отклонено на этапе модерации: бытовая просьба, спам или не относится к развитию Ростовской области'
        : 'Обращение объединено с ранее поданным аналогом'
    }
  }

  // Если инициатива «Уже есть» в исходных данных или высокий статус
  if (statusInitiative === 'Уже есть') {
    return {
      status: 'completed',
      statusLabel: EXECUTION_LABELS.completed,
      isAiEstimated: false,
      recommendedStatus: 'Уже реализовано в регионе',
      responsibleBody: body,
      targetDate: '2026-06-01',
      completionDate: '2026-05-20',
      progressPercent: 100,
      milestones: [
        { title: 'Рассмотрение ведомством', date: '2026-03-10', completed: true },
        { title: 'Включение в план мероприятий', date: '2026-04-15', completed: true },
        { title: 'Строительно-монтажные работы', date: '2026-05-10', completed: true },
        { title: 'Ввод в эксплуатацию / исполнено', date: '2026-05-20', completed: true }
      ],
      verificationNote: 'Аналогичный проект завершен в рамках региональной госпрограммы'
    }
  }

  // Определение реалистичного статуса исполнения по полезности и соответствию
  let status: ExecutionStatus = 'under_review'
  let progressPercent = 15
  let targetDate = '2026-12-15'
  let completionDate: string | null = null
  let note = 'Находится на согласовании в профильном подразделении'

  if (analysis.usefulnessScore >= 75 && (analysis.alignment === 'direct' || analysis.alignment === 'high')) {
    // Высокополезные стратегические заявки продвинуты дальше
    const variants: ExecutionStatus[] = ['in_progress', 'in_budget', 'approved']
    status = variants[h % variants.length]
    if (status === 'in_progress') {
      progressPercent = 50 + (h % 40)
      note = 'Ведутся проектно-сметные или подрядные работы'
    } else if (status === 'in_budget') {
      progressPercent = 40
      note = 'Средства предусмотрены в рамках регионального бюджета'
    } else {
      progressPercent = 25
      note = 'Одобрено рабочей группой по реализации Стратегии РО'
    }
  } else if (analysis.usefulnessScore >= 50) {
    status = (h % 2 === 0) ? 'approved' : 'under_review'
    progressPercent = status === 'approved' ? 25 : 15
  } else {
    status = (h % 4 === 0) ? 'rejected' : 'under_review'
    progressPercent = status === 'rejected' ? 0 : 10
  }

  const milestones = [
    { title: 'Регистрация и первичный анализ', date: '2026-07-02', completed: true },
    { title: 'Заключение профильного министерства', date: '2026-08-10', completed: progressPercent >= 25 },
    { title: 'Определение источника финансирования', date: '2026-09-15', completed: progressPercent >= 40 },
    { title: 'Исполнение и приёмка работ', date: targetDate, completed: progressPercent === 100 }
  ]

  return {
    status,
    statusLabel: EXECUTION_LABELS[status],
    isAiEstimated: true,
    recommendedStatus: `Рекомендация ИИ: ${EXECUTION_LABELS[status]}`,
    responsibleBody: body,
    targetDate,
    completionDate,
    progressPercent,
    milestones,
    verificationNote: note
  }
}

export function computeEconomicEffect(app: {
  id: string
  topic: string
  analysis: { usefulnessScore: number; socialImpactScore: number; alignment: string; relevance?: string }
}): EconomicEffect {
  const { id, topic, analysis } = app

  // Для нерелевантных заявок (спам, бытовые просьбы, троллинг) бюджет и эффект не рассчитываются
  if (analysis.relevance === 'irrelevant' || analysis.usefulnessScore === 0) {
    return {
      estimatedCost: 0,
      costRangeLabel: '0 ₽ (отклонено)',
      costCategory: 'micro',
      annualSavings: 0,
      beneficiariesCount: 0,
      socialRoiScore: 0,
      paybackPeriodYears: null,
      isAiEstimated: false,
    }
  }

  const h = hashString(id + topic)

  // Оценочный бюджет по тематике и оценке полезности
  let baseCost = 1500000 // 1.5 млн руб базовая
  if (topic.includes('среда') || topic.includes('Транспорт')) {
    baseCost = 4500000 + (h % 8000000)
  } else if (topic.includes('здоровье') || topic.includes('Потенциал')) {
    baseCost = 2500000 + (h % 5000000)
  } else if (topic.includes('Цифровая') || topic.includes('Технологическое')) {
    baseCost = 1800000 + (h % 3000000)
  } else {
    baseCost = 800000 + (h % 2000000)
  }

  const estimatedCost = Math.round(baseCost / 10000) * 10000

  let costCategory: EconomicEffect['costCategory'] = 'small'
  if (estimatedCost < 1000000) costCategory = 'micro'
  else if (estimatedCost <= 5000000) costCategory = 'small'
  else if (estimatedCost <= 20000000) costCategory = 'medium'
  else costCategory = 'large'

  // Прямая экономия бюджета (для ЖКХ, транспорта, экологии и цифровизации)
  let annualSavings = 0
  if (['Комфортная среда', 'Цифровая трансформация', 'Экологическое благополучие', 'Экономика'].includes(topic)) {
    annualSavings = Math.round((estimatedCost * (0.12 + (h % 15) / 100)) / 10000) * 10000
  }

  // Благополучатели (число жителей)
  let beneficiariesCount = 500 + (h % 2500)
  if (analysis.socialImpactScore >= 15) {
    beneficiariesCount = 5000 + (h % 45000)
  } else if (analysis.socialImpactScore >= 10) {
    beneficiariesCount = 1500 + (h % 8000)
  }

  // S-ROI score (социальный эффект на рубль)
  const socialRoiScore = Number(((beneficiariesCount * (analysis.usefulnessScore / 100) * 1000) / estimatedCost).toFixed(2))

  // Срок окупаемости
  const paybackPeriodYears = annualSavings > 0 ? Number((estimatedCost / annualSavings).toFixed(1)) : null

  // Формируем сметную вилку ±25%
  const minCost = Math.round((estimatedCost * 0.75) / 100000) * 0.1
  const maxCost = Math.round((estimatedCost * 1.25) / 100000) * 0.1
  const costRangeLabel = `${minCost.toFixed(1)} – ${maxCost.toFixed(1)} млн ₽`

  return {
    estimatedCost,
    costRangeLabel,
    costCategory,
    annualSavings,
    beneficiariesCount,
    socialRoiScore,
    paybackPeriodYears,
    isAiEstimated: true,
  }
}
