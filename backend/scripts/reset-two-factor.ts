/**
 * Restablecimiento de emergencia del doble factor de un usuario.
 *
 * Contexto
 * --------
 * Desde la pantalla de Usuarios, un admin o gerencia restablece el doble
 * factor de otro (`POST /users/:id/2fa/reset`), pero nadie se lo restablece a
 * sí mismo. Si todos los que pueden hacerlo pierden el celular y los códigos
 * de respaldo, nadie entra: este script es la salida.
 *
 * Qué hace
 * --------
 * Lo mismo que el endpoint: borra el secreto, los códigos de respaldo y los
 * equipos de confianza, y cierra las sesiones del usuario. La próxima vez que
 * entre, si su rol lo exige, registra la app de nuevo.
 *
 * Uso
 * ---
 *   npx ts-node scripts/reset-two-factor.ts --env=production --username=gerencia
 *   npx ts-node scripts/reset-two-factor.ts --env=production --username=gerencia --apply
 *
 * Opciones
 *   --username=<usuario>  usuario a restablecer (exacto)
 *   --apply               escribe (por defecto solo simula)
 *   --env=<nombre>        archivo .env.<nombre> del que leer DATABASE_URL
 *
 * Es idempotente: si el usuario no tiene el doble factor, no cambia nada.
 */
import * as fs from 'fs';
import * as path from 'path';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from '../src/generated/prisma';

function arg(name: string): string | undefined {
  return process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
}

const APPLY = process.argv.includes('--apply');
const ENV = arg('env') ?? 'development';
const USERNAME = arg('username');

if (!USERNAME) {
  console.error('❌ Falta --username=<usuario>.');
  process.exit(1);
}

function resolveDatabaseUrl(): string {
  if (process.env.DATABASE_URL) {
    console.log(`Usando DATABASE_URL del entorno (no se lee .env.${ENV}).`);
    return process.env.DATABASE_URL;
  }
  const envPath = path.resolve(__dirname, '..', `.env.${ENV}`);
  if (!fs.existsSync(envPath)) {
    console.error(`❌ No se encontró ${envPath}`);
    process.exit(1);
  }
  const match = fs
    .readFileSync(envPath, 'utf8')
    .match(/^DATABASE_URL\s*=\s*['"]?([^'"\n]+?)['"]?\s*$/m);
  if (!match) {
    console.error(`❌ ${envPath} no define DATABASE_URL`);
    process.exit(1);
  }
  return match[1];
}

const pool = new Pool({ connectionString: resolveDatabaseUrl(), max: 2 });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  console.log(`→ [${ENV}] ${APPLY ? 'APLICANDO' : 'SIMULACIÓN (usa --apply para escribir)'}`);

  const user = await prisma.user.findUnique({
    where: { username: USERNAME },
    select: {
      id: true,
      username: true,
      twoFactorEnabled: true,
      twoFactorSecret: true,
      role: { select: { name: true } },
    },
  });
  if (!user) {
    console.error(`❌ No existe el usuario «${USERNAME}».`);
    process.exit(1);
  }

  const [backupCodes, trustedDevices] = await Promise.all([
    prisma.twoFactorBackupCode.count({ where: { userId: user.id } }),
    prisma.trustedDevice.count({ where: { userId: user.id, revokedAt: null } }),
  ]);

  console.log(
    `Usuario «${user.username}» (rol ${user.role.name}): doble factor ${user.twoFactorEnabled ? 'ACTIVO' : 'inactivo'}, ` +
      `${backupCodes} códigos de respaldo, ${trustedDevices} equipos de confianza.`,
  );

  if (!user.twoFactorEnabled && !user.twoFactorSecret && backupCodes === 0 && trustedDevices === 0) {
    console.log('✓ No hay nada que restablecer.');
    return;
  }
  if (!APPLY) {
    console.log('Simulación: no se escribió nada.');
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorEnabledAt: null,
        twoFactorLastUsedStep: null,
        twoFactorFailedAttempts: 0,
        twoFactorLockedUntil: null,
        refreshToken: null,
      },
    });
    await tx.twoFactorBackupCode.deleteMany({ where: { userId: user.id } });
    await tx.trustedDevice.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  });

  console.log(`✓ Doble factor de «${user.username}» restablecido y sesiones cerradas.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
