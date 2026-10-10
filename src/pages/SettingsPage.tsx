
import { useMemo } from 'react'
import { isFirebaseConfigured } from '../lib/firebase'
import { listProviders, resolveProvider } from '../lib/ai/providerRegistry'
import { listWords, listRecords } from '../lib/store'
import { useAuth } from '../lib/AuthProvider'

const STATUS_TEXT: Record<string, string> = {
  disabled: '未啟用（純本地運作）',
  ready: '已選擇（Function/Secret 仍須部署）',
  error: '目前不可用（請改用手動整理）',
}

export default function SettingsPage() {
  const {user,loading,signIn,signOutUser,cloudError,authDiagnostic}=useAuth()
  const firebaseReady = useMemo(() => isFirebaseConfigured(), [])
  const providers = useMemo(() => listProviders(), [])
  const active = useMemo(
    () => resolveProvider(import.meta.env.VITE_AI_PROVIDER),
    [],
  )

  return (
    <div className="page">
      <section className="card">
        <h2 className="card__title">連線狀態</h2>
        <dl className="status-list">
          <div className="status-row">
            <dt>Firebase</dt>
            <dd>
              <span className={firebaseReady ? 'pill pill--ok' : 'pill pill--warn'}>
                {firebaseReady ? '設定值存在' : '未設定'}
              </span>
            </dd>
          </div>
          <div className="status-row"><dt>資料模式</dt><dd><span className={user?'pill pill--ok':'pill pill--warn'}>{user?'Firebase 雲端帳號':'本機瀏覽器'}</span></dd></div>
          <div className="status-row"><dt>本機資料</dt><dd>{listWords().length} 個單字 · {listRecords().length} 次測驗</dd></div>
        </dl>
        {user?<div className="account-box"><p>雲端狀態：已登入 <strong>{user.displayName||user.email}</strong></p><button className="btn" onClick={()=>void signOutUser()}>登出雲端帳號</button></div>:<><p className="muted">雲端狀態：{loading?'正在確認登入狀態…':'未登入'}。目前使用本機資料；登入成功並確認後才會同步至此帳號專屬的 Firestore 路徑。</p><button className="btn btn--primary" disabled={!firebaseReady||loading} onClick={()=>void signIn().catch(()=>{})}>使用 Google 登入</button></>}
        {cloudError&&<p className="notice error-notice" role="alert">{cloudError} · 雲端未登入或目前不可用，本機單字和測驗紀錄仍保留在此瀏覽器。</p>}
        {import.meta.env.DEV&&authDiagnostic&&<details className="notice" open><summary>開發診斷資訊</summary><p>Firebase Auth code: <code>{authDiagnostic.code}</code></p><p>{authDiagnostic.message}</p></details>}
      </section>

      <section className="card">
        <h2 className="card__title">AI Provider</h2>
        <p className="card__text">
          目前啟用：<strong>{active.label}</strong>（{active.id}）
        </p>
        <ul className="bullets">
          {providers.map((p) => (
            <li key={p.id}>
              <strong>{p.label}</strong>（{p.id}）— {STATUS_TEXT[p.status()] ?? p.status()}
            </li>
          ))}
        </ul>
        <p className="muted">
          金鑰只存放在 Cloudflare Pages 後端，前端程式碼不含任何 API 金鑰。
          AI 失效時，單字管理與測驗功能不受影響。
        </p>
      </section>
    </div>
  )
}
