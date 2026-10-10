import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type {User} from 'firebase/auth'
import { isFirebaseConfigured } from './firebase'
import { getCloudClient } from './firebaseCloud'
import { hydrateCloud, listRecords, listWords, listWrong, setStorageScope } from './store'

interface AuthState { user:User|null;loading:boolean;cloudError:string;signIn:()=>Promise<void>;signOutUser:()=>Promise<void> }
const Context=createContext<AuthState>({user:null,loading:false,cloudError:'',signIn:async()=>{throw new Error('Firebase 尚未設定')},signOutUser:async()=>{}})
export const useAuth=()=>useContext(Context)
export function AuthProvider({children}:{children:ReactNode}){
 const [user,setUser]=useState<User|null>(null),[loading,setLoading]=useState(isFirebaseConfigured()),[cloudError,setCloudError]=useState('')
 useEffect(()=>{
  const error=(event:Event)=>setCloudError((event as CustomEvent<string>).detail)
  window.addEventListener('toeic-cloud-error',error)
  if(!isFirebaseConfigured()){setStorageScope(null);setLoading(false);return()=>window.removeEventListener('toeic-cloud-error',error)}
  let unsubscribe:(()=>void)|undefined,active=true
  void (async()=>{const {auth}=await getCloudClient();if(!active)return;const {onAuthStateChanged}=await import('firebase/auth');unsubscribe=onAuthStateChanged(auth,async current=>{
   setCloudError('');
   if(!current){setStorageScope(null);setUser(null);setLoading(false);return}
   const local={words:listWords(),records:listRecords(),wrong:listWrong()};setStorageScope(current.uid);setUser(current);setLoading(true)
   try{await hydrateCloud(current.uid,local)}catch(e){setCloudError(e instanceof Error?`雲端資料載入失敗：${e.message}`:'雲端資料載入失敗')}
   finally{setLoading(false)}
  })})().catch(e=>{setCloudError(e instanceof Error?`Firebase 初始化失敗：${e.message}`:'Firebase 初始化失敗');setLoading(false)})
  return()=>{active=false;unsubscribe?.();window.removeEventListener('toeic-cloud-error',error)}
 },[])
 const value=useMemo<AuthState>(()=>({user,loading,cloudError,signIn:async()=>{if(!isFirebaseConfigured())throw new Error('請先設定 Firebase 環境變數');const [{auth},{GoogleAuthProvider,signInWithPopup,signInWithRedirect}]=await Promise.all([getCloudClient(),import('firebase/auth')]);const provider=new GoogleAuthProvider();if(typeof navigator!=='undefined'&&/iPhone|iPad|iPod/i.test(navigator.userAgent)){await signInWithRedirect(auth,provider);return}try{await signInWithPopup(auth,provider)}catch(error){const code=(error as {code?:string})?.code;if(code==='auth/popup-blocked')await signInWithRedirect(auth,provider);else throw error}},signOutUser:async()=>{if(isFirebaseConfigured()){const [{auth},{signOut}]=await Promise.all([getCloudClient(),import('firebase/auth')]);await signOut(auth)}}}),[user,loading,cloudError])
 return <Context.Provider value={value}>{children}</Context.Provider>
}
