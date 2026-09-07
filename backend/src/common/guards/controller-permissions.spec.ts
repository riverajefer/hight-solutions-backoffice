import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { AuditLogsController } from '../../modules/audit-logs/audit-logs.controller';
import { QuotesController } from '../../modules/quotes/quotes.controller';

/**
 * Qué permiso pide cada ruta, escrito aparte del controlador.
 *
 * Estos dos módulos se enviaron a producción con `JwtAuthGuard` y nada más: la
 * interfaz escondía los botones y la API los dejaba pasar. En cotizaciones eso
 * significaba que los 36 usuarios podían borrar y convertir, cuando el permiso
 * lo tenían 5; en auditoría, que cualquiera leía el historial completo del
 * sistema.
 *
 * El modo de fallar es silencioso: quitar un decorador no rompe ningún test de
 * comportamiento, solo abre la puerta. Esta prueba lo hace ruidoso.
 */
const reflector = new Reflector();

const permisosDe = (controlador: any, metodo: string): string[] | undefined =>
  reflector.get<string[]>(PERMISSIONS_KEY, controlador.prototype[metodo]);

describe('Permisos declarados por ruta', () => {
  describe('QuotesController', () => {
    const esperado: Array<[string, string[]]> = [
      ['create', ['create_quotes']],
      ['findAll', ['read_quotes']],
      ['findOne', ['read_quotes']],
      ['update', ['update_quotes']],
      ['remove', ['delete_quotes']],
      ['convertToOrder', ['convert_quotes']],
      ['uploadSampleImage', ['update_quotes', 'upload_files']],
      ['deleteSampleImage', ['update_quotes']],
    ];

    it.each(esperado)('%s exige %s', (metodo, permisos) => {
      expect(permisosDe(QuotesController, metodo)).toEqual(permisos);
    });

    it('no deja ninguna ruta sin permiso', () => {
      const rutas = Object.getOwnPropertyNames(QuotesController.prototype).filter(
        (m) => m !== 'constructor',
      );

      const sinPermiso = rutas.filter((m) => !permisosDe(QuotesController, m));

      expect(sinPermiso).toEqual([]);
    });
  });

  describe('AuditLogsController', () => {
    it.each([
      ['findAll', ['read_audit_logs']],
      ['getAuditLogsByUser', ['read_audit_logs']],
      ['getAuditLogsByModel', ['read_audit_logs']],
      ['getLatestAuditLogs', ['read_audit_logs']],
    ] as Array<[string, string[]]>)('%s exige %s', (metodo, permisos) => {
      expect(permisosDe(AuditLogsController, metodo)).toEqual(permisos);
    });

    // El historial de un registro alimenta la pestaña «Historial de Cambios»
    // del detalle de orden, que ven todos los comerciales. Pedir
    // `read_audit_logs` ahí (solo admin y contabilidad) los dejaría sin
    // historial, así que se pide el permiso de la entidad que se mira.
    it('getRecordHistory exige read_orders, no read_audit_logs', () => {
      expect(permisosDe(AuditLogsController, 'getRecordHistory')).toEqual([
        'read_orders',
      ]);
    });

    it('no deja ninguna ruta sin permiso', () => {
      const rutas = Object.getOwnPropertyNames(
        AuditLogsController.prototype,
      ).filter((m) => m !== 'constructor');

      const sinPermiso = rutas.filter((m) => !permisosDe(AuditLogsController, m));

      expect(sinPermiso).toEqual([]);
    });
  });
});
