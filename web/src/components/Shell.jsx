import { useEffect } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import SearchBar from './SearchBar'
import { CompassIcon, HomeIcon, MessageIcon, UndoIcon, UserIcon } from './Icons'
import { chat } from '../lib/chat'
import { useStore } from '../store'

const TABS = [
  { to: '/', label: '首页', end: true, icon: HomeIcon },
  { to: '/explore', label: '发现', icon: CompassIcon },
  { to: '/messages', label: '消息', icon: MessageIcon },
  { to: '/me', label: '我的', icon: UserIcon }
]

export default function Shell() {
  const location = useLocation()
  const navigate = useNavigate()
  const { toast, unread, setUnread } = useStore()
  const isTab = TABS.some((tab) => location.pathname === tab.to)
  const onThread = location.pathname.startsWith('/messages/')

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  useEffect(() => {
    let alive = true
    chat
      .ensureSession()
      .then(() => chat.listConversations())
      .then(() => {
        if (alive) setUnread(chat.getUnread())
      })
      .catch(() => {})
    const unsubscribe = chat.subscribe((event) => {
      if (event.type === 'unread' && alive) setUnread(event.unread || 0)
    })
    return () => {
      alive = false
      unsubscribe()
    }
  }, [setUnread])

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
          <button type="button" className="back icon-btn" onClick={() => navigate(-1)} aria-label="返回">
            <UndoIcon />
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

      <main
        className={
          (isTab ? 'shell-main with-tab' : 'shell-main') + (onThread ? ' thread-shell' : '')
        }
      >
        <Outlet />
        {onThread ? null : (
          <footer className="site-foot">
            <p>手作商品不支持无理由退货 · 原创作品受保护</p>
            <p>November 十一月 · 演示原型，无支付、无登录</p>
          </footer>
        )}
      </main>

      {isTab ? (
        <nav className="tabbar" aria-label="底部导航">
          {TABS.map((tab) => (
            <NavLink key={tab.to} to={tab.to} end={tab.end} className="tab-link">
              <span className="tab-icon-wrap">
                <tab.icon />
                {tab.to === '/messages' && unread > 0 ? (
                  <i className="tab-badge" aria-label={'未读 ' + unread}>
                    {unread > 99 ? '99+' : unread}
                  </i>
                ) : null}
              </span>
              {tab.label}
            </NavLink>
          ))}
        </nav>
      ) : null}

      {toast ? <div className="toast" role="status">{toast}</div> : null}
    </div>
  )
}
