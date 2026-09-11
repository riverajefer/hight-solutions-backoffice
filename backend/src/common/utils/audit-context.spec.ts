import { Request } from 'express';
import {
  buildAuditContextFromRequest,
  getAuditContext,
  runWithAuditContext,
  setAuditUserId,
} from './audit-context';

const tick = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('audit-context', () => {
  it('returns an empty context outside a request (crons, listeners)', () => {
    expect(getAuditContext()).toEqual({
      userId: undefined,
      ipAddress: undefined,
      userAgent: undefined,
    });
  });

  it('ignores setAuditUserId when there is no active context', () => {
    setAuditUserId('user-1');

    expect(getAuditContext().userId).toBeUndefined();
  });

  // Regresión: con la variable global, B pisaba a A y al terminar la limpiaba,
  // así que las escrituras que A hacía después quedaban sin usuario.
  it('keeps concurrent requests isolated across awaits', async () => {
    const seenByA: (string | undefined)[] = [];

    const requestA = runWithAuditContext({ ipAddress: '1.1.1.1' }, async () => {
      setAuditUserId('user-a');
      seenByA.push(getAuditContext().userId);
      await tick(20); // B arranca y termina mientras A espera la base de datos
      seenByA.push(getAuditContext().userId);
    });

    const requestB = runWithAuditContext({ ipAddress: '2.2.2.2' }, async () => {
      await tick(5);
      setAuditUserId('user-b');
      expect(getAuditContext()).toEqual({
        userId: 'user-b',
        ipAddress: '2.2.2.2',
        userAgent: undefined,
      });
    });

    await Promise.all([requestA, requestB]);

    expect(seenByA).toEqual(['user-a', 'user-a']);
  });

  it('does not let callers mutate the stored context through getAuditContext', () => {
    runWithAuditContext({ userId: 'user-1' }, () => {
      getAuditContext().userId = 'tampered';

      expect(getAuditContext().userId).toBe('user-1');
    });
  });

  describe('buildAuditContextFromRequest', () => {
    const request = (headers: Record<string, string>, remoteAddress?: string) =>
      ({ headers, socket: { remoteAddress } }) as unknown as Request;

    it('uses the first address of x-forwarded-for', () => {
      expect(
        buildAuditContextFromRequest(request({ 'x-forwarded-for': ' 200.1.1.1 , 10.0.0.1' })),
      ).toEqual({ ipAddress: '200.1.1.1', userAgent: 'unknown' });
    });

    it('falls back to the socket address, then to "unknown"', () => {
      expect(buildAuditContextFromRequest(request({ 'user-agent': 'Chrome' }, '::1'))).toEqual({
        ipAddress: '::1',
        userAgent: 'Chrome',
      });
      expect(buildAuditContextFromRequest(request({}))).toEqual({
        ipAddress: 'unknown',
        userAgent: 'unknown',
      });
    });
  });
});
