import React from 'react'
import { hydrate } from './lib/catalog'

if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual'
}
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { StoreProvider } from './store'
import './styles.css'

const rootEl = document.getElementById('root')

fetch('/v1/catalog')
  .then((response) => {
    if (!response.ok) throw new Error('catalog')
    return response.json()
  })
  .then((data) => {
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
  })
  .catch(() => {
    rootEl.textContent = '没有连上目录。请在项目根目录运行 npm run api'
  })
