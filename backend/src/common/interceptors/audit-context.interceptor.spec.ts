import { AuditContextInterceptor } from './audit-context.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, lastValueFrom } from 'rxjs';
import { getAuditContext, runWithAuditContext } from '../utils/audit-context';

describe('AuditContextInterceptor', () => {
  const interceptor = new AuditContextInterceptor();
  const callHandler: CallHandler = { handle: () => of('result') };

  const httpContext = (request: unknown) =>
    ({
      getType: () => 'http',
      switchToHttp: () => ({ getRequest: () => request }),
    }) as unknown as ExecutionContext;

  it('adds the authenticated user to the current request context', async () => {
    await runWithAuditContext({ ipAddress: '10.0.0.1', userAgent: 'test-agent' }, async () => {
      const value = await lastValueFrom(
        interceptor.intercept(httpContext({ user: { id: 'user-1' } }), callHandler),
      );

      expect(value).toBe('result');
      expect(getAuditContext()).toEqual({
        userId: 'user-1',
        ipAddress: '10.0.0.1',
        userAgent: 'test-agent',
      });
    });
  });

  it('leaves userId undefined for unauthenticated requests', async () => {
    await runWithAuditContext({ ipAddress: '10.0.0.1' }, async () => {
      await lastValueFrom(interceptor.intercept(httpContext({}), callHandler));

      expect(getAuditContext().userId).toBeUndefined();
    });
  });

  it('ignores non-HTTP execution contexts', async () => {
    const wsContext = {
      getType: () => 'ws',
      switchToHttp: () => {
        throw new Error('switchToHttp must not be called');
      },
    } as unknown as ExecutionContext;

    await expect(lastValueFrom(interceptor.intercept(wsContext, callHandler))).resolves.toBe(
      'result',
    );
  });
});
