import { Test, TestingModule } from '@nestjs/testing';
import { AccountsPayableAuthRequestsController } from './accounts-payable-auth-requests.controller';
import { AccountsPayableAuthRequestsService } from './accounts-payable-auth-requests.service';
import { PrismaService } from '../../database/prisma.service';

describe('AccountsPayableAuthRequestsController', () => {
  let controller: AccountsPayableAuthRequestsController;
  let service: jest.Mocked<AccountsPayableAuthRequestsService>;
  const user = { id: 'u1' } as any;

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findPending: jest.fn(),
      findAll: jest.fn(),
      findByUser: jest.fn(),
      approve: jest.fn(),
      reject: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AccountsPayableAuthRequestsController],
      providers: [
        { provide: AccountsPayableAuthRequestsService, useValue: service },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    controller = module.get<AccountsPayableAuthRequestsController>(
      AccountsPayableAuthRequestsController,
    );
  });

  it('create delega userId y dto', async () => {
    const dto = { accountPayableId: 'ap1' } as any;
    service.create.mockResolvedValue({ id: 'req1' } as any);
    await controller.create(dto, user);
    expect(service.create).toHaveBeenCalledWith('u1', dto);
  });

  it('findPending delega', async () => {
    service.findPending.mockResolvedValue([] as any);
    await controller.findPending();
    expect(service.findPending).toHaveBeenCalled();
  });

  it('findAll delega', async () => {
    service.findAll.mockResolvedValue([] as any);
    await controller.findAll();
    expect(service.findAll).toHaveBeenCalled();
  });

  it('findByUser delega el id del usuario', async () => {
    service.findByUser.mockResolvedValue([] as any);
    await controller.findByUser(user);
    expect(service.findByUser).toHaveBeenCalledWith('u1');
  });

  it('approve delega id, userId y dto', async () => {
    const dto = { reviewNotes: 'ok' } as any;
    service.approve.mockResolvedValue({ id: 'req1' } as any);
    await controller.approve('req1', dto, user);
    expect(service.approve).toHaveBeenCalledWith('req1', 'u1', dto);
  });

  it('reject delega id, userId y dto', async () => {
    const dto = { reviewNotes: 'no' } as any;
    service.reject.mockResolvedValue({ id: 'req1' } as any);
    await controller.reject('req1', dto, user);
    expect(service.reject).toHaveBeenCalledWith('req1', 'u1', dto);
  });
});
