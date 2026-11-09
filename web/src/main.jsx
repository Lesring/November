import React from 'react'
import { hydrate } from './lib/catalog'

if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual'
}
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { StoreProvider } from './store'
import demoCatalog from './data/demo-catalog.json'
import './styles.css'

const rootEl = document.getElementById('root')

function mount(data) {
  hydrate(data)
  createRoot(rootEl).render(
    <React.StrictMode>
      <BrowserRouter>
        <StoreProvider>
          <App />
        </StoreProvider>
      </BrowserRouter>
    </React.StrictMode>
  )
}

fetch('/v1/catalog')
  .then((response) => {
    if (!response.ok) throw new Error('catalog')
    return response.json()
  })
  .then(mount)
  .catch(() => {
    // 静态托管（Vercel 等）没有 API 时，用仓库演示目录
    mount(demoCatalog)
  })
