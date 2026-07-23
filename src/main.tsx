import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router'
import { Toaster } from 'sonner'
import { StoreProvider } from './lib/store'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <StoreProvider>
        <App />
        <Toaster theme="dark" position="top-center" richColors />
      </StoreProvider>
    </HashRouter>
  </StrictMode>,
)
