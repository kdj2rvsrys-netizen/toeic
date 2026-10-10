import type {Auth} from 'firebase/auth'
import type {Firestore} from 'firebase/firestore'
import {getFirebaseConfig} from './firebase'
let client:Promise<{auth:Auth;db:Firestore;fs:typeof import('firebase/firestore')}>|null=null
export function getCloudClient(){if(!client){client=(async()=>{const config=getFirebaseConfig();if(!config)throw new Error('Firebase 尚未設定。');const [{initializeApp,getApps},{getAuth},{initializeFirestore,getFirestore,persistentLocalCache,persistentMultipleTabManager},fs]=await Promise.all([import('firebase/app'),import('firebase/auth'),import('firebase/firestore'),import('firebase/firestore')]);const app=getApps()[0]??initializeApp(config),auth=getAuth(app);let db:Firestore;try{db=initializeFirestore(app,{localCache:persistentLocalCache({tabManager:persistentMultipleTabManager()})})}catch{db=getFirestore(app)}return{auth,db,fs}})()}return client}
