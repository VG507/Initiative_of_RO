// Конвертация листа LEADS из Excel в src/data/applications.json
// Запуск: node scripts/convert-excel.mjs "Стратегия61 - Заявки.xlsx"
import fs from 'fs'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const XLSX = require('xlsx')

const SRC = process.argv[2] || 'Стратегия61 - Заявки.xlsx'
const OUT = 'src/data/applications.json'

const clean = (v) => {
  if (v == null) return null
  const s = String(v).trim()
  return (s === '' || s === '*') ? null : s
}
const fmtDate = (d) => `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
const fmtTime = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

const KNOWN_TOPICS = [
  'Сохранение населения, укрепление здоровья и повышение благополучия людей, поддержка семьи',
  'Реализация потенциала каждого человека, развитие его талантов, воспитание патриотичной и социально ответственной личности',
  'Комфортная и безопасная среда для жизни',
  'Экологическое благополучие',
  'Устойчивая и динамичная экономика',
  'Технологическое лидерство',
  'Цифровая трансформация государственного и муниципального управления, экономики и социальной сферы',
]

const wb = XLSX.readFile(SRC, { cellDates: true })
const sheetName = wb.SheetNames.find((n) => n.trim().toUpperCase() === 'LEADS') || wb.SheetNames[0]
const raw = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: null })

const out = raw.map((r, i) => {
  let date = r['Дата']; date = date instanceof Date ? fmtDate(date) : clean(date)
  let time = r['Время']; time = time instanceof Date ? fmtTime(time) : clean(time)
  const topic = clean(r['Тема']) || ''
  if (topic && !KNOWN_TOPICS.includes(topic)) console.warn(`⚠ строка ${i + 1}: неизвестная тема «${topic}» — проверьте написание`)
  return {
    id: `RO-${String(i + 1).padStart(4, '0')}`,
    city: clean(r['Город']) || '',
    topic,
    subtopic: clean(r['Подтема']) || '',
    text: clean(r['Текст']) || '',
    date: date || '',
    time,
    statusInitiative: clean(r['Статус_инициативы']),
    statusSubtask: clean(r['Статус_подзадачи']),
    comment: clean(r['Комментарий']),
    attachmentUrl: clean(r['Ссылка на файл']),
  }
}).filter((r) => r.text || r.city)

fs.mkdirSync('src/data', { recursive: true })
fs.writeFileSync(OUT, JSON.stringify(out, null, 2), 'utf8')
console.log(`✓ Записано ${out.length} заявок в ${OUT}`)
if (out.length < 100) console.log(`⚠ Ожидалось ~119. Если меньше — проверьте, тот ли файл и лист.`)