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
const pad = (n) => String(n).padStart(2, '0')
// Excel-даты приходят как Date в локальной зоне из-за cellDates:true — берём компоненты, а не UTC-преобразование
const fmtDate = (d) => `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`
const fmtTime = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`

// Достаём дату из любого формата: Date / серийное число / текст ДД.ММ.ГГГГ
function extractDate(v) {
  if (v == null) return null
  if (v instanceof Date && !isNaN(v.getTime())) return fmtDate(v)
  const s = String(v).trim()
  if (!s || s === '*') return null
  const m = s.match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})/)
  if (m) return `${pad(m[1])}.${pad(m[2])}.${m[3]}`
  if (/^\d{1,6}(\.\d+)?$/.test(s)) {
    const n = parseFloat(s)
    if (n > 20000 && n < 60000) { // серийная дата Excel (дни с 1900-01-01)
      const d = new Date(Math.round((n - 25569) * 86400000))
      return fmtDate(new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
    }
  }
  return null
}
function extractTime(v) {
  if (v == null) return null
  if (v instanceof Date && !isNaN(v.getTime())) return fmtTime(v)
  const s = String(v).trim()
  if (!s || s === '*') return null
  if (/^\d{1,2}:\d{2}/.test(s)) return s.slice(0, 5)
  if (/^\d+(\.\d+)?$/.test(s)) { // дробное время суток (0.5 = 12:00)
    const frac = parseFloat(s) % 1
    const total = Math.round(frac * 24 * 60)
    return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`
  }
  return null
}

const wb = XLSX.readFile(SRC, { cellDates: true })
const sheetName = wb.SheetNames.find((n) => n.trim().toUpperCase() === 'LEADS') || wb.SheetNames[0]
const raw = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: null })

const out = raw.map((r, i) => {
  // ключи ищем нечувствительно к регистру — на случай «Дата»/«ДАТА»
  const get = (name) => {
    const key = Object.keys(r).find((k) => k.trim().toLowerCase() === name.toLowerCase())
    return key ? r[key] : null
  }
  const date = extractDate(get('Дата'))
  const time = extractTime(get('Время'))
  return {
    id: `RO-${String(i + 1).padStart(4, '0')}`,
    city: clean(get('Город')) || '',
    topic: clean(get('Тема')) || '',
    subtopic: clean(get('Подтема')) || '',
    text: clean(get('Текст')) || '',
    date: date || '',
    time,
    statusInitiative: clean(get('Статус_инициативы')),
    statusSubtask: clean(get('Статус_подзадачи')),
    comment: clean(get('Комментарий')),
    attachmentUrl: clean(get('Ссылка на файл')),
  }
}).filter((r) => r.text || r.city)

fs.mkdirSync('src/data', { recursive: true })
fs.writeFileSync(OUT, JSON.stringify(out, null, 2), 'utf8')

const noDate = out.filter((r) => !r.date).length
const dates = [...new Set(out.map((r) => r.date).filter(Boolean))]
console.log(`✓ Записано ${out.length} заявок в ${OUT}`)
console.log(`Дат валидных: ${out.length - noDate}, пустых: ${noDate}`)
console.log(`Уникальные даты: ${dates.length} → ${dates.slice(0, 8).join(', ')}${dates.length > 8 ? ' …' : ''}`)
if (noDate > 0) console.log('⚠ Есть записи без даты — проверьте колонку «Дата» в Excel')
if (dates.length === 0) console.log('❌ Даты не найдены — пришлите вывод: node scripts/convert-excel.mjs <файл> и скрин строки заголовков листа')