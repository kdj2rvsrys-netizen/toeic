# 多益單字學習

手機優先的 TOEIC 單字學習網站。React、TypeScript、Vite；支援 iPhone Safari、桌面瀏覽器及加入主畫面。包括單字管理、JSON/CSV 匯入匯出、英翻中/中翻英測驗、錯題、熟悉度複習、統計、瀏覽器 OCR，以及選用 Gemini 欄位整理。

## 本機安裝與啟動

需要 Node.js 18+ 與 pnpm。

```bash
pnpm install
pnpm dev
```

瀏覽 `http://localhost:5173`。Vite 已開啟區網存取，可用同一網路手機連至電腦 IP。檢查指令：

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm preview
```

若使用 npm，執行 `npm install` 後上述 `pnpm` 指令可換成 `npm run`。

## 本機模式與資料備份

未登入時，單字、錯題及測驗紀錄存於此瀏覽器的 localStorage；裝置間不會同步。清除網站資料前，請到「單字庫」下載完整 JSON 備份。備份包含單字、學習熟悉度、錯題及答題歷史。匯入時保留現有同名詞目及紀錄，將不重複詞目與新紀錄合併；CSV 用於詞彙表匯入匯出。

## Firebase Google 登入與 Firestore

1. 在 Firebase Console 建立免費專案與 Web App；啟用 Authentication 的 Google provider，並在授權網域加入 `localhost` 與正式網站網域。
2. 建立 Cloud Firestore 資料庫，先部署專案根目錄的 `firestore.rules`。規則限制使用者只能讀寫 `/users/{自己的 UID}/...`。
3. 複製 `.env.example` 為 `.env.local`，填入 Firebase Web App 的 `VITE_FIREBASE_*` 設定。Web config 會進入前端 bundle，這些值不是密碼；Firestore Security Rules 才是權限邊界。
4. 重啟開發伺服器，於「設定」使用 Google 登入。第一次登入且該帳號雲端詞庫為空時，會將目前本機資料匯入該帳號；其後每個帳號使用不同本機快取命名空間並儲存於自己的 Firestore 子集合。

Firestore Web SDK 在支援的瀏覽器使用多分頁 IndexedDB 持久快取；本機快取及 JSON 備份仍可在暫時離線時使用。同步錯誤會顯示在設定頁。

## 照片 OCR

於匯入頁選照片或拍照，再按「開始 OCR」。Tesseract.js 在瀏覽器辨識英文與繁體中文，原始照片不會上傳或保存。首次使用需連線下載 OCR worker 與語言模型；處理完成可檢查辨識文字、手動解析或修改預覽。OCR/網路失敗時可直接貼上或匯入 CSV/JSON。

## AI 課本文字整理（選用）

主要 Provider 為 Google Gemini `gemini-3.5-flash-lite`，由 Cloudflare Pages Function 代理；只有使用者按「AI 整理欄位」才送出 OCR/貼上的文字。原始照片不會送出。Function 驗證 Firebase ID token、每個 isolate 每分鐘最多 12 次、輸入上限 12,000 字元，驗證模型 JSON，且只接受能在來源文字中找到的英文詞目；英文例句只保留來源中原文確實存在的句子。AI 建議中文詞義、例句翻譯與標籤會逐欄標示，需使用者確認後才匯入。

1. 在 Google AI Studio 自行建立 Gemini API key，使用免費層並**不要連結付費計費方案**。免費層限額會變動；內容可能依供應商免費層政策用於服務改善。請勿傳送私密或不應分享的內容。
2. Cloudflare Pages 部署環境設定 build variable `VITE_AI_PROVIDER=gemini` 及 `VITE_FIREBASE_*`。
3. 在 Pages Functions 設定 Secret `GEMINI_API_KEY`；設定環境變數 `FIREBASE_API_KEY` 為 Firebase Web API key（用來向 Identity Toolkit 驗證 ID token），可選 `GEMINI_MODEL` 覆寫模型名稱。
4. AI 不可用、未設定、限流或超過免費額度時會顯示可讀錯誤，手動整理及全部刷題流程仍可使用。

AI Studio 免費層的文字 token 目前標示免費，但限制依模型/帳號可能不同；詳細價格與政策請以 [Gemini 官方價格頁](https://ai.google.dev/gemini-api/docs/pricing) 為準。若啟用付費帳單，超出免費額度可能產生費用；本專案不會替你啟用帳單。

## Cloudflare Pages 部署

Build command：`pnpm build`；輸出目錄：`dist`。將 `.env.example` 的 `VITE_*` 設定填在 Pages build environment，依上節加入 Function secret。部署前確認 Google Auth 授權網域包含 Pages 網域，並在 Firestore Rules 發布 `firestore.rules`。Pages 支援 SPA fallback 與 `functions/api/ai/organize.ts` Functions 路由。

根目錄 manifest 與 Service Worker 讓網站可加入主畫面及快取已開啟過的介面；瀏覽器資料本身仍以 localStorage/Firestore 持久保存。

## 專案結構

- `src/lib/words.ts`, `quiz.ts`：單字資料與測驗純邏輯
- `src/lib/store.ts`：本機持久化、Firebase 同步、匯入/備份
- `src/lib/AuthProvider.tsx`, `firebase.ts`：Google 登入、帳號隔離及 Firestore
- `src/lib/ai/`：可替換 Provider 介面與 Gemini Functions 呼叫
- `functions/api/ai/organize.ts`：驗證、限流、輸入檢查及安全 AI 代理
- `src/pages/`：儀表板、詞庫、測驗、匯入、錯題、複習、統計及設定
- `firestore.rules`：使用者 UID 隔離規則
- `docs/PROJECT_STATUS.md`：完成狀態及驗證記錄
