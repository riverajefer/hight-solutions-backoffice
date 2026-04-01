import { Test, TestingModule } from '@nestjs/testing';
import { ClientOwnershipAuthRequestsController } from './client-ownership-auth-requests.controller';
import { ClientOwnershipAuthRequestsService } from './client-ownership-auth-requests.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PrismaService } from '../../database/prisma.service';

describe('ClientOwnershipAuthRequestsController', () => {
  let controller: ClientOwnershipAuthRequestsController;
  let service: jest.Mocked<ClientOwnershipAuthRequestsService>;

  const mockService = {
    findPendingRequests: jest.fn(),
    findAll: jest.fn(),
    findByUser: jest.fn(),
    approve: jest.fn(),
    reject: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClientOwnershipAuthRequestsController],
      providers: [
        { provide: ClientOwnershipAuthRequestsService, useValue: mockService },
        { provide: PrismaService, useValue: {} },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(ClientOwnershipAuthRequestsController);
    service = module.get(ClientOwnershipAuthRequestsService) as any;

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findPending', () => {
    it('should return pending requests', async () => {
      const result = [{ id: 'r1', status: 'PENDING' }];
      mockService.findPendingRequests.mockResolvedValue(result);
      expect(await controller.findPending()).toEqual(result);
      expect(service.findPendingRequests).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all requests', async () => {
      const result = [{ id: 'r1' }, { id: 'r2' }];
      mockService.findAll.mockResolvedValue(result);
      expect(await controller.findAll()).toEqual(result);
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('findMy', () => {
    it('should return user requests', async () => {
      const result = [{ id: 'r1' }];
      mockService.findByUser.mockResolvedValue(result);
      expect(await controller.findMy('user-1')).toEqual(result);
      expect(service.findByUser).toHaveBeenCalledWith('user-1');
    });
  });

  describe('approve', () => {
    it('should approve request', async () => {
      const dto = { reviewNotes: 'OK' };
      const result = { id: 'r1', status: 'APPROVED' };
      mockService.approve.mockResolvedValue(result);
      expect(await controller.approve('r1', 'rev-1', dto)).toEqual(result);
      expect(service.approve).toHaveBeenCalledWith('r1', 'rev-1', dto);
    });
  });

  describe('reject', () => {
    it('should reject request', async () => {
      const dto = { reviewNotes: 'No procede' };
      const result = { id: 'r1', status: 'REJECTED' };
      mockService.reject.mockResolvedValue(result);
      expect(await controller.reject('r1', 'rev-1', dto)).toEqual(result);
      expect(service.reject).toHaveBeenCalledWith('r1', 'rev-1', dto);
    });
  });
});
