import { Navigate, Route, Routes } from 'react-router-dom'
import NavBar from './components/NavBar'
import HomePage from './pages/HomePage'
import WordsPage from './pages/WordsPage'
import QuizPage from './pages/QuizPage'
import SettingsPage from './pages/SettingsPage'
import ImportPage from './pages/ImportPage'
import ReviewPage from './pages/ReviewPage'
import MistakesPage from './pages/MistakesPage'
import StatsPage from './pages/StatsPage'
import { useAuth } from './lib/AuthProvider'
import WordDetailPage from './pages/WordDetailPage'

export default function App() {
  const {loading}=useAuth()
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__inner">
          <span className="app-logo" aria-hidden>
            📚
          </span>
          <h1 className="app-title">多益單字學習</h1>
        </div>
      </header>

      <main className="app-main">
        {loading&&<section className="panel loading" role="status">正在載入個人學習資料…</section>}
        {!loading&&<Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/words" element={<WordsPage />} />
          <Route path="/words/:id" element={<WordDetailPage />} />
          <Route path="/quiz" element={<QuizPage />} />
          <Route path="/review" element={<ReviewPage />} />
          <Route path="/mistakes" element={<MistakesPage />} />
          <Route path="/import" element={<ImportPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>}
      </main>

      <NavBar />
    </div>
  )
}
