/**
 * 核心領域型別（與任何框架/服務無關的純資料結構）
 * 這些型別是單字管理與測驗功能的契約，抽換資料來源時不變。
 */

/** 單字卡片 */
export interface Word {
  id: string
  /** 英文單字/片語 */
  term: string
  /** 中文詞義 */
  definition: string
  /** 詞性（選填），例：n. / v. / adj. */
  partOfSpeech?: string
  /** 例句（選填） */
  example?: string
  exampleTranslation?: string
  chapter?: string
  page?: string
  familiarity?: number
  status?: 'new' | 'learning' | 'mastered'
  nextReviewAt?: string
  aiSuggestedFields?: string[]
  /** 標籤（選填），例：['商業','會議'] */
  tags?: string[]
  /** 建立時間 (ISO 8601) */
  createdAt: string
  /** 更新時間 (ISO 8601) */
  updatedAt: string
}

/** 新增單字時由呼叫端提供的欄位（id / 時間戳由系統產生） */
export type NewWord = Pick<Word, 'term' | 'definition'> &
  Partial<Pick<Word, 'partOfSpeech' | 'example' | 'exampleTranslation' | 'chapter' | 'page' | 'tags' | 'familiarity' | 'status' | 'nextReviewAt' | 'aiSuggestedFields'>>

/** 一次學習紀錄（測驗結果） */
export interface StudyRecord {
  id: string
  /** 本次測驗時間 (ISO 8601) */
  studiedAt: string
  /** 答對題數 */
  correct: number
  /** 總題數 */
  total: number
}

/** 測驗中的一個題目 */
export interface QuizItem {
  word: Word
  /** 四個選項（含正解），順序已隨機化 */
  choices: string[]
  /** 正解在 choices 中的索引 */
  answerIndex: number
}
