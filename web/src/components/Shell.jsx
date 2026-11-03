import { useEffect } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import SearchBar from './SearchBar'
import { useStore } from '../store'

const TABS = [
  { to: '/', label: '首页', end: true },
  { to: '/explore', label: '发现' },
  { to: '/membership', label: '会员' },
  { to: '/me', label: '我的' }
]

export default function Shell() {
  const location = useLocation()
  const navigate = useNavigate()
  const { toast } = useStore()
  const isTab = TABS.some((tab) => (tab.end ? location.pathname === '/' : location.pathname.startsWith(tab.to)))

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  return (
    <div className="app">
      <header className="desktop-nav">
        <div className="nav-inner">
          <Link to="/" className="wordmark">
            November
          </Link>
          <nav className="nav-links" aria-label="主导航">
            {TABS.slice(0, 3).map((tab) => (
              <NavLink key={tab.to} to={tab.to} end={tab.end}>
                {tab.label}
              </NavLink>
            ))}
          </nav>
          <SearchBar compact />
          <NavLink to="/me" className="nav-me">
            我的
          </NavLink>
        </div>
      </header>

      <header className="mobile-top">
        {isTab ? (
          <Link to="/" className="wordmark">
            November
          </Link>
        ) : (
          <button type="button" className="back" onClick={() => navigate(-1)}>
            返回
          </button>
        )}
        {!isTab ? (
          <Link to="/" className="wordmark small">
            November
          </Link>
        ) : (
          <span className="mobile-tag">十一月</span>
        )}
      </header>

      <main className={isTab ? 'shell-main with-tab' : 'shell-main'}>
        <Outlet />
        <footer className="site-foot">
          <p>手作商品不支持无理由退货 · 原创作品受保护</p>
          <p>November 十一月 · 演示原型，无支付、无登录</p>
        </footer>
      </main>

      {isTab ? (
        <nav className="tabbar" aria-label="底部导航">
          {TABS.map((tab) => (
            <NavLink key={tab.to} to={tab.to} end={tab.end}>
              <span className="dot" />
              {tab.label}
            </NavLink>
          ))}
        </nav>
      ) : null}

      {toast ? <div className="toast" role="status">{toast}</div> : null}
    </div>
  )
}
