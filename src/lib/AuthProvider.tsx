import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { User } from 'firebase/auth'
import { isFirebaseConfigured } from './firebase'
import { getCloudClient } from './firebaseCloud'
import { hydrateCloud, listChapters, listRecords, listWords, listWrong, setStorageScope } from './store'

interface AuthDiagnostic { code: string; message: string }
interface AuthState { user: User | null; loading: boolean; cloudError: string; authDiagnostic: AuthDiagnostic | null; signIn: () => Promise<void>; signOutUser: () => Promise<void> }
const Context = createContext<AuthState>({ user: null, loading: false, cloudError: '', authDiagnostic: null, signIn: async () => { throw new Error('Firebase 尚未設定') }, signOutUser: async () => {} })
export const useAuth = () => useContext(Context)

function authFailure(error: unknown): AuthDiagnostic {
  const code = typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string' ? error.code : 'auth/unknown'
  const messages: Record<string, string> = {
    'auth/unauthorized-domain': '目前網站網域未加入 Firebase Authentication 授權網域。',
    'auth/operation-not-allowed': 'Firebase 尚未啟用 Google 登入提供者。',
    'auth/popup-blocked': 'Safari 封鎖了登入視窗。請在 Safari 設定中允許此網站的彈出式視窗後再試。',
    'auth/popup-closed-by-user': '登入視窗在完成前已關閉。',
    'auth/cancelled-popup-request': '另一個登入視窗請求已取代這次登入。',
    'auth/network-request-failed': '網路請求失敗，請確認連線後再試。',
    'auth/invalid-api-key': 'Firebase Web API key 無效。',
    'auth/invalid-credential': 'Google 登入憑證無效或已過期。',
    'auth/redirect-cancelled-by-user': '重新導向登入已取消。',
    'auth/redirect-operation-pending': '已有一個重新導向登入流程正在處理。',
  }
  return { code, message: messages[code] ?? '登入無法完成。請確認網路及 Firebase Authentication 設定。' }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(isFirebaseConfigured())
  const [cloudError, setCloudError] = useState('')
  const [authDiagnostic, setAuthDiagnostic] = useState<AuthDiagnostic | null>(null)

  useEffect(() => {
    const error = (event: Event) => setCloudError((event as CustomEvent<string>).detail)
    window.addEventListener('toeic-cloud-error', error)
    if (!isFirebaseConfigured()) {
      setStorageScope(null)
      setLoading(false)
      return () => window.removeEventListener('toeic-cloud-error', error)
    }

    let unsubscribe: (() => void) | undefined
    let active = true
    void (async () => {
      const [{ auth }, { getRedirectResult, onAuthStateChanged }] = await Promise.all([getCloudClient(), import('firebase/auth')])
      // Consume the redirect response before subscribing; otherwise an initial null state
      // can briefly look like a completed sign-out while Safari is returning from Google.
      const redirectResult = await getRedirectResult(auth)
      if (!active) return
      if (redirectResult) setAuthDiagnostic(null)
      unsubscribe = onAuthStateChanged(auth, async current => {
        setCloudError('')
        if (!current) {
          setStorageScope(null)
          setUser(null)
          setLoading(false)
          return
        }
        const local = { words: listWords(), records: listRecords(), wrong: listWrong(), chapters:listChapters() }
        setStorageScope(current.uid)
        setUser(current)
        setLoading(true)
        try { await hydrateCloud(current.uid, local) }
        catch (e) { setCloudError(e instanceof Error ? `雲端資料載入失敗：${e.message}` : '雲端資料載入失敗') }
        finally { setLoading(false) }
      })
    })().catch(error => {
      const diagnostic = authFailure(error)
      setAuthDiagnostic(diagnostic)
      setCloudError(`Google 登入失敗 [${diagnostic.code}]：${diagnostic.message}`)
      setLoading(false)
    })
    return () => { active = false; unsubscribe?.(); window.removeEventListener('toeic-cloud-error', error) }
  }, [])

  const value = useMemo<AuthState>(() => ({ user, loading, cloudError, authDiagnostic,
    signIn: async () => {
      if (!isFirebaseConfigured()) throw new Error('請先設定 Firebase 環境變數')
      setCloudError('')
      setAuthDiagnostic(null)
      try {
        const [{ auth }, { GoogleAuthProvider, signInWithPopup }] = await Promise.all([getCloudClient(), import('firebase/auth')])
        const provider = new GoogleAuthProvider()
        // Cloudflare Pages uses a different origin from Firebase's authDomain. Safari
        // blocks the third-party storage used by Firebase's redirect helper, so use
        // the user-initiated popup flow instead of redirecting on iOS.
        await signInWithPopup(auth, provider)
        setAuthDiagnostic(null)
      } catch (error) {
        const diagnostic = authFailure(error)
        setAuthDiagnostic(diagnostic)
        setCloudError(`Google 登入失敗 [${diagnostic.code}]：${diagnostic.message}`)
        const wrapped = new Error(`${diagnostic.code}: ${diagnostic.message}`)
        Object.assign(wrapped, { cause: error })
        throw wrapped
      }
    },
    signOutUser: async () => {
      if (isFirebaseConfigured()) {
        const [{ auth }, { signOut }] = await Promise.all([getCloudClient(), import('firebase/auth')])
        await signOut(auth)
      }
    },
  }), [user, loading, cloudError, authDiagnostic])
  return <Context.Provider value={value}>{children}</Context.Provider>
}

