import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check for .env.development first
const envFile = '.env.development';
const envPath = path.resolve(__dirname, '..', envFile);

console.log('🌍 Frontend Environment Info\n');
console.log('━'.repeat(50));
console.log('📍 Environment: development (local)');
console.log('📄 Config File:', envFile);
console.log('━'.repeat(50));

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf-8');
  console.log('\n📋 Environment Variables:\n');

  content.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=');
        // Sanitize the value - hide secrets
        const sanitizedValue = key.includes('SECRET') || key.includes('PASSWORD')
          ? '****** (hidden)'
          : value.replace(/["']/g, '');

        // Format nicely
        const displayKey = key.padEnd(30);
        console.log(`   ${displayKey} ${sanitizedValue}`);
      }
    }
  });

  console.log('\n' + '━'.repeat(50));
  console.log('✨ Tip: Run "npm run dev" to start development server');
  console.log('━'.repeat(50) + '\n');
} else {
  console.log('\n⚠️  Environment file not found!\n');
  console.log('Run the following command to create it:');
  console.log('   cp .env.example .env.development\n');
  console.log('━'.repeat(50) + '\n');
}
