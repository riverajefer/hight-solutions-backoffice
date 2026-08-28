/**
 * =============================================================================
 * Prueba de notificaciones de WhatsApp
 * =============================================================================
 *
 * Dos modos:
 *
 *   1. --destinatarios (por defecto) — SOLO LECTURA, no envía nada.
 *      Muestra las cuentas con teléfono y la lista final de destinatarios
 *      después de deduplicar. Es la verificación directa del fix: si dos
 *      cuentas comparten celular, deben colapsar en un solo destinatario.
 *
 *   2. --enviar=<telefono> — envía UN mensaje real al número indicado.
 *      Usa `sendTemplateMessage` directo, así que NO crea WhatsappActionContext:
 *      los botones del mensaje quedan inertes y el webhook responde
 *      "no se encontró el contexto" si alguien los toca. No deja rastro en DB.
 *
 * Usage:
 *   npx ts-node scripts/whatsapp-test.ts                            # destinatarios en producción
 *   npx ts-node scripts/whatsapp-test.ts --env=development
 *   npx ts-node scripts/whatsapp-test.ts --permiso=approve_discounts
 *   npx ts-node scripts/whatsapp-test.ts --env=development --enviar=3001234567
 *
 * Nota: las credenciales de WhatsApp (WHATSAPP_ACCESS_TOKEN, etc.) solo están
 * en .env.development localmente; en staging/producción viven en Railway. Para
 * enviar con las credenciales de producción hay que correr el script allá.
 * =============================================================================
 */

import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from '../src/generated/prisma';
import { WhatsappService } from '../src/modules/whatsapp/whatsapp.service';

// --- Argumentos --------------------------------------------------------------

const args = process.argv.slice(2);
const getArg = (name: string): string | undefined => {
  const found = args.find((a) => a.startsWith(`--${name}=`));
  return found?.split('=').slice(1).join('=');
};

const ENV = getArg('env') || 'production';
const PERMISO = getArg('permiso');
const ENVIAR_A = getArg('enviar');

// --- Entorno -----------------------------------------------------------------

const envPath = path.resolve(__dirname, '..', `.env.${ENV}`);
if (!fs.existsSync(envPath)) {
  console.error(`❌ No se encontró ${envPath}`);
  process.exit(1);
}
dotenv.config({ path: envPath });

if (!process.env.DATABASE_URL) {
  console.error(`❌ .env.${ENV} no define DATABASE_URL`);
  process.exit(1);
}

// NODE_ENV decide qué plantilla de Meta se usa (prod usa nombres distintos).
process.env.NODE_ENV = ENV;

// --- Wiring mínimo -----------------------------------------------------------
// Se arma WhatsappService a mano en vez de levantar AppModule para no arrancar
// los cron de la app contra la base de producción.

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const configShim = {
  get: (key: string) =>
    ({
      'whatsapp.accessToken': process.env.WHATSAPP_ACCESS_TOKEN,
      'whatsapp.phoneNumberId': process.env.WHATSAPP_PHONE_NUMBER_ID,
      'whatsapp.apiVersion': process.env.WHATSAPP_API_VERSION,
      'whatsapp.actionSecret': process.env.WHATSAPP_ACTION_SECRET,
      'app.frontendUrl': process.env.FRONTEND_URL,
    })[key],
} as unknown as ConfigService;

const whatsapp = new WhatsappService(configShim, prisma as any);

// --- Modo 1: destinatarios ---------------------------------------------------

async function listarDestinatarios(): Promise<void> {
  const cuentas = PERMISO
    ? await prisma.user.findMany({
        where: {
          isActive: true,
          phone: { not: null },
          role: { permissions: { some: { permission: { name: PERMISO } } } },
        },
        select: { username: true, firstName: true, lastName: true, phone: true },
      })
    : await prisma.user.findMany({
        where: { isActive: true, phone: { not: null }, role: { name: 'admin' } },
        select: { username: true, firstName: true, lastName: true, phone: true },
      });

  const criterio = PERMISO ? `permiso "${PERMISO}"` : 'rol admin';
  console.log(`\n📇 Cuentas activas con teléfono (${criterio}): ${cuentas.length}\n`);
  for (const c of cuentas) {
    const nombre = [c.firstName, c.lastName].filter(Boolean).join(' ');
    console.log(`   ${(c.phone ?? '').padEnd(16)} ${c.username.padEnd(16)} ${nombre}`);
  }

  // Lista real que usa el código en producción.
  const destinatarios = PERMISO
    ? await whatsapp.getPhonesByPermission(PERMISO)
    : await whatsapp.getAdminPhones();

  console.log(`\n📤 Destinatarios tras deduplicar: ${destinatarios.length}\n`);
  for (const phone of destinatarios) {
    const dueños = cuentas
      .filter((c) => normalizar(c.phone!) === phone)
      .map((c) => c.username);
    const marca = dueños.length > 1 ? `  ⚠️  compartido por ${dueños.length} cuentas` : '';
    console.log(`   ${phone.padEnd(16)} ${dueños.join(', ')}${marca}`);
  }

  const ahorro = cuentas.length - destinatarios.length;
  console.log(
    ahorro > 0
      ? `\n✅ Se evitan ${ahorro} mensaje(s) duplicado(s) por notificación.\n`
      : `\n✅ No hay números compartidos: 1 mensaje por persona.\n`,
  );
}

/** Misma normalización que WhatsappService, solo para agrupar en el reporte. */
function normalizar(phone: string): string {
  let cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) cleaned = cleaned.slice(1);
  if (cleaned.length === 10 && cleaned.startsWith('3')) cleaned = `57${cleaned}`;
  return cleaned;
}

// --- Modo 2: enviar ----------------------------------------------------------

async function enviarPrueba(telefono: string): Promise<void> {
  if (!process.env.WHATSAPP_ACCESS_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID) {
    console.error(
      `\n❌ .env.${ENV} no tiene credenciales de WhatsApp.` +
        `\n   Localmente solo .env.development las tiene; para probar con las de` +
        `\n   producción hay que correr este script en Railway.\n`,
    );
    process.exit(1);
  }

  // Plantilla real del entorno (prod y dev usan nombres distintos).
  const template = (whatsapp as any).getApprovalTemplateName() as string;

  console.log(`\n📨 Enviando plantilla "${template}" a ${telefono} (entorno ${ENV})...`);

  const messageId = await whatsapp.sendTemplateMessage(
    telefono,
    template,
    [
      'Mensaje de prueba',
      'script whatsapp-test',
      'verificar el envío de notificaciones',
      'prueba técnica, no requiere acción',
    ],
    'es_CO',
    [{ index: 0, text: 'PRUEBA' }],
  );

  if (messageId) {
    console.log(`\n✅ Enviado. messageId=${messageId}`);
    console.log(
      `   Los botones no hacen nada: no se guardó contexto, así que el webhook` +
        `\n   responde "no se encontró el contexto" si alguien los toca.\n`,
    );
  } else {
    console.error(`\n❌ No se pudo enviar. Revisa el log de arriba para el error de Meta.\n`);
    process.exitCode = 1;
  }
}

// --- Main --------------------------------------------------------------------

async function main(): Promise<void> {
  const dbHost = process.env.DATABASE_URL!.split('@')[1]?.split('/')[0] ?? 'N/A';
  console.log(`\n🌍 Entorno: ${ENV}   💾 DB: ${dbHost}`);

  if (ENVIAR_A) {
    await enviarPrueba(ENVIAR_A);
  } else {
    await listarDestinatarios();
  }
}

main()
  .catch((error) => {
    console.error('\n❌ Error:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
