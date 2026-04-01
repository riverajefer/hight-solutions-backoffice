import { MaintenanceMiddleware } from './maintenance.middleware';
import { Request, Response, NextFunction } from 'express';

describe('MaintenanceMiddleware', () => {
  let middleware: MaintenanceMiddleware;
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    middleware = new MaintenanceMiddleware();
    req = { path: '/api/v1/users', headers: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
    delete process.env.MAINTENANCE_MODE;
    delete process.env.MAINTENANCE_MESSAGE;
  });

  it('should be defined', () => {
    expect(middleware).toBeDefined();
  });

  it('should always allow /health requests', () => {
    process.env.MAINTENANCE_MODE = 'true';
    (req as any).path = '/health';

    middleware.use(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should call next() when maintenance mode is off', () => {
    process.env.MAINTENANCE_MODE = 'false';

    middleware.use(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should call next() when MAINTENANCE_MODE is not set', () => {
    middleware.use(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
  });

  it('should return 503 HTML when maintenance on and client accepts HTML', () => {
    process.env.MAINTENANCE_MODE = 'true';
    req.headers = { accept: 'text/html,application/xhtml+xml' };

    middleware.use(req as Request, res as Response, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining('En Mantenimiento'));
  });

  it('should return 503 JSON for API requests when maintenance on', () => {
    process.env.MAINTENANCE_MODE = 'true';
    req.headers = { accept: 'application/json' };

    middleware.use(req as Request, res as Response, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({
      statusCode: 503,
      error: 'Service Unavailable',
      message: 'El sistema se encuentra en mantenimiento. Por favor intenta más tarde.',
    });
  });

  it('should use custom MAINTENANCE_MESSAGE when set', () => {
    process.env.MAINTENANCE_MODE = 'true';
    process.env.MAINTENANCE_MESSAGE = 'Actualizando servidor';
    req.headers = { accept: 'application/json' };

    middleware.use(req as Request, res as Response, next);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Actualizando servidor' }),
    );
  });

  it('should include custom message in HTML response', () => {
    process.env.MAINTENANCE_MODE = 'true';
    process.env.MAINTENANCE_MESSAGE = 'Volvemos pronto';
    req.headers = { accept: 'text/html' };

    middleware.use(req as Request, res as Response, next);

    expect(res.send).toHaveBeenCalledWith(expect.stringContaining('Volvemos pronto'));
  });

  it('should return JSON when accept header is empty', () => {
    process.env.MAINTENANCE_MODE = 'true';
    req.headers = {};

    middleware.use(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalled();
  });
});
