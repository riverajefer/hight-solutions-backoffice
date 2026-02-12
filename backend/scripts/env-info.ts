import * as dotenv from 'dotenv';
import * as path from 'path';

const env = process.env.NODE_ENV || 'development';
const envFile = `.env.${env}`;

// Load environment file
dotenv.config({ path: path.resolve(__dirname, '..', envFile) });

console.log('🌍 Backend Environment Info\n');
console.log('━'.repeat(50));
console.log('📍 Environment:', env);
console.log('📄 Config File:', envFile);
console.log('━'.repeat(50));
console.log('\n💾 Database Configuration:');
if (process.env.DATABASE_URL) {
  const dbHost = process.env.DATABASE_URL.split('@')[1]?.split('/')[0] || 'N/A';
  const dbName = process.env.DATABASE_URL.split('/').pop()?.split('?')[0] || 'N/A';
  console.log('   Host:', dbHost);
  console.log('   Database:', dbName);
} else {
  console.log('   ❌ DATABASE_URL not configured');
}

console.log('\n🌐 Server Configuration:');
console.log('   Port:', process.env.PORT || '3000');
console.log('   Frontend URL:', process.env.FRONTEND_URL || '❌ Not configured');

console.log('\n🔐 JWT Configuration:');
console.log('   Access Secret:', process.env.JWT_ACCESS_SECRET ? '✅ Configured' : '❌ Missing');
console.log('   Refresh Secret:', process.env.JWT_REFRESH_SECRET ? '✅ Configured' : '❌ Missing');
console.log('   Access Expiration:', process.env.JWT_ACCESS_EXPIRATION || '❌ Not set');
console.log('   Refresh Expiration:', process.env.JWT_REFRESH_EXPIRATION || '❌ Not set');

console.log('\n' + '━'.repeat(50));
console.log('✨ Tip: Run "npm run start:dev" to start in development mode');
console.log('━'.repeat(50) + '\n');
