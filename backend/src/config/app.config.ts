import { registerAs } from '@nestjs/config';
import { normalizeOrigin } from '../common/utils/cors-origins.util';

const appConfig = registerAs('app', () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  environment: process.env.NODE_ENV || 'development',
  // En Railway está guardada sin esquema; normalizada, los enlaces que se arman
  // con ella (p. ej. los de WhatsApp) salen con https://.
  frontendUrl: normalizeOrigin(process.env.FRONTEND_URL),
}));

export default appConfig;
