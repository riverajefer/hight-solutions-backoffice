import { normalizeOrigin, resolveCorsOrigins } from './cors-origins.util';

describe('cors-origins.util', () => {
  describe('normalizeOrigin', () => {
    // Así está guardada FRONTEND_URL en Railway, en producción y en staging.
    it('agrega https a un dominio sin esquema', () => {
      expect(normalizeOrigin('crmhighsolutions.com')).toBe('https://crmhighsolutions.com');
    });

    it('respeta el esquema que ya trae y quita la barra final', () => {
      expect(normalizeOrigin('http://localhost:5173/')).toBe('http://localhost:5173');
    });

    it('devuelve undefined para valores vacíos', () => {
      expect(normalizeOrigin('   ')).toBeUndefined();
      expect(normalizeOrigin(undefined)).toBeUndefined();
    });
  });

  describe('resolveCorsOrigins', () => {
    it('en producción deja pasar solo el frontend de FRONTEND_URL', () => {
      expect(
        resolveCorsOrigins({ NODE_ENV: 'production', FRONTEND_URL: 'crmhighsolutions.com' }),
      ).toEqual(['https://crmhighsolutions.com']);
    });

    it('en staging usa su propio dominio y no el de producción', () => {
      expect(
        resolveCorsOrigins({ NODE_ENV: 'staging', FRONTEND_URL: 'pruebas.crmhighsolutions.com' }),
      ).toEqual(['https://pruebas.crmhighsolutions.com']);
    });

    // El caso del clon: otro dominio, sin tocar código.
    it('CORS_ORIGINS tiene prioridad y admite varios orígenes', () => {
      expect(
        resolveCorsOrigins({
          NODE_ENV: 'production',
          FRONTEND_URL: 'crmhighsolutions.com',
          CORS_ORIGINS: 'zoom.com.co, https://www.zoom.com.co/',
        }),
      ).toEqual(['https://zoom.com.co', 'https://www.zoom.com.co']);
    });

    it('en desarrollo suma el Vite local sin duplicarlo', () => {
      expect(
        resolveCorsOrigins({ NODE_ENV: 'development', FRONTEND_URL: 'http://localhost:5173' }),
      ).toEqual(['http://localhost:5173']);
    });

    it('sin NODE_ENV se comporta como desarrollo', () => {
      expect(resolveCorsOrigins({})).toEqual(['http://localhost:5173']);
    });

    it('fuera de desarrollo y sin variables no deja pasar a nadie', () => {
      expect(resolveCorsOrigins({ NODE_ENV: 'production' })).toEqual([]);
    });
  });
});
