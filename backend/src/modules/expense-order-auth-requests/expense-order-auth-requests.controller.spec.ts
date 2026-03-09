import { Test, TestingModule } from '@nestjs/testing';
import { ExpenseOrderAuthRequestsController } from './expense-order-auth-requests.controller';
import { ExpenseOrderAuthRequestsService } from './expense-order-auth-requests.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

describe('ExpenseOrderAuthRequestsController', () => {
  let controller: ExpenseOrderAuthRequestsController;
  let service: ExpenseOrderAuthRequestsService;

  const mockService = {
    create: jest.fn(),
    findPendingRequests: jest.fn(),
    findAll: jest.fn(),
    findByUser: jest.fn(),
    approve: jest.fn(),
    reject: jest.fn(),
  };

  const USER_ID = 'user-123';
  const ADMIN_ID = 'admin-456';
  const REQUEST_ID = 'req-789';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExpenseOrderAuthRequestsController],
      providers: [
        { provide: ExpenseOrderAuthRequestsService, useValue: mockService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ExpenseOrderAuthRequestsController>(ExpenseOrderAuthRequestsController);
    service = module.get<ExpenseOrderAuthRequestsService>(ExpenseOrderAuthRequestsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call service.create with user id and dto', async () => {
      const dto = { expenseOrderId: 'og-1', reason: 'test' };
      await controller.create(USER_ID, dto);
      expect(service.create).toHaveBeenCalledWith(USER_ID, dto);
    });
  });

  describe('findPending', () => {
    it('should call service.findPendingRequests', async () => {
      await controller.findPending();
      expect(service.findPendingRequests).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should call service.findAll', async () => {
      await controller.findAll();
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('findMy', () => {
    it('should call service.findByUser with user id', async () => {
      await controller.findMy(USER_ID);
      expect(service.findByUser).toHaveBeenCalledWith(USER_ID);
    });
  });

  describe('approve', () => {
    it('should call service.approve with id, admin id and dto', async () => {
      const dto = { reviewNotes: 'ok' };
      await controller.approve(REQUEST_ID, ADMIN_ID, dto);
      expect(service.approve).toHaveBeenCalledWith(REQUEST_ID, ADMIN_ID, dto);
    });
  });

  describe('reject', () => {
    it('should call service.reject with id, admin id and dto', async () => {
      const dto = { reviewNotes: 'no' };
      await controller.reject(REQUEST_ID, ADMIN_ID, dto);
      expect(service.reject).toHaveBeenCalledWith(REQUEST_ID, ADMIN_ID, dto);
    });
  });
});
