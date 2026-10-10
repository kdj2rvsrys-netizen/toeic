import { describe, expect, it } from 'vitest'
import { createWord, searchWords, validateWordInput } from './words'
import type { Word } from '../types/word'

describe('validateWordInput', () => {
  it('空欄位回報錯誤', () => {
    const errors = validateWordInput({ term: '  ', definition: '' })
    expect(errors.length).toBeGreaterThanOrEqual(2)
  })

  it('合法輸入通過', () => {
    expect(
      validateWordInput({ term: 'negotiate', definition: '協商' }),
    ).toEqual([])
  })
})

describe('createWord', () => {
  it('補上 id 與時間戳並修剪空白', () => {
    const fixed = new Date('2024-06-01T12:00:00.000Z')
    const w = createWord(
      { term: '  invoice  ', definition: '  發票  ', tags: [' 商業 ', ''] },
      fixed,
    )
    expect(w.term).toBe('invoice')
    expect(w.definition).toBe('發票')
    expect(w.tags).toEqual(['商業'])
    expect(w.id.length).toBeGreaterThan(0)
    expect(w.createdAt).toBe('2024-06-01T12:00:00.000Z')
    expect(w.createdAt).toBe(w.updatedAt)
  })
})

describe('searchWords', () => {
  const words: Word[] = [
    createWord({ term: 'invoice', definition: '發票' }),
    createWord({ term: 'contract', definition: '合約文件' }),
  ]

  it('空查詢回傳全部', () => {
    expect(searchWords(words, '   ')).toHaveLength(2)
  })

  it('可同時比對英文與中文（不分大小寫）', () => {
    expect(searchWords(words, 'INVO').map((w) => w.term)).toEqual(['invoice'])
    expect(searchWords(words, '合約').map((w) => w.term)).toEqual(['contract'])
  })
})
