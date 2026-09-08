import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
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
