console.log('--- VENDEX_ADMIN_MAIN_V4 ---')
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import ErrorBoundary from './components/common/ErrorBoundary'
import { reloadOnceForChunkError } from './utils/chunkReload'

// Vite dispara este evento cuando falla la importación dinámica de un chunk (ej. una
// ruta lazy-loaded) — típicamente porque el navegador quedó con una versión vieja de la
// página después de un deploy nuevo. Recargar trae los hashes de archivo correctos.
window.addEventListener('vite:preloadError', reloadOnceForChunkError)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
