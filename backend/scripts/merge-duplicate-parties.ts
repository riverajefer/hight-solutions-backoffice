/**
 * Fusión de clientes y proveedores duplicados, sobre un reporte ya revisado.
 *
 * Contexto
 * --------
 * Este script es la segunda mitad de `detect-duplicate-parties.ts`. No decide
 * nada por su cuenta: solo aplica lo que un humano marcó como `FUSIONAR` en el
 * CSV. La separación es a propósito — coincidir por documento no implica ser el
 * mismo cliente (en producción hay cédulas compartidas por personas distintas),
 * así que ninguna fusión ocurre sin revisión.
 *
 * Qué hace con los asesores
 * -------------------------
 * El sobreviviente queda con la UNIÓN de los asesores de todos los duplicados.
 * El modelo `ClientAdvisor` ya es N↔N, así que nadie pierde su cliente ni la
 * atribución de sus ventas. Ese era el incentivo detrás del duplicado.
 *
 * Por qué los perdedores no se borran
 * -----------------------------------
 * Se marcan `isActive = false` y se les anula el email (el índice único de
 * `email` admite muchos NULL, así que liberarlo evita que el email quede
 * secuestrado por un registro retirado). El valor original queda en `oldData`
 * de la auditoría. El borrado duro existe pero detrás de `--hard-delete`.
 *
 * Uso
 * ---
 *   npx ts-node scripts/merge-duplicate-parties.ts --report=scripts/.merge-reports/x.csv
 *   npx ts-node scripts/merge-duplicate-parties.ts --env=staging --report=... --apply
 *
 * Opciones
 *   --report=<ruta>  CSV revisado (obligatorio)
 *   --apply          escribe (por defecto solo simula)
 *   --env=<nombre>   archivo .env.<nombre> del que leer DATABASE_URL
 *   --hard-delete    borra los perdedores en vez de desactivarlos
 *
 * Es idempotente: un grupo cuyos perdedores ya están retirados y sin
 * referencias se salta.
 */
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient, Prisma } from '../src/generated/prisma';

const APPLY = process.argv.includes('--apply');
const HARD_DELETE = process.argv.includes('--hard-delete');
const ENV =
  process.argv.find((a) => a.startsWith('--env='))?.split('=')[1] ?? 'development';
const REPORT = process.argv.find((a) => a.startsWith('--report='))?.split('=')[1];

if (!REPORT) {
  console.error(
    '❌ Falta --report=<archivo.csv>. Genéralo primero con detect-duplicate-parties.ts',
  );
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

// ── Lectura del CSV ──────────────────────────────────────────────────────────

/** Parser mínimo con soporte de comillas: los nombres traen comas. */
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else if (ch !== '\r') {
      cell += ch;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  const [header, ...body] = rows.filter((r) => r.some((c) => c.trim() !== ''));
  return body.map((r) =>
    Object.fromEntries(header.map((h, i) => [h.trim(), (r[i] ?? '').trim()])),
  );
}

interface PlanGroup {
  groupId: string;
  entity: 'clients' | 'suppliers';
  hash: string;
  winnerId: string;
  loserIds: string[];
  names: Map<string, string>;
}

/** Motivos por los que un grupo no se aplica; se reportan, no se ocultan. */
type Rejection = { groupId: string; why: string };

function readPlan(file: string): { groups: PlanGroup[]; rejected: Rejection[] } {
  const rows = parseCsv(fs.readFileSync(file, 'utf8'));
  const byGroup = new Map<string, Record<string, string>[]>();
  for (const r of rows) {
    if (!r.group_id) continue;
    if (!byGroup.has(r.group_id)) byGroup.set(r.group_id, []);
    byGroup.get(r.group_id)!.push(r);
  }

  const groups: PlanGroup[] = [];
  const rejected: Rejection[] = [];

  for (const [groupId, members] of byGroup) {
    const decisions = new Set(members.map((m) => m.decision.toUpperCase()));

    if (!decisions.has('FUSIONAR')) continue; // omitido a propósito, no es un error
    if (decisions.size > 1) {
      rejected.push({
        groupId,
        why: `decisiones mezcladas (${[...decisions].join(', ')}): marca todo el grupo igual`,
      });
      continue;
    }

    const winners = members.filter((m) => m.is_winner.toUpperCase() === 'X');
    if (winners.length !== 1) {
      rejected.push({
        groupId,
        why: `debe haber exactamente un ganador, hay ${winners.length}`,
      });
      continue;
    }

    const entity = members[0].entity as 'clients' | 'suppliers';
    if (entity !== 'clients' && entity !== 'suppliers') {
      rejected.push({ groupId, why: `entidad desconocida "${members[0].entity}"` });
      continue;
    }

    const loserIds = members.filter((m) => m.id !== winners[0].id).map((m) => m.id);
    if (loserIds.length === 0) {
      rejected.push({ groupId, why: 'el grupo solo tiene al ganador, no hay nada que fusionar' });
      continue;
    }

    groups.push({
      groupId,
      entity,
      hash: members[0].hash,
      winnerId: winners[0].id,
      loserIds,
      names: new Map(members.map((m) => [m.id, m.name])),
    });
  }

  return { groups, rejected };
}

/** Misma fórmula que el detector: si difiere, alguien editó los registros. */
function groupHash(members: { id: string; updatedAt: Date }[]): string {
  const payload = [...members]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((m) => `${m.id}:${m.updatedAt.toISOString()}`)
    .join('|');
  return crypto.createHash('sha1').update(payload).digest('hex').slice(0, 12);
}

// ── Fusión ───────────────────────────────────────────────────────────────────

/** Campos que se rellenan en el ganador si los tiene vacíos. */
const CLIENT_FILLABLE = [
  'nit',
  'cedula',
  'email',
  'phone',
  'landlinePhone',
  'address',
  'manager',
  'encargado',
  'specialCondition',
] as const;

const SUPPLIER_FILLABLE = [
  'nit',
  'email',
  'phone',
  'landlinePhone',
  'address',
  'encargado',
] as const;

/**
 * Toma del primer perdedor (por antigüedad) el valor de cada campo que el
 * ganador tenga vacío. Nunca sobrescribe un dato existente del ganador.
 */
function buildEnrichment(
  winner: Record<string, unknown>,
  losers: Record<string, unknown>[],
  fields: readonly string[],
): Record<string, string> {
  const patch: Record<string, string> = {};
  for (const field of fields) {
    const current = winner[field];
    if (current !== null && current !== undefined && String(current).trim() !== '') {
      continue;
    }
    for (const loser of losers) {
      const candidate = loser[field];
      if (candidate !== null && candidate !== undefined && String(candidate).trim() !== '') {
        patch[field] = String(candidate);
        break;
      }
    }
  }
  return patch;
}

interface MergeStats {
  [table: string]: number;
}

async function mergeClientGroup(g: PlanGroup): Promise<MergeStats> {
  const stats: MergeStats = {};

  await prisma.$transaction(
    async (tx) => {
      // `FOR UPDATE` bloquea las filas del grupo durante la transacción: nadie
      // puede editar estos clientes mientras se repunta su historia.
      await tx.$executeRaw`SELECT id FROM clients WHERE id IN (${Prisma.join([g.winnerId, ...g.loserIds])}) FOR UPDATE`;

      // El hash se recalcula leyendo por Prisma, no por SQL crudo: `updated_at`
      // es `timestamp without time zone` y el driver de pg lo interpreta distinto
      // que Prisma, así que mezclar ambos daría un falso "cambió desde la detección".
      const all = await tx.client.findMany({
        where: { id: { in: [g.winnerId, ...g.loserIds] } },
        orderBy: { createdAt: 'asc' },
      });

      if (all.length !== g.loserIds.length + 1) {
        throw new Error(
          `se esperaban ${g.loserIds.length + 1} clientes, la base tiene ${all.length}`,
        );
      }

      const currentHash = groupHash(all);
      if (currentHash !== g.hash) {
        throw new Error(
          `los registros cambiaron desde la detección (${g.hash} → ${currentHash}); vuelve a correr el detector`,
        );
      }

      const winner = all.find((c) => c.id === g.winnerId)!;
      const losers = all.filter((c) => c.id !== g.winnerId);

      // La auditoría se escribe DENTRO de la transacción: si algo falla más
      // abajo, el rollback también la borra y no queda rastro de una fusión
      // que nunca ocurrió.
      for (const loser of losers) {
        await tx.auditLog.create({
          data: {
            model: 'Client',
            action: 'MERGE',
            recordId: loser.id,
            oldData: loser as unknown as Prisma.InputJsonValue,
            metadata: {
              winnerId: g.winnerId,
              groupId: g.groupId,
              script: 'merge-duplicate-parties',
            },
          },
        });
      }
      await tx.auditLog.create({
        data: {
          model: 'Client',
          action: 'MERGE_TARGET',
          recordId: g.winnerId,
          oldData: winner as unknown as Prisma.InputJsonValue,
          metadata: {
            groupId: g.groupId,
            mergedIds: g.loserIds,
            script: 'merge-duplicate-parties',
          },
        },
      });

      // 1) FKs RESTRICT primero: sin esto no se puede tocar la fila perdedora.
      const where = { clientId: { in: g.loserIds } };
      stats.orders = (await tx.order.updateMany({ where, data: { clientId: g.winnerId } })).count;
      stats.quotes = (await tx.quote.updateMany({ where, data: { clientId: g.winnerId } })).count;
      stats.dtfRecords = (
        await tx.dtfRecord.updateMany({ where, data: { clientId: g.winnerId } })
      ).count;
      stats.prospects = (
        await tx.prospect.updateMany({ where, data: { clientId: g.winnerId } })
      ).count;

      // 2) Unión de asesores. El ON CONFLICT es obligatorio: el @@unique
      //    ([clientId, advisorId]) revienta cuando ambos duplicados comparten
      //    un asesor, que es justo el caso de los clientes reasignados.
      const inserted = await tx.$executeRaw`
        INSERT INTO client_advisors (id, client_id, advisor_id, created_at)
        SELECT gen_random_uuid(), ${g.winnerId}, advisor_id, created_at
        FROM client_advisors
        WHERE client_id IN (${Prisma.join(g.loserIds)})
        ON CONFLICT (client_id, advisor_id) DO NOTHING
      `;
      stats.advisorsAdded = inserted;
      stats.advisorLinksRemoved = (
        await tx.clientAdvisor.deleteMany({ where: { clientId: { in: g.loserIds } } })
      ).count;

      // 3) Solicitudes de asesor: las pendientes se repuntan al ganador salvo
      //    que ya exista una equivalente; las resueltas ya no aplican al
      //    duplicado y se descartan.
      const pending = await tx.clientAdvisorRequest.findMany({
        where: { clientId: { in: g.loserIds }, status: 'PENDING' },
      });
      let movedRequests = 0;
      for (const req of pending) {
        const clash = await tx.clientAdvisorRequest.findFirst({
          where: {
            clientId: g.winnerId,
            requestedAdvisorId: req.requestedAdvisorId,
            status: 'PENDING',
          },
        });
        if (clash) {
          await tx.clientAdvisorRequest.delete({ where: { id: req.id } });
        } else {
          await tx.clientAdvisorRequest.update({
            where: { id: req.id },
            data: { clientId: g.winnerId },
          });
          movedRequests++;
        }
      }
      stats.advisorRequestsMoved = movedRequests;
      stats.advisorRequestsDropped = (
        await tx.clientAdvisorRequest.deleteMany({ where: { clientId: { in: g.loserIds } } })
      ).count;

      // 4) Enriquecer al ganador con los datos que le faltan.
      const patch = buildEnrichment(
        winner as unknown as Record<string, unknown>,
        losers as unknown as Record<string, unknown>[],
        CLIENT_FILLABLE,
      );
      // El email del ganador solo puede llenarse si el perdedor ya lo liberó;
      // se aplica después de retirarlo, más abajo.
      const emailPatch = patch.email;
      delete patch.email;
      if (Object.keys(patch).length > 0) {
        await tx.client.update({ where: { id: g.winnerId }, data: patch });
      }
      stats.fieldsFilled = Object.keys(patch).length;

      // 5) Guarda: nada puede quedar apuntando a un perdedor. Si esta cuenta no
      //    da cero, la transacción se revierte entera.
      const remaining =
        (await tx.order.count({ where })) +
        (await tx.quote.count({ where })) +
        (await tx.dtfRecord.count({ where })) +
        (await tx.prospect.count({ where })) +
        (await tx.clientAdvisor.count({ where })) +
        (await tx.clientAdvisorRequest.count({ where }));
      if (remaining !== 0) {
        throw new Error(`quedaron ${remaining} referencias a los perdedores`);
      }

      // 6) Retirar a los perdedores.
      if (HARD_DELETE) {
        await tx.client.deleteMany({ where: { id: { in: g.loserIds } } });
      } else {
        // Se anula el email para liberar el índice único: si no, el email queda
        // secuestrado por un registro que ya nadie ve.
        await tx.client.updateMany({
          where: { id: { in: g.loserIds } },
          data: { isActive: false, email: null },
        });
      }

      if (emailPatch) {
        await tx.client.update({
          where: { id: g.winnerId },
          data: { email: emailPatch },
        });
        stats.fieldsFilled++;
      }
    },
    { timeout: 120_000, maxWait: 30_000 },
  );

  return stats;
}

async function mergeSupplierGroup(g: PlanGroup): Promise<MergeStats> {
  const stats: MergeStats = {};

  await prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT id FROM suppliers WHERE id IN (${Prisma.join([g.winnerId, ...g.loserIds])}) FOR UPDATE`;

      // Igual que en clientes: el hash se recalcula por Prisma para que el
      // parseo de `updated_at` sea idéntico al del detector.
      const all = await tx.supplier.findMany({
        where: { id: { in: [g.winnerId, ...g.loserIds] } },
        orderBy: { createdAt: 'asc' },
      });

      if (all.length !== g.loserIds.length + 1) {
        throw new Error(
          `se esperaban ${g.loserIds.length + 1} proveedores, la base tiene ${all.length}`,
        );
      }
      const currentHash = groupHash(all);
      if (currentHash !== g.hash) {
        throw new Error(
          `los registros cambiaron desde la detección (${g.hash} → ${currentHash}); vuelve a correr el detector`,
        );
      }

      const winner = all.find((c) => c.id === g.winnerId)!;
      const losers = all.filter((c) => c.id !== g.winnerId);

      for (const loser of losers) {
        await tx.auditLog.create({
          data: {
            model: 'Supplier',
            action: 'MERGE',
            recordId: loser.id,
            oldData: loser as unknown as Prisma.InputJsonValue,
            metadata: {
              winnerId: g.winnerId,
              groupId: g.groupId,
              script: 'merge-duplicate-parties',
            },
          },
        });
      }
      await tx.auditLog.create({
        data: {
          model: 'Supplier',
          action: 'MERGE_TARGET',
          recordId: g.winnerId,
          oldData: winner as unknown as Prisma.InputJsonValue,
          metadata: {
            groupId: g.groupId,
            mergedIds: g.loserIds,
            script: 'merge-duplicate-parties',
          },
        },
      });

      // Las dos FK de proveedores son SET NULL: hay que repuntarlas a mano o el
      // borrado dejaría ítems de OG y cuentas por pagar sin proveedor, en silencio.
      const where = { supplierId: { in: g.loserIds } };
      stats.expenseOrderItems = (
        await tx.expenseOrderItem.updateMany({ where, data: { supplierId: g.winnerId } })
      ).count;
      stats.accountsPayable = (
        await tx.accountPayable.updateMany({ where, data: { supplierId: g.winnerId } })
      ).count;

      const patch = buildEnrichment(
        winner as unknown as Record<string, unknown>,
        losers as unknown as Record<string, unknown>[],
        SUPPLIER_FILLABLE,
      );
      const emailPatch = patch.email;
      delete patch.email;
      if (Object.keys(patch).length > 0) {
        await tx.supplier.update({ where: { id: g.winnerId }, data: patch });
      }
      stats.fieldsFilled = Object.keys(patch).length;

      const remaining =
        (await tx.expenseOrderItem.count({ where })) +
        (await tx.accountPayable.count({ where }));
      if (remaining !== 0) {
        throw new Error(`quedaron ${remaining} referencias a los perdedores`);
      }

      if (HARD_DELETE) {
        await tx.supplier.deleteMany({ where: { id: { in: g.loserIds } } });
      } else {
        await tx.supplier.updateMany({
          where: { id: { in: g.loserIds } },
          data: { isActive: false, email: null },
        });
      }

      if (emailPatch) {
        await tx.supplier.update({
          where: { id: g.winnerId },
          data: { email: emailPatch },
        });
        stats.fieldsFilled++;
      }
    },
    { timeout: 120_000, maxWait: 30_000 },
  );

  return stats;
}

/** Conteo de lo que se movería, sin escribir nada. */
async function previewGroup(g: PlanGroup): Promise<MergeStats> {
  const stats: MergeStats = {};
  if (g.entity === 'clients') {
    const where = { clientId: { in: g.loserIds } };
    stats.orders = await prisma.order.count({ where });
    stats.quotes = await prisma.quote.count({ where });
    stats.dtfRecords = await prisma.dtfRecord.count({ where });
    stats.prospects = await prisma.prospect.count({ where });
    stats.advisorLinks = await prisma.clientAdvisor.count({ where });
    stats.advisorRequests = await prisma.clientAdvisorRequest.count({ where });
  } else {
    const where = { supplierId: { in: g.loserIds } };
    stats.expenseOrderItems = await prisma.expenseOrderItem.count({ where });
    stats.accountsPayable = await prisma.accountPayable.count({ where });
  }
  return stats;
}

const fmtStats = (s: MergeStats) =>
  Object.entries(s)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => `${k}=${v}`)
    .join(' ') || 'sin referencias que mover';

async function main() {
  console.log(`Ambiente: ${ENV}`);
  console.log(APPLY ? '=== MODO APLICAR ===' : '=== DRY-RUN (sin cambios) ===');
  console.log(`Reporte: ${REPORT}`);
  if (HARD_DELETE) console.log('⚠️  --hard-delete: los perdedores se BORRAN, no se desactivan.');

  const reportPath = path.resolve(REPORT!);
  if (!fs.existsSync(reportPath)) {
    console.error(`❌ No se encontró ${reportPath}`);
    process.exit(1);
  }

  const { groups, rejected } = readPlan(reportPath);

  if (rejected.length > 0) {
    console.log('\n⚠️  Grupos con el plan mal formado (se saltan):');
    for (const r of rejected) console.log(`   ${r.groupId}: ${r.why}`);
  }

  if (groups.length === 0) {
    console.log('\nNingún grupo marcado como FUSIONAR. Nada que hacer.');
    return;
  }

  console.log(`\n${groups.length} grupos marcados para fusionar.\n`);

  let ok = 0;
  const failures: Rejection[] = [];

  for (const g of groups) {
    const winnerName = g.names.get(g.winnerId) ?? g.winnerId;
    const label = `${g.groupId} [${g.entity}] → "${winnerName}" (absorbe ${g.loserIds.length})`;

    try {
      const stats = APPLY
        ? g.entity === 'clients'
          ? await mergeClientGroup(g)
          : await mergeSupplierGroup(g)
        : await previewGroup(g);
      console.log(`  ✔ ${label}`);
      console.log(`      ${fmtStats(stats)}`);
      ok++;
    } catch (e) {
      const why = e instanceof Error ? e.message : String(e);
      console.log(`  ✘ ${label}`);
      console.log(`      ${why}`);
      failures.push({ groupId: g.groupId, why });
    }
  }

  console.log(
    `\n${APPLY ? 'Fusionados' : 'Simulados'}: ${ok}/${groups.length} grupos.`,
  );
  if (failures.length > 0) {
    console.log(`Fallaron ${failures.length} (cada uno revirtió su propia transacción):`);
    for (const f of failures) console.log(`   ${f.groupId}: ${f.why}`);
    process.exitCode = 1;
  }
  if (!APPLY) {
    console.log('\nDry-run: no se escribió nada. Repite con --apply para aplicar.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
