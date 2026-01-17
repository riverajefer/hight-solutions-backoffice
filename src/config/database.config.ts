import { registerAs } from '@nestjs/config';

const databaseConfig = registerAs('database', () => ({
  url: process.env.DATABASE_URL || 'file:./dev.db',
  logLevel: process.env.NODE_ENV === 'development' 
    ? ['query', 'info', 'warn', 'error'] 
    : ['error'],
}));

export default databaseConfig;
