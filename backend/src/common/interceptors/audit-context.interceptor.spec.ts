import { AuditContextInterceptor } from './audit-context.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError, lastValueFrom } from 'rxjs';
import * as auditContext from '../utils/audit-context';

describe('AuditContextInterceptor', () => {
  let interceptor: AuditContextInterceptor;
  let setAuditSpy: jest.SpyInstance;
  let clearAuditSpy: jest.SpyInstance;

  const mockRequest = {
    user: { id: 'user-1' },
    headers: { 'user-agent': 'test-agent' },
    socket: { remoteAddress: '127.0.0.1' },
  };

  const mockExecutionContext = {
    switchToHttp: () => ({
      getRequest: () => mockRequest,
    }),
  } as unknown as ExecutionContext;

  beforeEach(() => {
    interceptor = new AuditContextInterceptor();
    setAuditSpy = jest.spyOn(auditContext, 'setAuditContextFromRequest').mockImplementation(jest.fn());
    clearAuditSpy = jest.spyOn(auditContext, 'clearAuditContext').mockImplementation(jest.fn());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should set audit context from request with userId', async () => {
    const callHandler: CallHandler = { handle: () => of('result') };

    const result$ = interceptor.intercept(mockExecutionContext, callHandler);
    const value = await lastValueFrom(result$);

    expect(setAuditSpy).toHaveBeenCalledWith(mockRequest, 'user-1');
    expect(value).toBe('result');
  });

  it('should set audit context with undefined userId when no user', async () => {
    const noUserRequest = { headers: {}, socket: { remoteAddress: '::1' } };
    const ctx = {
      switchToHttp: () => ({ getRequest: () => noUserRequest }),
    } as unknown as ExecutionContext;
    const callHandler: CallHandler = { handle: () => of('ok') };

    await lastValueFrom(interceptor.intercept(ctx, callHandler));

    expect(setAuditSpy).toHaveBeenCalledWith(noUserRequest, undefined);
  });

  it('should clear audit context on completion', async () => {
    const callHandler: CallHandler = { handle: () => of('done') };

    const result$ = interceptor.intercept(mockExecutionContext, callHandler);
    await lastValueFrom(result$);

    expect(clearAuditSpy).toHaveBeenCalled();
  });

  it('should clear audit context on error', async () => {
    const error = new Error('test error');
    const callHandler: CallHandler = { handle: () => throwError(() => error) };

    const result$ = interceptor.intercept(mockExecutionContext, callHandler);

    await expect(lastValueFrom(result$)).rejects.toThrow('test error');
    expect(clearAuditSpy).toHaveBeenCalled();
  });
});
