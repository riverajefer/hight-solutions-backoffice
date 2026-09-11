import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Emite `dist/version.json` al terminar el build.
 *
 * El identificador se deriva del hash que Vite le pone al bundle de entrada, no
 * de un timestamp: si un redespliegue no cambia el código, el hash es idéntico,
 * los chunks anteriores siguen existiendo y no hay ninguna actualización que
 * anunciar. Con un timestamp, cada redeploy mostraría un aviso falso.
 *
 * El frontend lo consulta desde `useAppVersion` para saber si hay una versión
 * nueva publicada mientras el usuario tenía la pestaña abierta.
 */
function versionManifest(): Plugin {
  return {
    name: 'high-solutions-version-manifest',
    apply: 'build',
    closeBundle() {
      const outDir = resolve(__dirname, 'dist')

      try {
        const html = readFileSync(resolve(outDir, 'index.html'), 'utf-8')
        const entry = html.match(/\/assets\/index-([A-Za-z0-9_-]+)\.js/)

        if (!entry) {
          this.warn(
            'No se encontró el bundle de entrada en index.html; no se generó version.json',
          )
          return
        }

        writeFileSync(
          resolve(outDir, 'version.json'),
          `${JSON.stringify({ buildId: entry[1], builtAt: new Date().toISOString() }, null, 2)}\n`,
        )
      } catch (error) {
        // Un fallo aquí no debe romper el build: sin version.json el aviso de
        // actualización simplemente no aparece, todo lo demás sigue igual.
        this.warn(`No se pudo generar version.json: ${String(error)}`)
      }
    },
  }
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), versionManifest()],
  server: {
    port: 5173,
    open: true,
  },
  build: {
    outDir: 'dist',
    // Los stacks minificados ("index-4f2a.js:1:88231") son inservibles para
    // diagnosticar un fallo reportado desde producción. Con sourcemaps, tanto
    // la consola del navegador como los reportes que llegan a Loki apuntan al
    // archivo y la línea reales.
    // Es un backoffice interno tras autenticación, así que se acepta exponer
    // el mapa del código. Para dejar de publicarlo, cambiar a 'hidden': los
    // .map se siguen generando pero el bundle no los referencia.
    sourcemap: true,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          mui: ['@mui/material', '@mui/icons-material', '@mui/x-date-pickers'],
          pdf: ['jspdf', 'html2canvas'],
          query: ['@tanstack/react-query'],
        },
      },
    },
  },
  define: {
    __APP_ENV__: JSON.stringify(mode),
  },
}))
