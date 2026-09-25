import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import fontsData from '../fonts/ptsans.json'
import { Application, ProblemCluster } from '../types'
import { byDirection, byMunicipality, qualityDist, alignmentDist, topProblems } from '../utils/analytics'
import { ALIGN_LABELS } from '../types'

export interface ReportOptions {
  title?: string
  scopeDescription?: string
  includeDetailedList?: boolean
  maxDetailedItems?: number
}

// Форматирование даты для человекочитаемого отображения
function formatDateTime(date: Date): { display: string; fileStamp: string } {
  const pad = (n: number) => n.toString().padStart(2, '0')
  const YYYY = date.getFullYear()
  const MM = pad(date.getMonth() + 1)
  const DD = pad(date.getDate())
  const hh = pad(date.getHours())
  const mm = pad(date.getMinutes())
  const ss = pad(date.getSeconds())

  return {
    display: `${DD}.${MM}.${YYYY} ${hh}:${mm}`,
    fileStamp: `${YYYY}-${MM}-${DD}_${hh}-${mm}-${ss}`
  }
}

// Инициализация jsPDF с русским шрифтом PT Sans
function createPdfDoc(): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4'
  })

  // Регистрация кириллического шрифта
  doc.addFileToVFS('PTSans-Regular.ttf', fontsData.regular)
  doc.addFont('PTSans-Regular.ttf', 'PTSans', 'normal')

  doc.addFileToVFS('PTSans-Bold.ttf', fontsData.bold)
  doc.addFont('PTSans-Bold.ttf', 'PTSans', 'bold')

  doc.setFont('PTSans', 'normal')
  return doc
}

// Вспомогательная функция для добавления колонтитулов на всех страницах
function addHeadersAndFooters(doc: jsPDF, exportTimeDisplay: string) {
  const totalPages = doc.getNumberOfPages()

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFont('PTSans', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(140, 150, 165)

    // Верхний колонтитул
    doc.text('Аналитический центр банка «Центр-инвест» | Мониторинг гражданских инициатив РО', 40, 25)
    doc.setDrawColor(226, 232, 240)
    doc.line(40, 30, 555, 30)

    // Нижний колонтитул
    doc.line(40, 805, 555, 805)
    doc.text(`Выгружено: ${exportTimeDisplay}`, 40, 820)
    doc.text(`Страница ${i} из ${totalPages}`, 555, 820, { align: 'right' })
  }
}

export function generateAnalyticsPdfReport(
  applications: Application[],
  clusters: ProblemCluster[],
  options: ReportOptions = {}
) {
  const now = new Date()
  const { display: exportTimeDisplay, fileStamp } = formatDateTime(now)

  const doc = createPdfDoc()
  let y = 50

  // 1. Заголовок документа
  doc.setFont('PTSans', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(15, 76, 129) // #0F4C81 фирменный темно-синий
  doc.text('Аналитический отчет по гражданским инициативам', 40, y)
  y += 20

  doc.setFont('PTSans', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(71, 85, 105)
  doc.text('Ростовская область · Стратегия социально-экономического развития', 40, y)
  y += 18

  // Плашка метаданных выгрузки
  doc.setFillColor(241, 245, 249)
  doc.roundedRect(40, y, 515, 26, 4, 4, 'F')
  doc.setFontSize(9)
  doc.setTextColor(51, 65, 85)
  doc.text(`Дата и время среза: `, 48, y + 17)
  doc.setFont('PTSans', 'bold')
  doc.text(exportTimeDisplay, 138, y + 17)
  doc.setFont('PTSans', 'normal')
  doc.text(`Объем выборки: `, 250, y + 17)
  doc.setFont('PTSans', 'bold')
  doc.text(`${applications.length} заявок`, 325, y + 17)
  doc.setFont('PTSans', 'normal')
  doc.text(`Выявлено проблем: `, 410, y + 17)
  doc.setFont('PTSans', 'bold')
  doc.text(`${clusters.length}`, 505, y + 17)
  y += 38

  // 2. Сводные ключевые показатели (KPI Cards)
  doc.setFont('PTSans', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(15, 23, 42)
  doc.text('1. Ключевые показатели массива данных', 40, y)
  y += 12

  const dupCount = applications.filter((a) => a.analysis.isDuplicate).length
  const avgScore = Math.round(
    applications.reduce((s, a) => s + a.analysis.usefulnessScore, 0) / (applications.length || 1)
  )
  const directAlignCount = applications.filter((a) => a.analysis.alignment === 'direct').length
  const highQualityCount = applications.filter((a) => a.analysis.quality === 'high').length
  const clustersFreq3 = clusters.filter((c) => c.frequency >= 3).length

  const kpis = [
    { label: 'Всего инициатив', value: `${applications.length}` },
    { label: 'Уникальных проблем', value: `${clusters.length}` },
    { label: 'Острых тем (3+ заявки)', value: `${clustersFreq3}` },
    { label: 'Средняя полезность', value: `${avgScore} / 100` },
    { label: 'Прямое совпадение', value: `${directAlignCount} (${Math.round((directAlignCount / (applications.length || 1)) * 100)}%)` },
    { label: 'Высокое качество', value: `${highQualityCount}` },
    { label: 'Выявлено дубликатов', value: `${dupCount}` },
    { label: 'Нерелевантных', value: `${applications.filter((a) => a.analysis.relevance === 'irrelevant').length}` }
  ]

  // Сетка KPI 4x2
  const cardW = 124
  const cardH = 40
  const gap = 6
  kpis.forEach((kpi, idx) => {
    const col = idx % 4
    const row = Math.floor(idx / 4)
    const cx = 40 + col * (cardW + gap)
    const cy = y + row * (cardH + gap)

    doc.setFillColor(248, 250, 252)
    doc.setDrawColor(226, 232, 240)
    doc.roundedRect(cx, cy, cardW, cardH, 3, 3, 'FD')

    doc.setFont('PTSans', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(100, 116, 139)
    doc.text(kpi.label, cx + 6, cy + 13)

    doc.setFont('PTSans', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(15, 76, 129)
    doc.text(kpi.value, cx + 6, cy + 30)
  })

  y += cardH * 2 + gap + 18

  // 3. Структура по направлениям Стратегии и Качеству (Таблицы бок о бок)
  const dirs = byDirection(applications)
  const qd = qualityDist(applications)
  const ad = alignmentDist(applications)

  doc.setFont('PTSans', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(15, 23, 42)
  doc.text('2. Тематическая структура и соответствие Стратегии', 40, y)
  y += 6

  // Таблица распределения по направлениям
  const totalApps = applications.length || 1
  const dirRows = dirs.slice(0, 7).map((d) => [d.name, `${d.value}`, `${Math.round((d.value / totalApps) * 100)}%`])
  autoTable(doc, {
    startY: y,
    margin: { left: 40, right: 305 },
    styles: { font: 'PTSans', fontSize: 8, cellPadding: 3.5 },
    headStyles: { fillColor: [15, 76, 129], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    head: [['Направление Стратегии РО', 'Кол-во', 'Доля']],
    body: dirRows
  })

  // Таблица стратегического соответствия
  const alignRows = ad.map((a) => [ALIGN_LABELS[a.key] || a.label, `${a.value}`, `${Math.round((a.value / totalApps) * 100)}%`])
  autoTable(doc, {
    startY: y,
    margin: { left: 305, right: 40 },
    styles: { font: 'PTSans', fontSize: 8, cellPadding: 3.5 },
    headStyles: { fillColor: [14, 159, 110], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    head: [['Уровень соответствия', 'Заявок', 'Доля']],
    body: alignRows
  })

  // Выравнивание курсора по высоте двух параллельных таблиц
  const lastTableDoc = doc as any
  const table1Bottom = lastTableDoc.lastAutoTable?.finalY ?? 380

  // 4. География инициатив переносится на 2-ю страницу, чтобы не наезжать на заголовок и избежать скомканности
  doc.addPage()
  let p2Y = 50

  const muns = byMunicipality(applications).slice(0, 10)
  doc.setFont('PTSans', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(15, 23, 42)
  doc.text('3. Географическая активность (Топ-10 муниципалитетов)', 40, p2Y)
  p2Y += 12

  const munRows = muns.map((m) => [
    m.name,
    `${m.value}`,
    `${m.perCapitaActivity}`,
    `${m.share}%`,
    `${m.uniqueProblems}`
  ])
  autoTable(doc, {
    startY: p2Y,
    margin: { left: 40, right: 40 },
    styles: { font: 'PTSans', fontSize: 8.5, cellPadding: 4 },
    headStyles: { fillColor: [71, 85, 105], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 160 },
      1: { cellWidth: 70, halign: 'center' },
      2: { cellWidth: 100, halign: 'center' },
      3: { cellWidth: 80, halign: 'center' },
      4: { cellWidth: 65, halign: 'center' }
    },
    head: [['Муниципальное образование', 'Всего обращений', 'На 10 тыс. жителей', 'Доля в РО', 'Уник. проблем']],
    body: munRows
  })

  // 5. Ключевые кластеры проблем (на 2-й странице сразу под географией)
  const p2Doc = doc as any
  let clustY = (p2Doc.lastAutoTable?.finalY ?? p2Y) + 24

  doc.setFont('PTSans', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(15, 23, 42)
  doc.text('4. Реестр приоритетных кластеров проблем (Top Issues)', 40, clustY)
  clustY += 12

  const topClust = topProblems(clusters, 12)
  const clusterRows = topClust.map((c, i) => [
    `${i + 1}`,
    c.title,
    c.direction,
    `${c.frequency}`,
    `${c.impactScore}`,
    c.scope === 'regional' ? 'Региональный' : 'Локальный',
    c.municipalities.slice(0, 3).join(', ') + (c.municipalities.length > 3 ? '…' : '')
  ])

  autoTable(doc, {
    startY: clustY,
    margin: { left: 40, right: 40 },
    styles: { font: 'PTSans', fontSize: 8, cellPadding: 3.5 },
    headStyles: { fillColor: [15, 76, 129], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 160 },
      2: { cellWidth: 100 },
      3: { cellWidth: 40, halign: 'center' },
      4: { cellWidth: 45, halign: 'center' },
      5: { cellWidth: 60 },
      6: { cellWidth: 90 }
    },
    head: [['№', 'Суть проблемы / кластер', 'Направление', 'Заявок', 'Влияние', 'Масштаб', 'География']],
    body: clusterRows
  })

  // 6. Инициативы с максимальной стратегической полезностью (Кандидаты) — на 3-ю страницу
  doc.addPage()
  let candY = 50

  doc.setFont('PTSans', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(15, 23, 42)
  doc.text('5. Топ-10 перспективных гражданских инициатив', 40, candY)
  candY += 12

  const topCandidates = [...applications]
    .sort((a, b) => b.analysis.usefulnessScore - a.analysis.usefulnessScore)
    .slice(0, 10)

  const candidateRows = topCandidates.map((a) => [
    `#${a.id}`,
    a.cityNorm,
    a.topic,
    a.analysis.normalizedTitle.length > 55
      ? a.analysis.normalizedTitle.slice(0, 53) + '…'
      : a.analysis.normalizedTitle,
    `${(a.analysis.economic?.estimatedCost / 1000000).toFixed(1)} млн ₽`,
    a.analysis.execution?.statusLabel || 'На рассмотрении'
  ])

  autoTable(doc, {
    startY: candY,
    margin: { left: 40, right: 40 },
    styles: { font: 'PTSans', fontSize: 8, cellPadding: 3.5 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 35, halign: 'center' },
      1: { cellWidth: 75 },
      2: { cellWidth: 80 },
      3: { cellWidth: 195 },
      4: { cellWidth: 65, halign: 'right' },
      5: { cellWidth: 65 }
    },
    head: [['ID', 'Город/Район', 'Тема', 'Формулировка инициативы', 'Бюджет', 'Исполнение']],
    body: candidateRows
  })

  // 7. Если запрошен детальный список всех заявок
  if (options.includeDetailedList) {
    doc.addPage()
    let p3Y = 50
    doc.setFont('PTSans', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(15, 23, 42)
    doc.text('6. Полный реестр инициатив (Приложение)', 40, p3Y)
    p3Y += 6

    const limit = options.maxDetailedItems || 100
    const listApps = applications.slice(0, limit)

    const listRows = listApps.map((a) => [
      `#${a.id}`,
      a.date || '—',
      a.cityNorm,
      a.topic,
      a.text.length > 90 ? a.text.slice(0, 87) + '…' : a.text,
      a.analysis.isDuplicate ? 'Дубликат' : 'Уникальная',
      `${a.analysis.usefulnessScore}`
    ])

    autoTable(doc, {
      startY: p3Y,
      margin: { left: 40, right: 40 },
      styles: { font: 'PTSans', fontSize: 7, cellPadding: 3 },
      headStyles: { fillColor: [15, 76, 129], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 50 },
        2: { cellWidth: 65 },
        3: { cellWidth: 75 },
        4: { cellWidth: 215 },
        5: { cellWidth: 45 },
        6: { cellWidth: 30, halign: 'center' }
      },
      head: [['ID', 'Дата', 'Город', 'Тематика', 'Текст инициативы', 'Статус', 'Балл']],
      body: listRows
    })
  }

  // Расставляем сквозные верхние и нижние колонтитулы с датой и страницами
  addHeadersAndFooters(doc, exportTimeDisplay)

  // Имя файла строго с датой выгрузки в названии
  const fileName = `Otchet_Initsiativy_RO_${fileStamp}.pdf`

  // Скачивание файла
  doc.save(fileName)
  return fileName
}
