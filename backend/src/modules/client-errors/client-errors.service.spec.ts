import { Logger } from '@nestjs/common';
import { ClientErrorsService } from './client-errors.service';
import { ClientErrorsController } from './client-errors.controller';
import { ReportClientErrorDto } from './dto/report-client-error.dto';

describe('ClientErrorsService', () => {
  let service: ClientErrorsService;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    service = new ClientErrorsService();
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const dto = (overrides: Partial<ReportClientErrorDto> = {}) =>
    ({
      message: "TypeError: Cannot read properties of undefined (reading 'id')",
      url: 'https://crmhighsolutions.com/orders/33d01330',
      ...overrides,
    }) as ReportClientErrorDto;

  it('registra el error con campos estructurados', () => {
    service.report(dto({ kind: 'chunk', userId: 'user-1' }), {
      ip: '190.0.0.1',
      userAgent: 'Chrome',
    });

    expect(errorSpy).toHaveBeenCalledTimes(1);
    const payload = errorSpy.mock.calls[0][0] as {
      msg: string;
      clientError: Record<string, unknown>;
    };

    expect(payload.msg).toContain('[client]');
    expect(payload.clientError).toMatchObject({
      kind: 'chunk',
      url: 'https://crmhighsolutions.com/orders/33d01330',
      reportedUserId: 'user-1',
      userAgent: 'Chrome',
      ip: '190.0.0.1',
    });
  });

  it('asume kind "render" cuando el frontend no lo envía', () => {
    service.report(dto(), {});

    const payload = errorSpy.mock.calls[0][0] as {
      clientError: { kind: string };
    };
    expect(payload.clientError.kind).toBe('render');
  });
});

describe('ClientErrorsController', () => {
  it('pasa al servicio la IP y el user agent de la petición', () => {
    const service = { report: jest.fn() } as unknown as ClientErrorsService;
    const controller = new ClientErrorsController(service);

    const body = { message: 'boom' } as ReportClientErrorDto;
    const req = {
      ip: '190.0.0.1',
      get: jest.fn().mockReturnValue('Mozilla/5.0'),
    };

    controller.report(body, req as never);

    expect(service.report).toHaveBeenCalledWith(body, {
      ip: '190.0.0.1',
      userAgent: 'Mozilla/5.0',
    });
  });
});
