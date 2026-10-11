import {beforeEach,describe,expect,it} from 'vitest'
import {createChapter,importBackup,importWords,listChapters,listRecords,listWords,listWrong,renameChapter,setStorageScope} from './store'
const memory=new Map<string,string>()
Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(k:string)=>memory.get(k)??null,setItem:(k:string,v:string)=>memory.set(k,v),removeItem:(k:string)=>memory.delete(k)}})
describe('本機備份與帳號隔離',()=>{
 beforeEach(()=>{memory.clear();setStorageScope(null)})
 it('合併備份時保留既有同名單字的熟悉度與學習紀錄',()=>{
  const first=importBackup({schemaVersion:1,words:[{id:'invoice-id',term:'invoice',definition:'發票',familiarity:4,status:'learning'}],records:[{id:'r1',studiedAt:'2026-01-01T00:00:00.000Z',correct:3,total:4}],wrongIds:['invoice-id']})
  expect(first.added).toBe(1);expect(listWords()[0].familiarity).toBe(4)
  const second=importBackup({schemaVersion:1,words:[{id:'new-id',term:'INVOICE',definition:'不要覆蓋'}],records:[{id:'r1',studiedAt:'2026-01-01T00:00:00.000Z',correct:0,total:1},{id:'r2',studiedAt:'2026-01-02T00:00:00.000Z',correct:1,total:1}],wrongIds:['invoice-id']})
  expect(second.added).toBe(0);expect('recordsAdded' in second&&second.recordsAdded).toBe(1);expect(listWords()[0].definition).toBe('發票');expect(listWords()[0].familiarity).toBe(4);expect(listRecords()).toHaveLength(2);expect(listWrong()).toEqual(['invoice-id'])
 })
 it('不同登入 UID 使用不同的本機資料命名空間',()=>{
  importBackup([{term:'agenda',definition:'議程'}]);const localCount=listWords().length;setStorageScope('user-a');expect(listWords()).toEqual([]);importBackup([{term:'invoice',definition:'發票'}]);setStorageScope(null);expect(listWords()).toHaveLength(localCount);setStorageScope('user-a');expect(listWords().map(w=>w.term)).toEqual(['invoice']);setStorageScope('user-b');expect(listWords()).toEqual([])
 })
 it('匯入可指定目的章節，並在改名後保留單字與錯題關聯',()=>{
  createChapter('Business English');const result=importWords([{term:'agenda',definition:'議程',chapter:'舊章節'}],'Business English')
  const word=listWords()[0];expect(result.added).toBe(1);expect(word.chapter).toBe('Business English')
  const record={id:'quiz-1',studiedAt:'2026-02-01T00:00:00.000Z',correct:1,total:1};importBackup({words:[],records:[record],wrongIds:[word.id]})
  renameChapter('Business English','商務英文');expect(listWords()[0].chapter).toBe('商務英文');expect(listChapters()).toContain('商務英文');expect(listRecords()).toEqual([record]);expect(listWrong()).toEqual([word.id])
 })
 it('接受舊版完整備份並保留原章節分類',()=>{
  const result=importBackup({schemaVersion:1,words:[{id:'old-word',term:'invoice',definition:'發票',chapter:'Unit 1'}],records:[],wrongIds:[]})
  expect(result.added).toBe(1);expect(listWords()[0].chapter).toBe('Unit 1');expect(listChapters()).toContain('Unit 1')
 })
})

