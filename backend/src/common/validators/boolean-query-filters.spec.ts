import { ValidationPipe } from '@nestjs/common';
import { FilterOrdersDto } from '../../modules/orders/dto/filter-orders.dto';
import { FilterAccountPayableDto } from '../../modules/accounts-payable/dto/filter-account-payable.dto';
import { FilterClientsDto } from '../../modules/clients/dto/filter-clients.dto';
import { FilterCashMovementsDto } from '../../modules/cash-movement/dto/filter-cash-movements.dto';
import { FilterNotificationsDto } from '../../modules/notifications/dto/filter-notifications.dto';

/**
 * Todos los filtros booleanos que viajan por query string, en un solo lugar.
 *
 * En query string no hay booleanos: `?flag=false` llega como la cadena
 * `'false'`. El ValidationPipe corre con `enableImplicitConversion`, que
 * convierte esa cadena según el tipo declarado (`boolean`) **antes** de que
 * corra el `@Transform` del DTO — y `Boolean('false')` es `true`. El resultado
 * era que mandar `=false` daba exactamente lo mismo que mandar `=true`.
 *
 * Lo que lo arregla es `@Type(() => String)`: hace que la conversión implícita
 * deje pasar la cadena intacta para que el `@Transform` pueda leerla.
 *
 * El pipe se construye igual que en `main.ts`. Si alguien agrega un filtro
 * booleano nuevo, agréguelo también acá: el modo de fallar es silencioso, la
 * consulta no revienta, solo devuelve lo contrario de lo que se pidió.
 */
const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { enableImplicitConversion: true },
});

const parse = (metatype: any, query: Record<string, string>) =>
  pipe.transform(query, { type: 'query', metatype }) as Promise<any>;

const CASOS: Array<{ nombre: string; dto: any; campo: string }> = [
  { nombre: 'FilterOrdersDto.excludeWithWorkOrder', dto: FilterOrdersDto, campo: 'excludeWithWorkOrder' },
  { nombre: 'FilterOrdersDto.hasBalance', dto: FilterOrdersDto, campo: 'hasBalance' },
  { nombre: 'FilterOrdersDto.excludeAnulado', dto: FilterOrdersDto, campo: 'excludeAnulado' },
  { nombre: 'FilterAccountPayableDto.hasExpenseOrder', dto: FilterAccountPayableDto, campo: 'hasExpenseOrder' },
  { nombre: 'FilterClientsDto.includeInactive', dto: FilterClientsDto, campo: 'includeInactive' },
  { nombre: 'FilterCashMovementsDto.includeVoided', dto: FilterCashMovementsDto, campo: 'includeVoided' },
  { nombre: 'FilterNotificationsDto.isRead', dto: FilterNotificationsDto, campo: 'isRead' },
];

describe('Filtros booleanos en query string', () => {
  describe.each(CASOS)('$nombre', ({ dto, campo }) => {
    it('interpreta "false" como false', async () => {
      const parsed = await parse(dto, { [campo]: 'false' });

      expect(parsed[campo]).toBe(false);
    });

    it('interpreta "true" como true', async () => {
      const parsed = await parse(dto, { [campo]: 'true' });

      expect(parsed[campo]).toBe(true);
    });

    // Sin el filtro no se filtra. Que el ausente cayera en `false` convertiría
    // "todas" en "solo las del lado contrario".
    it('deja undefined cuando no se envía', async () => {
      const parsed = await parse(dto, {});

      expect(parsed[campo]).toBeUndefined();
    });
  });
});
