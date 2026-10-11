import {beforeEach,describe,expect,it,vi} from 'vitest'
import {createChapter,importBackup,importWords,listChapters,listRecords,listWords,listWrong,renameChapter,saveWords,setStorageScope} from './store'
import {createWord,serializeWordForFirestore} from './words'
const cloud=vi.hoisted(()=>({getCloudClient:vi.fn()}))
vi.mock('./firebaseCloud',()=>cloud)
const memory=new Map<string,string>()
Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(k:string)=>memory.get(k)??null,setItem:(k:string,v:string)=>memory.set(k,v),removeItem:(k:string)=>memory.delete(k)}})
describe('本機備份與帳號隔離',()=>{
 beforeEach(()=>{memory.clear();setStorageScope(null);vi.unstubAllEnvs();cloud.getCloudClient.mockReset()})
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
 it('Firestore 單字序列化會省略未設定的 optional 欄位並保留有效複習時間',()=>{
  const word=createWord({term:'invoice',definition:'發票'})
  const data=serializeWordForFirestore(word)
  expect(data).not.toHaveProperty('nextReviewAt')
  expect(data).not.toHaveProperty('partOfSpeech')
  expect(Object.values(data)).not.toContain(undefined)
  const scheduled=serializeWordForFirestore({...word,nextReviewAt:'2026-10-12T00:00:00.000Z'})
  expect(scheduled.nextReviewAt).toBe('2026-10-12T00:00:00.000Z')
 })
 it('匯入批次同步會略過缺少的 optional 欄位且不阻斷整批寫入',async()=>{
  vi.stubEnv('VITE_FIREBASE_API_KEY','test');vi.stubEnv('VITE_FIREBASE_AUTH_DOMAIN','test');vi.stubEnv('VITE_FIREBASE_PROJECT_ID','test');vi.stubEnv('VITE_FIREBASE_STORAGE_BUCKET','test');vi.stubEnv('VITE_FIREBASE_MESSAGING_SENDER_ID','test');vi.stubEnv('VITE_FIREBASE_APP_ID','test')
  const sets:Array<{path:string;data:Record<string,unknown>}>=[]
  const batch={set:(ref:string,data:Record<string,unknown>)=>{sets.push({path:ref,data})},delete:vi.fn(),commit:vi.fn().mockResolvedValue(undefined)}
  cloud.getCloudClient.mockResolvedValue({auth:{currentUser:{uid:'test-user'}},db:{},fs:{writeBatch:()=>batch,doc:(_db:unknown,...parts:string[])=>parts.join('/')}})
  const imported=importWords([{term:'invoice',definition:'發票'},{term:'agenda',definition:'議程'}])
  expect(imported.added).toBe(2)
  await vi.waitFor(()=>expect(batch.commit).toHaveBeenCalledOnce())
  expect(sets).toHaveLength(2)
  expect(sets.every(({data})=>!Object.values(data).includes(undefined))).toBe(true)
  expect(sets.every(({data})=>!('nextReviewAt'in data))).toBe(true)
 })
 it('既有缺少複習時間的本機單字可安全更新並同步，舊資料仍可讀取',async()=>{
  const legacy=createWord({term:'contract',definition:'合約'})
  const malformed={...legacy,nextReviewAt:undefined}
  localStorage.setItem('toeic-words-v1',JSON.stringify([legacy]))
  const sets:Array<Record<string,unknown>>=[]
  const batch={set:(_ref:string,data:Record<string,unknown>)=>sets.push(data),delete:vi.fn(),commit:vi.fn().mockResolvedValue(undefined)}
  vi.stubEnv('VITE_FIREBASE_API_KEY','test');vi.stubEnv('VITE_FIREBASE_AUTH_DOMAIN','test');vi.stubEnv('VITE_FIREBASE_PROJECT_ID','test');vi.stubEnv('VITE_FIREBASE_STORAGE_BUCKET','test');vi.stubEnv('VITE_FIREBASE_MESSAGING_SENDER_ID','test');vi.stubEnv('VITE_FIREBASE_APP_ID','test')
  cloud.getCloudClient.mockResolvedValue({auth:{currentUser:{uid:'test-user'}},db:{},fs:{writeBatch:()=>batch,doc:(_db:unknown,...parts:string[])=>parts.join('/')}})
  expect(listWords()[0].term).toBe('contract')
  saveWords([{...malformed,definition:'契約'}])
  await vi.waitFor(()=>expect(batch.commit).toHaveBeenCalledOnce())
  expect(sets).toHaveLength(1)
  expect(sets[0]).not.toHaveProperty('nextReviewAt')
 })
})

