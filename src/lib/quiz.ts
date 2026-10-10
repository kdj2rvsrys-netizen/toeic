import type { QuizItem, Word } from '../types/word'

/** Fisher–Yates 洗牌（回傳新陣列，不改原陣列） */
export function shuffle<T>(items: readonly T[]): T[] {
  const arr = items.slice()
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/**
 * 由單字庫產生一份「看英文選中文」測驗題。
 * - 至少需要 4 個單字才能組成 4 個選項；不足時回傳空陣列。
 * - distractor 從其他單字的詞義中隨機抽取。
 * 純函數、可離線、可測試。
 */
export function buildQuiz(words: Word[], count: number): QuizItem[] {
  if (words.length < 4 || count <= 0) return []
  const pool = shuffle(words)
  // Keep one unambiguous, distinct meaning per option. If the available
  // vocabulary cannot supply three distinct distractors, omit that question.
  const eligible = pool.filter((target) => new Set(
    pool.filter((w) => w.id !== target.id).map((w) => w.definition.trim().toLowerCase()),
  ).size >= 3)
  const picked = eligible.slice(0, Math.min(count, eligible.length))

  return picked.map((target) => {
    const distractors = [...new Map(pool
      .filter((w) => w.id !== target.id && w.definition.trim().toLowerCase() !== target.definition.trim().toLowerCase())
      .map((w) => [w.definition.trim().toLowerCase(), w.definition])).values()].slice(0, 3)
    const choicesRaw = shuffle([target.definition, ...distractors])
    return {
      word: target,
      choices: choicesRaw,
      answerIndex: choicesRaw.indexOf(target.definition),
    }
  })
}

/** 判斷作答是否正確 */
export function isCorrect(item: QuizItem, chosenIndex: number): boolean {
  return chosenIndex === item.answerIndex
}

/** 計算正確率（0~1），total 為 0 時回傳 0 */
export function scoreRate(correct: number, total: number): number {
  if (total <= 0) return 0
  return correct / total
}
