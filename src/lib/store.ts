import type { Word, StudyRecord } from '../types/word'
import { createWord, makeId } from './words'
import { isFirebaseConfigured } from './firebase'
import { getCloudClient } from './firebaseCloud'

const WORDS = 'toeic-words-v1'
const RECORDS = 'toeic-records-v1'
const WRONG = 'toeic-wrong-v1'
const CHAPTERS = 'toeic-chapters-v1'
let scope:string|null=null
const scoped=(key:string)=>scope?`${key}:${scope}`:key
export function setStorageScope(uid:string|null){scope=uid}
const read = <T,>(key: string, fallback: T): T => {
  try { const value = localStorage.getItem(scoped(key)); return value ? JSON.parse(value) as T : fallback } catch { return fallback }
}
export const listWords = () => read<Word[]>(WORDS, [])
export const listRecords = () => read<StudyRecord[]>(RECORDS, [])
export const listWrong = () => read<string[]>(WRONG, [])
export const listChapters = () => [...new Set([...read<string[]>(CHAPTERS, []), ...listWords().map(w => w.chapter).filter((x): x is string => !!x)])].sort((a,b)=>a.localeCompare(b))
export function saveChapters(names:string[]){const clean=[...new Set(names.map(x=>x.trim()).filter(Boolean))];localStorage.setItem(scoped(CHAPTERS),JSON.stringify(clean));if(isFirebaseConfigured())void getCloudClient().then(async({auth,db,fs})=>{const uid=auth.currentUser?.uid;if(!uid)return;const batch=fs.writeBatch(db);for(const id of clean)batch.set(fs.doc(db,'users',uid,'chapters',encodeURIComponent(id)),{name:id});await batch.commit()}).catch(cloudError)}
export function createChapter(name:string){const clean=name.trim();if(!clean)throw new Error('請輸入章節名稱');const names=listChapters();if(names.includes(clean))throw new Error('這個章節已存在');saveChapters([...names,clean]);return clean}
export function renameChapter(oldName:string,newName:string){const clean=newName.trim();if(!clean)throw new Error('請輸入章節名稱');if(oldName!==clean&&listChapters().includes(clean))throw new Error('這個章節已存在');saveChapters(listChapters().map(x=>x===oldName?clean:x));saveWords(listWords().map(w=>w.chapter===oldName?{...w,chapter:clean,updatedAt:new Date().toISOString()}:w));if(isFirebaseConfigured())void getCloudClient().then(async({auth,db,fs})=>{const uid=auth.currentUser?.uid;if(!uid)return;await fs.deleteDoc(fs.doc(db,'users',uid,'chapters',encodeURIComponent(oldName)))}).catch(cloudError)}
function cloudError(error:unknown){window.dispatchEvent(new CustomEvent('toeic-cloud-error',{detail:error instanceof Error?error.message:'雲端儲存失敗'}))}
function writeCloud(collectionName:string,id:string,data:unknown|null){if(!isFirebaseConfigured())return;void getCloudClient().then(async({auth,db,fs})=>{if(!auth.currentUser)return;const ref=fs.doc(db,'users',auth.currentUser.uid,collectionName,id);await(data===null?fs.deleteDoc(ref):fs.setDoc(ref,data))}).catch(cloudError)}
export function saveWords(words: Word[]) {
  const previous=read<Word[]>(WORDS,[]),before=new Map(previous.map(w=>[w.id,w])),after=new Map(words.map(w=>[w.id,w]));localStorage.setItem(scoped(WORDS),JSON.stringify(words))
  if(isFirebaseConfigured()){const changes=[...words.filter(w=>JSON.stringify(before.get(w.id))!==JSON.stringify(w)).map(w=>({id:w.id,data:w})),...previous.filter(w=>!after.has(w.id)).map(w=>({id:w.id,data:null}))];if(changes.length)void getCloudClient().then(async({auth,db,fs})=>{const uid=auth.currentUser?.uid;if(!uid)return;for(let i=0;i<changes.length;i+=450){const batch=fs.writeBatch(db);for(const x of changes.slice(i,i+450)){const ref=fs.doc(db,'users',uid,'words',x.id);if(x.data)batch.set(ref,x.data);else batch.delete(ref)}await batch.commit()}}).catch(cloudError)}
}
export function upsertWord(word: Partial<Word> & Pick<Word, 'term'|'definition'>) {
  const all = listWords(); const old = word.id ? all.find(w => w.id === word.id) : undefined
  const saved = old ? { ...old, ...word, updatedAt: new Date().toISOString() } as Word : createWord(word)
  saveWords(old ? all.map(w => w.id === saved.id ? saved : w) : [saved, ...all]); return saved
}
export function removeWord(id: string) { saveWords(listWords().filter(w => w.id !== id));const wrong=listWrong().filter(x=>x!==id);localStorage.setItem(scoped(WRONG),JSON.stringify(wrong));writeCloud('meta','state',{wrongIds:wrong,updatedAt:new Date().toISOString()}) }
export function recordAnswer(_correct: boolean, total: number, wrongIds: string[], correctIds: string[] = []) {
  const records = listRecords(); const record={ id: makeId(), studiedAt: new Date().toISOString(), correct: total - wrongIds.length, total };records.unshift(record); localStorage.setItem(scoped(RECORDS), JSON.stringify(records));writeCloud('records',record.id,record)
  const wrong = new Set(listWrong()); wrongIds.forEach(id => wrong.add(id)); correctIds.forEach(id => wrong.delete(id));const wrongIdsNow=[...wrong];localStorage.setItem(scoped(WRONG), JSON.stringify(wrongIdsNow));writeCloud('meta','state',{wrongIds:wrongIdsNow,updatedAt:new Date().toISOString()})
}
export function setWordFamiliarity(id: string, familiarity: number) { const all = listWords(); saveWords(all.map(w => w.id === id ? { ...w, familiarity, status:familiarity>=5?'mastered':familiarity>0?'learning':'new',updatedAt: new Date().toISOString(), nextReviewAt: new Date(Date.now() + (familiarity < 2 ? 1 : familiarity < 4 ? 3 : 7) * 86400000).toISOString() } : w)) }
export function importWords(input: unknown, destination?:string) {
  if (!Array.isArray(input)) throw new Error('匯入檔格式需為單字陣列')
  const all=listWords(),existing = new Set(all.map(w => w.term.trim().toLowerCase())); let added = 0, skipped = 0;const fresh:Word[]=[]
  for (const row of input) {
    if (!row || typeof row.term !== 'string' || typeof row.definition !== 'string' || !row.term.trim() || !row.definition.trim()) { skipped++; continue }
    if (existing.has(row.term.trim().toLowerCase())) { skipped++; continue }
    const w = createWord(row); const extra = { chapter: destination || (typeof row.chapter === 'string' ? row.chapter : ''), page: typeof row.page === 'string' ? row.page : '', exampleTranslation: typeof row.exampleTranslation === 'string' ? row.exampleTranslation : '', aiSuggestedFields:Array.isArray(row.aiSuggestedFields)?row.aiSuggestedFields.filter((x:unknown):x is string=>typeof x==='string'):[],familiarity: 0, status: 'new' }
    fresh.unshift(Object.assign(w, extra)); existing.add(w.term.toLowerCase()); added++
  }
  if(added)saveWords([...fresh,...all])
  return { added, skipped }
}

export function importBackup(input:unknown, destination?:string){
 if(Array.isArray(input))return importWords(input,destination)
 if(!input||typeof input!=='object'||!Array.isArray((input as {words?:unknown}).words))throw new Error('JSON 備份格式需含 words 陣列')
 const backup=input as {words:unknown[];records?:unknown[];wrongIds?:unknown[];chapters?:unknown[]},existing=listWords(),terms=new Set(existing.map(w=>w.term.toLowerCase())),ids=new Set(existing.map(w=>w.id)),added:Word[]=[]
 for(const raw of backup.words){if(!raw||typeof raw!=='object')continue;const row=raw as Partial<Word>;if(typeof row.term!=='string'||typeof row.definition!=='string'||!row.term.trim()||!row.definition.trim()||terms.has(row.term.trim().toLowerCase()))continue;const word=createWord({...row,term:row.term,definition:row.definition});if(typeof row.id==='string'&&!ids.has(row.id))word.id=row.id;if(typeof row.createdAt==='string')word.createdAt=row.createdAt;if(typeof row.updatedAt==='string')word.updatedAt=row.updatedAt;Object.assign(word,{chapter:destination||row.chapter,page:row.page,exampleTranslation:row.exampleTranslation,familiarity:row.familiarity,status:row.status,nextReviewAt:row.nextReviewAt,aiSuggestedFields:row.aiSuggestedFields});added.push(word);terms.add(word.term.toLowerCase());ids.add(word.id)}
 if(added.length)saveWords([...added,...existing])
 if(Array.isArray(backup.chapters))saveChapters([...listChapters(),...backup.chapters.filter((x):x is string=>typeof x==='string')])
 const records=listRecords(),recordIds=new Set(records.map(r=>r.id)),newRecords=(backup.records||[]).filter((x):x is StudyRecord=>!!x&&typeof x==='object'&&typeof (x as StudyRecord).id==='string'&&!recordIds.has((x as StudyRecord).id)&&typeof (x as StudyRecord).studiedAt==='string'&&Number.isFinite((x as StudyRecord).correct)&&Number.isFinite((x as StudyRecord).total));if(newRecords.length){const merged=[...newRecords,...records];localStorage.setItem(scoped(RECORDS),JSON.stringify(merged));newRecords.forEach(r=>writeCloud('records',r.id,r))}
 const validIds=new Set(listWords().map(w=>w.id)),wrong=new Set(listWrong());(backup.wrongIds||[]).forEach(id=>{if(typeof id==='string'&&validIds.has(id))wrong.add(id)});const wrongNow=[...wrong];localStorage.setItem(scoped(WRONG),JSON.stringify(wrongNow));writeCloud('meta','state',{wrongIds:wrongNow,updatedAt:new Date().toISOString()})
 return{added:added.length,skipped:backup.words.length-added.length,recordsAdded:newRecords.length}
}

export async function hydrateCloud(uid:string,local:{words:Word[];records:StudyRecord[];wrong:string[];chapters?:string[]}){
 if(!isFirebaseConfigured())return
 const {db,fs}=await getCloudClient()
 const [wordSnap,recordSnap,metaSnap,chapterSnap]=await Promise.all([fs.getDocs(fs.collection(db,`users/${uid}/words`)),fs.getDocs(fs.collection(db,`users/${uid}/records`)),fs.getDoc(fs.doc(db,`users/${uid}/meta/state`)),fs.getDocs(fs.collection(db,`users/${uid}/chapters`))])
 const words=wordSnap.docs.map(d=>d.data() as Word),records=recordSnap.docs.map(d=>d.data() as StudyRecord),wordTerms=new Set(words.map(w=>w.term.trim().toLowerCase())),wordIds=new Set(words.map(w=>w.id)),recordIds=new Set(records.map(r=>r.id)),pending:{path:string;data:Word|StudyRecord|{wrongIds:string[];updatedAt:string}}[]=[],idRemap=new Map<string,string>()
 for(const word of local.words){if(wordTerms.has(word.term.trim().toLowerCase()))continue;let candidate=word;if(wordIds.has(candidate.id)){const id=makeId();idRemap.set(candidate.id,id);candidate={...word,id}}words.push(candidate);wordTerms.add(candidate.term.trim().toLowerCase());wordIds.add(candidate.id);pending.push({path:`users/${uid}/words/${candidate.id}`,data:candidate})}
 for(const record of local.records){if(recordIds.has(record.id))continue;records.push(record);recordIds.add(record.id);pending.push({path:`users/${uid}/records/${record.id}`,data:record})}
 const remoteWrong=metaSnap.exists()&&Array.isArray(metaSnap.data().wrongIds)?metaSnap.data().wrongIds as string[]:[],wrong=[...new Set([...remoteWrong,...local.wrong.map(id=>idRemap.get(id)||id)])].filter(id=>wordIds.has(id));if(local.wrong.length&&(!metaSnap.exists()||JSON.stringify([...remoteWrong].sort())!==JSON.stringify(wrong.slice().sort())))pending.push({path:`users/${uid}/meta/state`,data:{wrongIds:wrong,updatedAt:new Date().toISOString()}})
 for(let i=0;i<pending.length;i+=450){const batch=fs.writeBatch(db);pending.slice(i,i+450).forEach(x=>batch.set(fs.doc(db,x.path),x.data));await batch.commit()}
 localStorage.setItem(scoped(WORDS),JSON.stringify(words));localStorage.setItem(scoped(RECORDS),JSON.stringify(records.sort((a,b)=>b.studiedAt.localeCompare(a.studiedAt))));localStorage.setItem(scoped(WRONG),JSON.stringify(wrong))
 const chapterNames=[...new Set([...chapterSnap.docs.map(d=>d.data().name).filter((x):x is string=>typeof x==='string'),...(local.chapters||[])])];localStorage.setItem(scoped(CHAPTERS),JSON.stringify(chapterNames));for(const name of local.chapters||[])if(!chapterSnap.docs.some(d=>d.data().name===name))writeCloud('chapters',encodeURIComponent(name),{name})
}

