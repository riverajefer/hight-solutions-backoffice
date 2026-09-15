/**
 * ¿Se publica la documentación Swagger en `/api`?
 *
 * Solo en desarrollo, salvo que `SWAGGER_ENABLED=true`. En staging y producción
 * el API está expuesto a internet, y Swagger publica su mapa completo: cada
 * ruta, sus DTOs y cuáles no piden token. Así quedaba descrito, por ejemplo, el
 * registro público que creaba administradores (tercera barrida, hallazgos 1 y 8).
 *
 * Misma regla que `getEnvironment`: cualquier NODE_ENV que no sea staging o
 * production cuenta como desarrollo.
 */
export function isSwaggerEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.SWAGGER_ENABLED?.trim().toLowerCase() === 'true') return true;

  const nodeEnv = env.NODE_ENV?.toLowerCase();
  return nodeEnv !== 'production' && nodeEnv !== 'staging';
}
