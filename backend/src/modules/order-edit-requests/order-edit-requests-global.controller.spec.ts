import { Test, TestingModule } from '@nestjs/testing';
import { OrderEditRequestsGlobalController } from './order-edit-requests-global.controller';
import { OrderEditRequestsService } from './order-edit-requests.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { ReviewEditRequestDto } from './dto';

describe('OrderEditRequestsGlobalController', () => {
  let controller: OrderEditRequestsGlobalController;
  let service: jest.Mocked<OrderEditRequestsService>;

  beforeEach(async () => {
    service = {
      findAllPending: jest.fn(),
      findOneById: jest.fn(),
      approve: jest.fn(),
      reject: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderEditRequestsGlobalController],
      providers: [
        {
          provide: OrderEditRequestsService,
          useValue: service,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<OrderEditRequestsGlobalController>(
      OrderEditRequestsGlobalController,
    );
  });

  describe('findAllPending', () => {
    it('should retrieve all pending requests', async () => {
      const pendingReqs = [{ id: 'req1' }, { id: 'req2' }];
      service.findAllPending.mockResolvedValue(pendingReqs as any);

      const result = await controller.findAllPending();

      expect(result).toEqual(pendingReqs);
      expect(service.findAllPending).toHaveBeenCalled();
    });
  });

  describe('approve', () => {
    it('should fetch the request by id and approve it', async () => {
      const dto: ReviewEditRequestDto = { reviewNotes: 'Ok' };
      service.findOneById.mockResolvedValue({ orderId: 'ord1', id: 'req1' } as any);
      service.approve.mockResolvedValue({ id: 'req1', status: 'APPROVED' } as any);

      const result = await controller.approve('req1', 'admin1', dto);

      expect(service.findOneById).toHaveBeenCalledWith('req1');
      expect(service.approve).toHaveBeenCalledWith('ord1', 'req1', 'admin1', dto);
      expect(result).toEqual({ id: 'req1', status: 'APPROVED' });
    });
  });

  describe('reject', () => {
    it('should fetch the request by id and reject it', async () => {
      const dto: ReviewEditRequestDto = { reviewNotes: 'No' };
      service.findOneById.mockResolvedValue({ orderId: 'ord1', id: 'req1' } as any);
      service.reject.mockResolvedValue({ id: 'req1', status: 'REJECTED' } as any);

      const result = await controller.reject('req1', 'admin1', dto);

      expect(service.findOneById).toHaveBeenCalledWith('req1');
      expect(service.reject).toHaveBeenCalledWith('ord1', 'req1', 'admin1', dto);
      expect(result).toEqual({ id: 'req1', status: 'REJECTED' });
    });
  });
});
