import { ValidationPipe } from '@nestjs/common';
import { FilterNotificationsDto } from './filter-notifications.dto';

/**
 * Los filtros llegan por query string, donde todo es texto: `?isRead=false`
 * entrega la cadena `'false'`, no el booleano.
 *
 * El pipe se construye con la misma configuración que `main.ts`, incluido
 * `enableImplicitConversion`, porque es justo esa opción la que rompía el
 * filtro: convertía `'false'` en `true` y el endpoint devolvía las leídas
 * cuando le pedían las que faltan por leer.
 */
const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { enableImplicitConversion: true },
});

const parseQuery = (query: Record<string, string>) =>
  pipe.transform(query, {
    type: 'query',
    metatype: FilterNotificationsDto,
  }) as Promise<FilterNotificationsDto>;

describe('FilterNotificationsDto', () => {
  describe('isRead', () => {
    it('interpreta "false" como false, no como true', async () => {
      const dto = await parseQuery({ isRead: 'false' });

      expect(dto.isRead).toBe(false);
    });

    it('interpreta "true" como true', async () => {
      const dto = await parseQuery({ isRead: 'true' });

      expect(dto.isRead).toBe(true);
    });

    // El tercer estado: sin el filtro, el servicio no debe filtrar nada. Si la
    // conversión dejara `false` aquí, "todas" pasaría a ser "solo sin leer".
    it('deja el filtro en undefined cuando no se envía', async () => {
      const dto = await parseQuery({});

      expect(dto.isRead).toBeUndefined();
    });

    it('ignora un valor que no sea booleano', async () => {
      const dto = await parseQuery({ isRead: 'cualquier-cosa' });

      expect(dto.isRead).toBeUndefined();
    });
  });

  describe('paginación', () => {
    it('aplica los valores por defecto', async () => {
      const dto = await parseQuery({});

      expect(dto.page).toBe(1);
      expect(dto.limit).toBe(20);
    });

    it('convierte page y limit a número', async () => {
      const dto = await parseQuery({ page: '3', limit: '50' });

      expect(dto.page).toBe(3);
      expect(dto.limit).toBe(50);
    });

    it('rechaza un limit por encima del máximo', async () => {
      await expect(parseQuery({ limit: '500' })).rejects.toThrow();
    });
  });
});
