import { Request, Response } from 'express';
import { AuditContextMiddleware } from './audit-context.middleware';
import { getAuditContext } from '../utils/audit-context';

describe('AuditContextMiddleware', () => {
  const middleware = new AuditContextMiddleware();

  const request = (headers: Record<string, string>, remoteAddress = '127.0.0.1') =>
    ({ headers, socket: { remoteAddress } }) as unknown as Request;

  it('runs the rest of the chain inside a context with the request IP and User-Agent', () => {
    let seen: ReturnType<typeof getAuditContext> | undefined;

    middleware.use(
      request({ 'x-forwarded-for': '200.1.1.1, 10.0.0.1', 'user-agent': 'Chrome' }),
      {} as Response,
      () => {
        seen = getAuditContext();
      },
    );

    expect(seen).toEqual({ userId: undefined, ipAddress: '200.1.1.1', userAgent: 'Chrome' });
  });

  it('falls back to the socket address and "unknown" user agent', () => {
    let seen: ReturnType<typeof getAuditContext> | undefined;

    middleware.use(request({}, '::1'), {} as Response, () => {
      seen = getAuditContext();
    });

    expect(seen).toEqual({ userId: undefined, ipAddress: '::1', userAgent: 'unknown' });
  });

  it('does not leak the context outside the request', () => {
    middleware.use(request({ 'user-agent': 'Chrome' }), {} as Response, () => undefined);

    expect(getAuditContext()).toEqual({
      userId: undefined,
      ipAddress: undefined,
      userAgent: undefined,
    });
  });
});
