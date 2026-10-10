import { useMemo } from 'react'
import { isFirebaseConfigured } from '../lib/firebase'
import { listProviders, resolveProvider } from '../lib/ai/providerRegistry'
import { listWords, listRecords } from '../lib/store'
import { useAuth } from '../lib/AuthProvider'
import { useState } from 'react'

const STATUS_TEXT: Record<string, string> = {
  disabled: '未啟用（純本地運作）',
  ready: '已選擇（Function/Secret 仍須部署）',
  error: '目前不可用（請改用手動整理）',
}

export default function SettingsPage() {
  const {user,signIn,signOutUser,cloudError}=useAuth()
  const [accountMessage,setAccountMessage]=useState('')
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
        {user?<div className="account-box"><p>已登入：<strong>{user.displayName||user.email}</strong></p><button className="btn" onClick={()=>void signOutUser()}>登出雲端帳號</button></div>:<><p className="muted">未設定 Firebase 時單字存在本機。登入後資料將切換至此帳號專屬的 Firestore 路徑，其他帳號不會讀到。</p><button className="btn btn--primary" disabled={!firebaseReady} onClick={()=>void signIn().then(()=>setAccountMessage('Google 登入已開始')).catch(e=>setAccountMessage(e instanceof Error?e.message:'登入失敗'))}>使用 Google 登入</button></>}
        {cloudError&&<p className="notice error-notice" role="alert">{cloudError} · 目前瀏覽器仍保留本機資料，請確認網路或 Firestore Rules。</p>}{accountMessage&&<p className="notice" role="status">{accountMessage}</p>}
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
