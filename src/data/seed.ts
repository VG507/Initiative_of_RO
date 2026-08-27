import type { SeedRow } from '../types'
import jsonRows from './applications.json'

// Все заявки листа LEADS. Файл applications.json генерируется из Excel:
// node scripts/convert-excel.mjs "Стратегия61 - Заявки.xlsx"  (см. README)
const rows: SeedRow[] = jsonRows as SeedRow[]

export default rows