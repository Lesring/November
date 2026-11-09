import { lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Shell from './components/Shell'
import Home from './pages/Home'

const Explore = lazy(() => import('./pages/Explore'))
const Product = lazy(() => import('./pages/Product'))
const Creator = lazy(() => import('./pages/Creator'))
const Messages = lazy(() => import('./pages/Messages'))
const Thread = lazy(() => import('./pages/Thread'))
const Me = lazy(() => import('./pages/Me'))

function Missing() {
  return (
    <div className="empty">
      <h1>这一页还没有</h1>
      <a className="btn primary" href="/">
        回到首页
      </a>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route path="/" element={<Home />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/product/:id" element={<Product />} />
        <Route path="/creator/:id" element={<Creator />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/messages/:id" element={<Thread />} />
        <Route path="/membership" element={<Navigate to="/me" replace />} />
        <Route path="/me" element={<Me />} />
        <Route path="*" element={<Missing />} />
      </Route>
    </Routes>
  )
}
