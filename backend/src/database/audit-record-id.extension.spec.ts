import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  COMPOSITE_PRIMARY_KEYS,
  UNKNOWN_RECORD_ID,
  resolveAuditRecordId,
  withResolvedRecordIds,
} from './audit-record-id.extension';

describe('audit-record-id extension', () => {
  describe('COMPOSITE_PRIMARY_KEYS', () => {
    it('matches every @@id declared in schema.prisma', () => {
      const schema = readFileSync(resolve(__dirname, '../../prisma/schema.prisma'), 'utf8');
      const declared: Record<string, string[]> = {};
      let currentModel: string | undefined;

      for (const line of schema.split('\n')) {
        const model = line.match(/^model\s+(\w+)\s*\{/);
        if (model) currentModel = model[1];

        const compositeId = line.match(/^\s*@@id\(\[([^\]]+)\]/);
        if (compositeId && currentModel) {
          declared[currentModel] = compositeId[1].split(',').map((field) => field.trim());
        }
      }

      expect(declared).toEqual(COMPOSITE_PRIMARY_KEYS);
    });
  });

  describe('resolveAuditRecordId', () => {
    it('keeps the id provided by the library', () => {
      expect(resolveAuditRecordId({ model: 'Order', recordId: 'order-1' })).toBe('order-1');
    });

    it('builds the composite key from oldData on DELETE', () => {
      expect(
        resolveAuditRecordId({
          model: 'OrderItemProductionArea',
          recordId: undefined,
          oldData: {
            orderItemId: 'item-1',
            productionAreaId: 'area-1',
            assignedAt: '2026-08-31T21:04:05.055Z',
          },
        }),
      ).toBe('item-1:area-1');
    });

    it('replaces the "unknown" placeholder from createMany with the composite key', () => {
      expect(
        resolveAuditRecordId({
          model: 'RolePermission',
          recordId: UNKNOWN_RECORD_ID,
          newData: { roleId: 'role-1', permissionId: 'perm-1' },
        }),
      ).toBe('role-1:perm-1');
    });

    it('falls back to "unknown" when the snapshot lacks a key field', () => {
      expect(
        resolveAuditRecordId({
          model: 'OrderItemProductionArea',
          oldData: { assignedAt: '2026-08-31T21:04:05.055Z' },
          newData: { assignedAt: '2026-09-01T10:00:00.000Z' },
        }),
      ).toBe(UNKNOWN_RECORD_ID);
    });

    it('falls back to "unknown" for a model without id and no composite key', () => {
      expect(resolveAuditRecordId({ model: 'Order', recordId: undefined })).toBe(UNKNOWN_RECORD_ID);
    });
  });

  describe('withResolvedRecordIds', () => {
    it('fills recordId on every row of a createMany payload', () => {
      const rows = withResolvedRecordIds([
        { model: 'Order', recordId: 'order-1', action: 'UPDATE' },
        {
          model: 'OrderItemProductionArea',
          recordId: undefined,
          action: 'DELETE',
          oldData: { orderItemId: 'item-1', productionAreaId: 'area-1' },
        },
      ]);

      expect(rows.map((row) => row.recordId)).toEqual(['order-1', 'item-1:area-1']);
      expect(rows[1].action).toBe('DELETE');
    });

    it('accepts a single row', () => {
      expect(withResolvedRecordIds({ model: 'Order', recordId: 'order-1' })).toEqual([
        { model: 'Order', recordId: 'order-1' },
      ]);
    });
  });
});
