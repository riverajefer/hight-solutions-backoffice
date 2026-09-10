/**
 * Servidor estático de producción.
 *
 * Sustituye a `npx serve -s dist`, que tenía dos problemas medidos en
 * producción:
 *
 * 1. Su SPA fallback respondía `index.html` con status 200 para CUALQUIER ruta
 *    inexistente, incluidos los `/assets/*.js`. Cuando un usuario con la
 *    pestaña abierta desde antes de un despliegue pedía un chunk que ya no
 *    existe, el navegador recibía HTML donde esperaba un módulo JavaScript y
 *    fallaba con un mensaje distinto según el motor. Aquí ese caso es un 404
 *    limpio e inequívoco.
 *
 * 2. No enviaba ninguna cabecera `Cache-Control`, así que los assets con hash
 *    —inmutables por definición— se revalidaban en cada carga.
 */

import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const port = process.env.PORT || 3000;
// El package.json declara "type": "module", así que no hay __dirname.
const distDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'dist');

const ONE_YEAR_SECONDS = 31536000;

/**
 * Assets con hash en el nombre: el contenido nunca cambia para un nombre dado,
 * así que se pueden cachear indefinidamente. `fallthrough: false` hace que un
 * archivo inexistente devuelva 404 en lugar de continuar hacia el fallback SPA.
 */
app.use(
  '/assets',
  express.static(path.join(distDir, 'assets'), {
    immutable: true,
    maxAge: ONE_YEAR_SECONDS * 1000,
    fallthrough: false,
    index: false,
  }),
);

/** El manifiesto de versión debe leerse siempre fresco. */
app.get('/version.json', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.sendFile(path.join(distDir, 'version.json'), (error) => {
    if (error) {
      res.status(404).end();
    }
  });
});

/** Resto de archivos estáticos (favicon, etc.) sin el fallback SPA. */
app.use(
  express.static(distDir, {
    index: false,
    maxAge: 0,
    setHeaders: (res) => {
      res.set('Cache-Control', 'no-cache');
    },
  }),
);

/**
 * Fallback SPA: solo para rutas sin extensión de archivo, para que
 * `/orders/33d01330` funcione pero `/assets/algo.js` no mienta.
 *
 * `no-cache` obliga al navegador a revalidar el HTML en cada visita, que es lo
 * que garantiza que una pestaña recargada reciba siempre la versión vigente.
 */
// Se usa `app.use` en vez de `app.get('*')` porque Express 5 cambió la
// sintaxis de las rutas comodín; así el servidor no depende de esa versión.
app.use((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.status(405).end();
    return;
  }

  if (path.extname(req.path)) {
    res.status(404).end();
    return;
  }

  res.set('Cache-Control', 'no-cache');
  res.sendFile(path.join(distDir, 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Frontend servido desde ${distDir} en el puerto ${port}`);
});
