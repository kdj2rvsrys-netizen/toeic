import { describe, expect, it } from 'vitest'
import { buildQuiz, isCorrect, scoreRate, shuffle } from './quiz'
import type { Word } from '../types/word'

function makeWord(id: string, term: string, definition: string): Word {
  return {
    id,
    term,
    definition,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  }
}

const words: Word[] = [
  makeWord('1', 'negotiate', '協商'),
  makeWord('2', 'invoice', '發票'),
  makeWord('3', 'deadline', '截止期限'),
  makeWord('4', 'contract', '合約'),
  makeWord('5', 'refund', '退款'),
]

describe('shuffle', () => {
  it('不改變原陣列且長度一致', () => {
    const orig = [1, 2, 3, 4, 5]
    const out = shuffle(orig)
    expect(orig).toEqual([1, 2, 3, 4, 5])
    expect(out.slice().sort()).toEqual(orig.slice().sort())
  })
})

describe('buildQuiz', () => {
  it('單字不足 4 個時回傳空陣列', () => {
    expect(buildQuiz(words.slice(0, 3), 2)).toEqual([])
  })

  it('count <= 0 時回傳空陣列', () => {
    expect(buildQuiz(words, 0)).toEqual([])
  })

  it('產生指定數量、每題 4 個選項且含正解', () => {
    const quiz = buildQuiz(words, 3)
    expect(quiz).toHaveLength(3)
    for (const item of quiz) {
      expect(item.choices).toHaveLength(4)
      expect(new Set(item.choices).size).toBe(4) // 選項不重複
      expect(item.choices[item.answerIndex]).toBe(item.word.definition)
    }
  })

  it('題數不超過可用單字數', () => {
    const quiz = buildQuiz(words, 99)
    expect(quiz.length).toBeLessThanOrEqual(words.length)
  })

  it('中文解釋重複時不產生重複選項', () => {
    const duplicates = [
      makeWord('a', 'offer', '提供'),
      makeWord('b', 'provide', '提供'),
      makeWord('c', 'schedule', '安排'),
      makeWord('d', 'confirm', '確認'),
      makeWord('e', 'delay', '延遲'),
    ]
    const quiz = buildQuiz(duplicates, 5)
    expect(quiz.length).toBeGreaterThan(0)
    for (const item of quiz) expect(new Set(item.choices).size).toBe(4)
  })
})

describe('isCorrect / scoreRate', () => {
  it('正確判斷正解索引', () => {
    const [item] = buildQuiz(words, 1)
    expect(isCorrect(item, item.answerIndex)).toBe(true)
    const wrong = (item.answerIndex + 1) % 4
    expect(isCorrect(item, wrong)).toBe(false)
  })

  it('scoreRate 正確計算，total=0 回傳 0', () => {
    expect(scoreRate(3, 4)).toBe(0.75)
    expect(scoreRate(0, 0)).toBe(0)
  })
})
