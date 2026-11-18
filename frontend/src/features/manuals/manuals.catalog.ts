import { PERMISSIONS } from '../../utils/constants';

/**
 * Catálogo de manuales en PDF que se muestran en «Manuales» (`/manuales`).
 *
 * Los PDF viven en `frontend/public/manuals/` y se sirven tal cual (sin hash).
 * Las fuentes HTML con que se generan están en `docs/manuales/src/`.
 *
 * Para publicar un manual nuevo:
 *   1. Copia el PDF a `frontend/public/manuals/`.
 *   2. Agrega una entrada aquí (el más reciente arriba dentro de su categoría).
 *   3. Si es solo para cierto rol, pon en `permissions` los permisos que lo
 *      habilitan (basta con tener uno).
 *
 * Si reemplazas un PDF por una versión nueva, actualiza `updatedAt`: además de
 * mostrarse, se usa como parámetro de versión en la URL para que el navegador
 * no muestre la copia vieja de su caché.
 */
export type ManualCategory = 'Seguridad' | 'Inventario';

export interface Manual {
  /** Identificador estable; va en la URL (`/manuales?doc=<slug>`). */
  slug: string;
  title: string;
  description: string;
  category: ManualCategory;
  audience: 'Todos los usuarios' | 'Administradores' | 'Bodega y producción';
  /** Nombre del archivo dentro de `public/manuals/`. */
  file: string;
  /** Fecha de la versión vigente, AAAA-MM-DD. */
  updatedAt: string;
  /** Si se define, el usuario necesita al menos uno de estos permisos. */
  permissions?: string[];
}

export const MANUALS: Manual[] = [
  {
    slug: 'recetas-de-material',
    title: 'Recetas de material',
    description:
      'Cuánto material gasta cada producto (calandra, cintas, plotter) para que cada OP descuente sola de sus rollos, y cómo corregirlo cuando el trabajo fue distinto.',
    category: 'Inventario',
    audience: 'Bodega y producción',
    file: 'Manual-usuario-recetas-de-material.pdf',
    updatedAt: '2026-11-14',
  },
  {
    slug: 'rollos-dtf',
    title: 'Rollos DTF y consumo de material',
    description:
      'Cómo registrar los rollos de DTF, cómo se descuenta solo el material de cada OP, el cierre del rollo con su merma y la rentabilidad.',
    category: 'Inventario',
    audience: 'Bodega y producción',
    file: 'Manual-usuario-rollos-dtf.pdf',
    updatedAt: '2026-11-12',
  },
  {
    slug: 'verificacion-en-dos-pasos',
    title: 'Verificación en dos pasos',
    description:
      'Cómo activar la verificación en dos pasos con una app autenticadora e ingresar con el código.',
    category: 'Seguridad',
    audience: 'Todos los usuarios',
    file: 'Manual-usuario-verificacion-en-dos-pasos.pdf',
    updatedAt: '2026-10-29',
  },
  {
    slug: 'verificacion-en-dos-pasos-administracion',
    title: 'Verificación en dos pasos — administración',
    description:
      'Cómo exigir la verificación en dos pasos a un usuario y cómo restablecerla si pierde el celular.',
    category: 'Seguridad',
    audience: 'Administradores',
    file: 'Manual-administracion-verificacion-en-dos-pasos.pdf',
    updatedAt: '2026-10-29',
    permissions: [PERMISSIONS.RESET_USER_2FA, PERMISSIONS.REQUIRE_USER_2FA],
  },
];

export const getManualUrl = (manual: Manual): string =>
  `/manuals/${encodeURIComponent(manual.file)}?v=${manual.updatedAt}`;
