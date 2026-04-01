import { HeartbeatInterceptor } from './heartbeat.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, lastValueFrom } from 'rxjs';
import { AttendanceService } from '../../modules/attendance/attendance.service';

describe('HeartbeatInterceptor', () => {
  let interceptor: HeartbeatInterceptor;
  let attendanceService: jest.Mocked<Partial<AttendanceService>>;

  const createContext = (userId?: string, path = '/api/test') => {
    const request: any = { path };
    if (userId) request.user = { id: userId };
    return {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
  };

  const callHandler: CallHandler = { handle: () => of('result') };

  beforeEach(() => {
    attendanceService = {
      recordHeartbeat: jest.fn().mockResolvedValue(undefined),
    };
    interceptor = new HeartbeatInterceptor(attendanceService as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should pass through and return handler result', async () => {
    const ctx = createContext();
    const result$ = interceptor.intercept(ctx, callHandler);
    const value = await lastValueFrom(result$);
    expect(value).toBe('result');
  });

  it('should not record heartbeat for unauthenticated requests', async () => {
    const ctx = createContext(undefined);
    await lastValueFrom(interceptor.intercept(ctx, callHandler));
    expect(attendanceService.recordHeartbeat).not.toHaveBeenCalled();
  });

  it('should record heartbeat for authenticated user', async () => {
    const ctx = createContext('user-1', '/api/orders');
    await lastValueFrom(interceptor.intercept(ctx, callHandler));
    expect(attendanceService.recordHeartbeat).toHaveBeenCalledWith('user-1', '/api/orders');
  });

  it('should debounce heartbeats within 5 minutes', async () => {
    const ctx = createContext('user-1');

    // First call - should record
    await lastValueFrom(interceptor.intercept(ctx, callHandler));
    expect(attendanceService.recordHeartbeat).toHaveBeenCalledTimes(1);

    // Second call immediately - should be debounced
    await lastValueFrom(interceptor.intercept(ctx, callHandler));
    expect(attendanceService.recordHeartbeat).toHaveBeenCalledTimes(1);
  });

  it('should allow heartbeat after debounce period expires', async () => {
    const ctx = createContext('user-1');
    const now = Date.now();

    // First call
    jest.spyOn(Date, 'now').mockReturnValue(now);
    await lastValueFrom(interceptor.intercept(ctx, callHandler));
    expect(attendanceService.recordHeartbeat).toHaveBeenCalledTimes(1);

    // Simulate 6 minutes later
    jest.spyOn(Date, 'now').mockReturnValue(now + 6 * 60 * 1000);
    await lastValueFrom(interceptor.intercept(ctx, callHandler));
    expect(attendanceService.recordHeartbeat).toHaveBeenCalledTimes(2);
  });

  it('should not block request if recordHeartbeat fails', async () => {
    attendanceService.recordHeartbeat = jest.fn().mockRejectedValue(new Error('DB error'));
    const ctx = createContext('user-1');
    const result$ = interceptor.intercept(ctx, callHandler);
    const value = await lastValueFrom(result$);
    expect(value).toBe('result');
  });

  it('should track heartbeats independently per user', async () => {
    const ctx1 = createContext('user-1');
    const ctx2 = createContext('user-2');

    await lastValueFrom(interceptor.intercept(ctx1, callHandler));
    await lastValueFrom(interceptor.intercept(ctx2, callHandler));

    expect(attendanceService.recordHeartbeat).toHaveBeenCalledTimes(2);
    expect(attendanceService.recordHeartbeat).toHaveBeenCalledWith('user-1', '/api/test');
    expect(attendanceService.recordHeartbeat).toHaveBeenCalledWith('user-2', '/api/test');
  });
});
