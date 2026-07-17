import 'dotenv/config';
import { PrismaClient } from './src/generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
const p = new PrismaClient({ adapter: new PrismaPg(pool) });

(async () => {
  try {
    const roles: any = await p.role.findMany({
      include: { permissions: { include: { permission: true } } },
    });
    const out = roles
      .map((r: any) => {
        const names = r.permissions.map((rp: any) => rp.permission.name);
        return { role: r.name, canCreateDtf: names.includes('create_dtf') };
      })
      .filter((r: any) => r.canCreateDtf);
    console.log('ROLES_CREATE_DTF:', JSON.stringify(out));

    const users: any = await p.user.findMany({
      where: { role: { name: { in: out.map((r: any) => r.role) } }, isActive: true },
      select: { username: true, firstName: true, role: { select: { name: true } } },
      take: 8,
    });
    console.log('USERS:', JSON.stringify(users));

    // ¿Hay clientes con asesor asignado?
    const withAdvisor = await p.client.count({ where: { advisorId: { not: null } } });
    console.log('CLIENTS_WITH_ADVISOR:', withAdvisor);
  } catch (e: any) {
    console.error('ERR:', e.message);
  } finally {
    await p.$disconnect();
    await pool.end();
  }
})();
