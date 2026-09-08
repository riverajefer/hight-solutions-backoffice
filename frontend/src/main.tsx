import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { attemptChunkReload } from './utils/chunkError'
import { reportClientError } from './utils/reportClientError'

/**
 * Vite emite `vite:preloadError` cuando un módulo con code-splitting no se
 * puede descargar, típicamente porque se desplegó una versión nueva y el chunk
 * con el hash anterior ya no existe en el servidor.
 *
 * Se atiende aquí para recuperarse antes de que el error llegue al render.
 * Si la recarga no procede (ya se intentó hace poco), no se cancela el evento
 * y el ErrorBoundary muestra la pantalla de error con el botón de actualizar.
 */
window.addEventListener('vite:preloadError', (event) => {
  reportClientError(event.payload, { kind: 'chunk' })

  if (attemptChunkReload()) {
    event.preventDefault()
  }
})

/**
 * Errores que ocurren fuera del render de React (callbacks, timers, listeners)
 * y que por tanto ningún ErrorBoundary puede capturar. No rompen la pantalla,
 * pero sí explican comportamientos raros, así que también se registran.
 */
window.addEventListener('error', (event) => {
  reportClientError(event.error ?? event.message, { kind: 'unhandled' })
})

window.addEventListener('unhandledrejection', (event) => {
  reportClientError(event.reason, { kind: 'unhandled' })
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
