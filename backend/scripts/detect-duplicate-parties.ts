/**
 * Detección de clientes y proveedores duplicados.
 *
 * Contexto
 * --------
 * Los asesores duplican clientes a propósito: el dueño del cliente se refleja en
 * `ClientAdvisor` y de ahí cuelga la atribución de la venta, así que cuando un
 * cliente ya existe pero pertenece a otro asesor, volver a crearlo es el camino
 * corto. En proveedores el duplicado es descuido de captura.
 *
 * Por qué este script no escribe nada
 * -----------------------------------
 * Coincidir por documento NO implica ser el mismo cliente. En producción hay
 * cédulas compartidas por personas distintas ("Angelica Pachon" / "Paola Pachon",
 * "Martha Inés Ramírez" / "SEMTEC"). Un merge automático borraría datos buenos.
 * Por eso la detección y la fusión viven en scripts separados: este no tiene
 * una sola sentencia de escritura, así que ningún flag mal escrito puede tocar
 * producción. La fusión la hace `merge-duplicate-parties.ts` sobre el CSV que
 * un humano revisó.
 *
 * Uso
 * ---
 *   npx ts-node scripts/detect-duplicate-parties.ts                    # .env.development
 *   npx ts-node scripts/detect-duplicate-parties.ts --env=staging
 *   npx ts-node scripts/detect-duplicate-parties.ts --env=production --entity=clients
 *
 * Opciones
 *   --env=<nombre>    archivo .env.<nombre> del que leer DATABASE_URL
 *   --entity=clients|suppliers|both   (default: both)
 *   --tier=ALTA|ALL   filtra el reporte por nivel de confianza (default: ALL)
 *
 * Salida
 *   scripts/.merge-reports/<entidad>-<env>-<timestamp>.csv   editable por el revisor
 *   scripts/.merge-reports/<entidad>-<env>-<timestamp>.md    misma info, legible
 */
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from '../src/generated/prisma';
import {
  docCore,
  levenshtein,
  nameCore,
  normDoc,
  normName,
} from '../src/common/utils/normalize.util';

const ENV =
  process.argv.find((a) => a.startsWith('--env='))?.split('=')[1] ?? 'development';
const ENTITY =
  process.argv.find((a) => a.startsWith('--entity='))?.split('=')[1] ?? 'both';
const TIER_FILTER =
  process.argv.find((a) => a.startsWith('--tier='))?.split('=')[1] ?? 'ALL';

const REPORT_DIR = path.resolve(__dirname, '.merge-reports');

export type Tier = 'ALTA' | 'MEDIA' | 'BAJA' | 'BAJA_FUZZY';

/** Orden de severidad: el grupo se queda con el nivel más fuerte que lo justifica. */
const TIER_RANK: Record<Tier, number> = {
  ALTA: 3,
  MEDIA: 2,
  BAJA: 1,
  BAJA_FUZZY: 0,
};

export interface PartyRow {
  id: string;
  name: string;
  nit: string | null;
  cedula: string | null;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: Date;
  orders: number;
  quotes: number;
  dtf: number;
  prospects: number;
  advisors: string[];
}

export interface DuplicateGroup {
  groupId: string;
  entity: 'clients' | 'suppliers';
  tier: Tier;
  reason: string;
  members: PartyRow[];
  winnerId: string;
  /** Huella del grupo al momento de detectar: el merge aborta si cambió. */
  hash: string;
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

/**
 * Huella estable de un grupo: ids ordenados + `updatedAt` de cada miembro.
 * Si alguien edita uno de esos registros entre la detección y la fusión, el
 * merge lo detecta y salta el grupo en vez de aplicar decisiones sobre datos viejos.
 */
export function groupHash(members: { id: string; updatedAt: Date }[]): string {
  const payload = [...members]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((m) => `${m.id}:${m.updatedAt.toISOString()}`)
    .join('|');
  return crypto.createHash('sha1').update(payload).digest('hex').slice(0, 12);
}

/**
 * Ganador propuesto: el que concentra la historia real.
 *
 * Se prefiere por volumen de referencias antes que por antigüedad porque el
 * registro más viejo suele ser un stub sin órdenes; ganar por volumen deja
 * menos filas que repuntar y menos riesgo.
 */
function pickWinner(members: PartyRow[]): string {
  const score = (r: PartyRow) => r.orders + r.quotes + r.dtf + r.prospects;
  const filled = (r: PartyRow) =>
    [r.nit, r.cedula, r.email, r.phone].filter(Boolean).length;

  return [...members].sort((a, b) => {
    if (score(b) !== score(a)) return score(b) - score(a);
    if (a.createdAt.getTime() !== b.createdAt.getTime()) {
      return a.createdAt.getTime() - b.createdAt.getTime();
    }
    return filled(b) - filled(a);
  })[0].id;
}

/**
 * Agrupa por llaves exactas (documento y nombre) y luego añade una pasada difusa
 * sobre `nameCore` para las erratas de digitación.
 *
 * Un mismo registro puede caer en varias llaves (mismo documento que A, mismo
 * nombre que B). Se unen con union-find para que el grupo resultante sea la
 * componente conexa completa y no queden fusiones parciales inconsistentes.
 */
function buildGroups(
  entity: 'clients' | 'suppliers',
  rows: (PartyRow & { updatedAt: Date })[],
): DuplicateGroup[] {
  const parent = new Map<string, string>(rows.map((r) => [r.id, r.id]));
  const find = (x: string): string => {
    let root = x;
    while (parent.get(root) !== root) root = parent.get(root)!;
    // Compresión de camino: mantiene barato el find en grupos grandes.
    let cur = x;
    while (parent.get(cur) !== root) {
      const next = parent.get(cur)!;
      parent.set(cur, root);
      cur = next;
    }
    return root;
  };
  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };

  /** Por qué quedó unido cada par, para poder explicar el nivel después. */
  const reasons = new Map<string, Set<string>>();
  const addReason = (id: string, reason: string) => {
    if (!reasons.has(id)) reasons.set(id, new Set());
    reasons.get(id)!.add(reason);
  };

  const byDoc = new Map<string, typeof rows>();
  const byName = new Map<string, typeof rows>();
  const byCore = new Map<string, typeof rows>();

  for (const r of rows) {
    // En proveedores el NIT no participa: los placeholders `1111...` unirían a
    // 37 empresas sin relación (ACUEDUCTO, ETB, TIGO...).
    const doc = entity === 'clients' ? docCore(r.nit, r.cedula) : '';
    if (doc) {
      if (!byDoc.has(doc)) byDoc.set(doc, []);
      byDoc.get(doc)!.push(r);
    }
    const nn = normName(r.name);
    if (nn) {
      if (!byName.has(nn)) byName.set(nn, []);
      byName.get(nn)!.push(r);
    }
    const nc = nameCore(r.name);
    if (nc) {
      if (!byCore.has(nc)) byCore.set(nc, []);
      byCore.get(nc)!.push(r);
    }
  }

  for (const bucket of byDoc.values()) {
    if (bucket.length < 2) continue;
    for (let i = 1; i < bucket.length; i++) union(bucket[0].id, bucket[i].id);
    for (const r of bucket) addReason(r.id, 'doc');
  }
  for (const bucket of byName.values()) {
    if (bucket.length < 2) continue;
    for (let i = 1; i < bucket.length; i++) union(bucket[0].id, bucket[i].id);
    for (const r of bucket) addReason(r.id, 'name');
  }
  for (const bucket of byCore.values()) {
    if (bucket.length < 2) continue;
    for (let i = 1; i < bucket.length; i++) union(bucket[0].id, bucket[i].id);
    for (const r of bucket) addReason(r.id, 'core');
  }

  // Pasada difusa: solo entre nombres distintos, para erratas tipo "QURVEDO".
  // Es O(n²) sobre las claves únicas, no sobre las filas — con ~900 clientes son
  // menos de medio millón de comparaciones acotadas, del orden de milisegundos.
  const coreKeys = [...byCore.keys()];
  for (let i = 0; i < coreKeys.length; i++) {
    for (let j = i + 1; j < coreKeys.length; j++) {
      const a = coreKeys[i];
      const b = coreKeys[j];
      // Nombres muy cortos con 2 ediciones de diferencia son ruido puro.
      if (Math.min(a.length, b.length) < 8) continue;
      if (levenshtein(a, b, 2) <= 2) {
        union(byCore.get(a)![0].id, byCore.get(b)![0].id);
        for (const r of [...byCore.get(a)!, ...byCore.get(b)!]) {
          addReason(r.id, 'fuzzy');
        }
      }
    }
  }

  const clusters = new Map<string, (PartyRow & { updatedAt: Date })[]>();
  for (const r of rows) {
    const root = find(r.id);
    if (!clusters.has(root)) clusters.set(root, []);
    clusters.get(root)!.push(r);
  }

  const groups: DuplicateGroup[] = [];
  let seq = 0;
  for (const members of clusters.values()) {
    if (members.length < 2) continue;

    const docs = new Set(members.map((m) => docCore(m.nit, m.cedula)).filter(Boolean));
    const names = new Set(members.map((m) => normName(m.name)));
    const cores = new Set(members.map((m) => nameCore(m.name)));

    // El documento solo es señal fuerte si además el nombre coincide: es lo que
    // separa "DM PROMOCIONALES"/"DM PROMOCIONALES SAS" de "Angelica"/"Paola Pachon".
    const sameDoc = entity === 'clients' && docs.size === 1 && docs.has(
      docCore(members[0].nit, members[0].cedula),
    );
    const sameName = names.size === 1;
    const sameCore = cores.size === 1;

    let tier: Tier;
    let reason: string;
    if (sameDoc && (sameName || sameCore)) {
      tier = 'ALTA';
      reason = 'documento y nombre coinciden';
    } else if (sameDoc) {
      tier = 'MEDIA';
      reason = 'coincide el documento, difieren los nombres';
    } else if (sameName || sameCore) {
      tier = 'BAJA';
      reason = 'coincide el nombre, difieren los documentos';
    } else {
      tier = 'BAJA_FUZZY';
      reason = 'nombres parecidos (posible errata)';
    }

    // Un grupo unido solo por la pasada difusa nunca es de alta confianza.
    const onlyFuzzy = members.every(
      (m) => reasons.get(m.id)?.size === 1 && reasons.get(m.id)?.has('fuzzy'),
    );
    if (onlyFuzzy && TIER_RANK[tier] > TIER_RANK['BAJA_FUZZY']) {
      tier = 'BAJA_FUZZY';
      reason = 'nombres parecidos (posible errata)';
    }

    const ordered = [...members].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );

    groups.push({
      groupId: `${entity === 'clients' ? 'C' : 'P'}${String(++seq).padStart(3, '0')}`,
      entity,
      tier,
      reason,
      members: ordered,
      winnerId: pickWinner(ordered),
      hash: groupHash(ordered),
    });
  }

  const rank = (g: DuplicateGroup) => TIER_RANK[g.tier];
  return groups.sort((a, b) => rank(b) - rank(a) || a.groupId.localeCompare(b.groupId));
}

async function loadClients(): Promise<(PartyRow & { updatedAt: Date })[]> {
  const rows = await prisma.client.findMany({
    // Solo activos: los perdedores de una fusión anterior quedan con
    // `isActive = false`, y volver a listarlos haría que cada corrida
    // reportara de nuevo grupos ya resueltos.
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      nit: true,
      cedula: true,
      email: true,
      phone: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      advisors: { select: { advisor: { select: { username: true } } } },
      _count: {
        select: { orders: true, quotes: true, dtfRecords: true, prospects: true },
      },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    nit: r.nit,
    cedula: r.cedula,
    email: r.email,
    phone: r.phone,
    isActive: r.isActive,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    orders: r._count.orders,
    quotes: r._count.quotes,
    dtf: r._count.dtfRecords,
    prospects: r._count.prospects,
    advisors: r.advisors
      .map((a) => a.advisor.username)
      .filter((u): u is string => Boolean(u)),
  }));
}

async function loadSuppliers(): Promise<(PartyRow & { updatedAt: Date })[]> {
  const rows = await prisma.supplier.findMany({
    // Igual que en clientes: los ya retirados no vuelven al reporte.
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      nit: true,
      email: true,
      phone: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { expenseOrderItems: true, accountsPayable: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    nit: r.nit,
    cedula: null,
    email: r.email,
    phone: r.phone,
    isActive: r.isActive,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    // Se reutilizan las columnas del CSV: en proveedores "ordenes" son ítems de OG
    // y "cotizaciones" son cuentas por pagar.
    orders: r._count.expenseOrderItems,
    quotes: r._count.accountsPayable,
    dtf: 0,
    prospects: 0,
    advisors: [],
  }));
}

const csvCell = (v: unknown) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

function writeCsv(groups: DuplicateGroup[], file: string) {
  const header = [
    'group_id',
    'tier',
    'entity',
    'hash',
    'decision',
    'is_winner',
    'id',
    'name',
    'nit',
    'cedula',
    'email',
    'phone',
    'created_at',
    'orders',
    'quotes',
    'dtf',
    'prospects',
    'advisors',
    'reason',
  ];

  const lines = [header.join(',')];
  for (const g of groups) {
    for (const m of g.members) {
      lines.push(
        [
          g.groupId,
          g.tier,
          g.entity,
          g.hash,
          // Solo el nivel ALTA llega preaprobado. MEDIA y BAJA nacen en OMITIR:
          // aprobarlos exige un acto deliberado del revisor.
          g.tier === 'ALTA' ? 'FUSIONAR' : 'OMITIR',
          m.id === g.winnerId ? 'X' : '',
          m.id,
          m.name,
          m.nit,
          m.cedula,
          m.email,
          m.phone,
          m.createdAt.toISOString().slice(0, 10),
          m.orders,
          m.quotes,
          m.dtf,
          m.prospects,
          m.advisors.join(' / '),
          g.reason,
        ]
          .map(csvCell)
          .join(','),
      );
    }
  }
  fs.writeFileSync(file, lines.join('\n') + '\n', 'utf8');
}

function writeMarkdown(
  groups: DuplicateGroup[],
  entity: string,
  file: string,
) {
  const out: string[] = [
    `# Duplicados detectados — ${entity} (${ENV})`,
    '',
    `Generado: ${new Date().toISOString()}`,
    '',
    'Revisa cada grupo y marca en el CSV la columna `decision` como `FUSIONAR` u `OMITIR`.',
    'La `X` de `is_winner` señala el registro que sobrevive; muévela si prefieres otro.',
    '',
  ];

  for (const g of groups) {
    out.push(`## ${g.groupId} — ${g.tier} (${g.reason})`);
    out.push('');
    out.push('| | Nombre | NIT | Cédula | Creado | OP | Cot | DTF | Asesores |');
    out.push('|---|---|---|---|---|---|---|---|---|');
    for (const m of g.members) {
      out.push(
        `| ${m.id === g.winnerId ? '**GANADOR**' : 'fusionar'} | ${m.name} | ${m.nit ?? ''} | ` +
          `${m.cedula ?? ''} | ${m.createdAt.toISOString().slice(0, 10)} | ${m.orders} | ` +
          `${m.quotes} | ${m.dtf} | ${m.advisors.join(' / ')} |`,
      );
    }
    out.push('');
  }
  fs.writeFileSync(file, out.join('\n'), 'utf8');
}

function summarize(groups: DuplicateGroup[], label: string) {
  console.log(`\n=== ${label} ===`);
  if (groups.length === 0) {
    console.log('  Sin duplicados detectados.');
    return;
  }
  const byTier = new Map<Tier, number>();
  let rows = 0;
  for (const g of groups) {
    byTier.set(g.tier, (byTier.get(g.tier) ?? 0) + 1);
    rows += g.members.length;
  }
  console.log(`  ${groups.length} grupos, ${rows} registros involucrados`);
  for (const tier of ['ALTA', 'MEDIA', 'BAJA', 'BAJA_FUZZY'] as Tier[]) {
    if (byTier.get(tier)) console.log(`    ${tier.padEnd(11)} ${byTier.get(tier)} grupos`);
  }
  console.log('');
  for (const g of groups) {
    const winner = g.members.find((m) => m.id === g.winnerId)!;
    console.log(
      `  ${g.groupId}  ${g.tier.padEnd(11)} ${g.members.length} regs  → "${winner.name}"  (${g.reason})`,
    );
    for (const m of g.members) {
      const mark = m.id === g.winnerId ? '✓' : ' ';
      console.log(
        `      ${mark} ${m.name.padEnd(42).slice(0, 42)} ` +
          `doc:${(m.nit ?? m.cedula ?? '-').padEnd(14)} ` +
          `refs:${String(m.orders + m.quotes + m.dtf + m.prospects).padStart(3)}  ` +
          `${m.advisors.join('/')}`,
      );
    }
  }
}

async function run(entity: 'clients' | 'suppliers', stamp: string) {
  const rows = entity === 'clients' ? await loadClients() : await loadSuppliers();
  let groups = buildGroups(entity, rows);
  if (TIER_FILTER !== 'ALL') {
    groups = groups.filter((g) => g.tier === TIER_FILTER);
  }

  const label = entity === 'clients' ? 'CLIENTES' : 'PROVEEDORES';
  console.log(`\n${label}: ${rows.length} registros analizados.`);
  summarize(groups, label);

  if (groups.length === 0) return;

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const base = path.join(REPORT_DIR, `${entity}-${ENV}-${stamp}`);
  writeCsv(groups, `${base}.csv`);
  writeMarkdown(groups, label.toLowerCase(), `${base}.md`);
  console.log(`\n  Reporte: ${path.relative(process.cwd(), base)}.csv`);
  console.log(`           ${path.relative(process.cwd(), base)}.md`);
}

async function main() {
  console.log(`Ambiente: ${ENV}`);
  console.log('=== SOLO LECTURA — este script no modifica la base ===');

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

  if (ENTITY === 'clients' || ENTITY === 'both') await run('clients', stamp);
  if (ENTITY === 'suppliers' || ENTITY === 'both') await run('suppliers', stamp);

  console.log(
    '\nSiguiente paso: revisa el CSV (columnas `decision` e `is_winner`) y ejecuta\n' +
      '  npx ts-node scripts/merge-duplicate-parties.ts --env=' +
      ENV +
      ' --report=<archivo.csv>',
  );
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
