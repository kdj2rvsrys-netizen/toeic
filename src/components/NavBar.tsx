import { NavLink } from 'react-router-dom'

const items = [
  { to: '/', label: '首頁', icon: '🏠', end: true },
  { to: '/words', label: '單字', icon: '📖', end: false },
  { to: '/quiz', label: '測驗', icon: '✍️', end: false },
  { to: '/review', label: '複習', icon: '↻', end: false },
  { to: '/settings', label: '設定', icon: '⚙️', end: false },
]

export default function NavBar() {
  return (
    <nav className="navbar" aria-label="主導覽">
      <ul className="navbar__list">
        {items.map((it) => (
          <li key={it.to} className="navbar__item">
            <NavLink
              to={it.to}
              end={it.end}
              className={({ isActive }) =>
                isActive ? 'navbar__link navbar__link--active' : 'navbar__link'
              }
            >
              <span className="navbar__icon" aria-hidden>
                {it.icon}
              </span>
              <span className="navbar__label">{it.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
