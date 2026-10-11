import type { NewWord, Word } from '../types/word'

/** 產生簡易唯一 ID（純前端足夠，Firestore 會由後端另行規範） */
export function makeId(): string {
  const rand = Math.random().toString(36).slice(2, 10)
  return `${Date.now().toString(36)}-${rand}`
}

/** 建立一個新的 Word 物件（補上 id 與時間戳） */
export function createWord(input: NewWord, now: Date = new Date()): Word {
  const iso = now.toISOString()
  return {
    id: makeId(),
    term: input.term.trim(),
    definition: input.definition.trim(),
    partOfSpeech: input.partOfSpeech?.trim() || undefined,
    example: input.example?.trim() || undefined,
    exampleTranslation: input.exampleTranslation?.trim() || undefined,
    chapter: input.chapter?.trim() || undefined,
    page: input.page?.trim() || undefined,
    tags: input.tags?.map((t) => t.trim()).filter(Boolean),
    familiarity: input.familiarity ?? 0,
    status: input.status ?? 'new',
    nextReviewAt: input.nextReviewAt,
    aiSuggestedFields: input.aiSuggestedFields,
    createdAt: iso,
    updatedAt: iso,
  }
}

/** Firestore rejects undefined values, while Word's optional fields are intentionally absent until set. */
const OPTIONAL_WORD_FIELDS = [
  'partOfSpeech',
  'example',
  'exampleTranslation',
  'chapter',
  'page',
  'familiarity',
  'status',
  'nextReviewAt',
  'aiSuggestedFields',
  'tags',
] as const satisfies readonly (keyof Word)[]

export type FirestoreWordData = Pick<Word, 'id' | 'term' | 'definition' | 'createdAt' | 'updatedAt'> &
  Partial<Omit<Word, 'id' | 'term' | 'definition' | 'createdAt' | 'updatedAt'>>

export function serializeWordForFirestore(word: Word): FirestoreWordData {
  const data: Record<string, unknown> = {
    id: word.id,
    term: word.term,
    definition: word.definition,
    createdAt: word.createdAt,
    updatedAt: word.updatedAt,
  }

  for (const field of OPTIONAL_WORD_FIELDS) {
    const value = word[field]
    if (value !== undefined) data[field] = value
  }

  return data as unknown as FirestoreWordData
}

/** 基本輸入驗證：回傳錯誤訊息陣列（空陣列 = 通過） */
export function validateWordInput(input: NewWord): string[] {
  const errors: string[] = []
  if (!input.term || input.term.trim().length === 0) errors.push('英文單字不可為空')
  if (!input.definition || input.definition.trim().length === 0) errors.push('中文詞義不可為空')
  if (input.term && input.term.length > 120) errors.push('英文單字過長')
  return errors
}

/** 依 term 做簡單不區分大小寫搜尋 */
export function searchWords(words: Word[], query: string): Word[] {
  const q = query.trim().toLowerCase()
  if (!q) return words
  return words.filter(
    (w) =>
      w.term.toLowerCase().includes(q) || w.definition.toLowerCase().includes(q),
  )
}

