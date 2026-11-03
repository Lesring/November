import { Route, Routes } from 'react-router-dom'
import Shell from './components/Shell'
import Creator from './pages/Creator'
import Explore from './pages/Explore'
import Home from './pages/Home'
import Me from './pages/Me'
import Membership from './pages/Membership'
import Product from './pages/Product'

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
        <Route path="/membership" element={<Membership />} />
        <Route path="/me" element={<Me />} />
        <Route path="*" element={<Missing />} />
      </Route>
    </Routes>
  )
}
