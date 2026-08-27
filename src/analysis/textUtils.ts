const STOPWORDS = new Set(('и,в,во,на,с,со,по,для,не,ни,что,это,как,а,но,или,же,бы,из,у,к,ко,о,об,при,за,от,до,вы,мы,я,он,она,они,оно,то,так,та,те,уже,еще,очень,если,когда,где,там,тут,вот,был,была,было,быть,есть,да,их,его,ее,наш,наши,ваш,все,весь,всех,всего,кто,чем,чтобы,потому,поэтому,только,тоже,также,может,можно,нужно,надо,пожалуйста,спасибо,добрый,день,здравствуйте,обращаюсь,вам,вас,нам,нас,свой,свои,которые,который,этом,эта,этот,просто,прямо,вообще,конечно,своей,нашей,еще,свое,него,ней,ним,без,более,менее,них,моя,мою,моих,туда,оттуда,потом,сейчас').split(','))

const SUFFIXES = ['иями','ями','ами','ах','ях','ом','ем','ам','им','ешь','ете','ут','ют','ат','ят','ов','ев','ей','ой','ый','ий','ая','яя','ое','ее','ые','ие','ых','их','ую','юю','у','ю','а','я','ы','и','е','ь']

export function stem(w: string): string {
  for (const s of SUFFIXES) if (w.length - s.length >= 4 && w.endsWith(s)) return w.slice(0, w.length - s.length)
  return w
}

export function normalizeText(s: string): string {
  return s.toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

export function tokenize(text: string): string[] {
  return normalizeText(text).split(' ').filter((w) => w.length >= 3 && !STOPWORDS.has(w)).map(stem)
}

export function queryTokens(q: string): string[] {
  return normalizeText(q).split(' ').filter((w) => w.length >= 2 && !STOPWORDS.has(w)).map(stem)
}

export function tfMap(tokens: string[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const t of tokens) m.set(t, (m.get(t) || 0) + 1)
  return m
}

export function cosine(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0, na = 0, nb = 0
  for (const v of a.values()) na += v * v
  for (const v of b.values()) nb += v * v
  for (const [k, v] of a) { const w = b.get(k); if (w) dot += v * w }
  return na && nb ? dot / Math.sqrt(na * nb) : 0
}

export function trim90(s: string): string {
  const t = s.replace(/\s+/g, ' ').trim()
  return t.length > 90 ? t.slice(0, 87).replace(/\s+\S*$/, '') + '…' : t
}

export function makeTitle(text: string, subtopic: string): string {
  let t = text.trim().replace(/^(добрый (день|вечер|утро)|здравствуйте|уважаемые[^!,.]*)[!,.\s]*/i, '')
  const m = t.match(/^[^.!?]{10,140}[.!?]/)
  let title = (m ? m[0] : t.split(/[.!?]/)[0] || t).replace(/\s+/g, ' ').trim()
  if (title.length > 90) title = title.slice(0, 87).replace(/\s+\S*$/, '') + '…'
  if (title.length < 8) title = subtopic
  return title
}

export function sentences(text: string): string[] {
  return (text.replace(/\s+/g, ' ').match(/[^.!?]+[.!?]*/g) || []).map((s) => s.trim()).filter((s) => s.length > 2)
}