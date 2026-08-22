import { Test, TestingModule } from '@nestjs/testing';
import { AccountsPayablePaymentReversalRequestsController } from './accounts-payable-payment-reversal-requests.controller';
import { AccountsPayablePaymentReversalRequestsService } from './accounts-payable-payment-reversal-requests.service';
import { PrismaService } from '../../database/prisma.service';

describe('AccountsPayablePaymentReversalRequestsController', () => {
  let controller: AccountsPayablePaymentReversalRequestsController;
  let service: jest.Mocked<AccountsPayablePaymentReversalRequestsService>;
  const user = { id: 'u1' } as any;

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findPendingGerencia: jest.fn(),
      findPendingCaja: jest.fn(),
      findAll: jest.fn(),
      findByPaymentAuthRequest: jest.fn(),
      findOne: jest.fn(),
      gerenciaApprove: jest.fn(),
      gerenciaReject: jest.fn(),
      cajaApprove: jest.fn(),
      cajaReject: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AccountsPayablePaymentReversalRequestsController],
      providers: [
        { provide: AccountsPayablePaymentReversalRequestsService, useValue: service },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    controller = module.get<AccountsPayablePaymentReversalRequestsController>(
      AccountsPayablePaymentReversalRequestsController,
    );
  });

  it('create delega userId y dto', async () => {
    const dto = { paymentAuthRequestId: 'auth1', reason: 'x' } as any;
    service.create.mockResolvedValue({ id: 'rev1' } as any);
    await controller.create(dto, user);
    expect(service.create).toHaveBeenCalledWith('u1', dto);
  });

  it('findPendingGerencia delega', async () => {
    service.findPendingGerencia.mockResolvedValue([] as any);
    await controller.findPendingGerencia();
    expect(service.findPendingGerencia).toHaveBeenCalled();
  });

  it('findPendingCaja delega', async () => {
    service.findPendingCaja.mockResolvedValue([] as any);
    await controller.findPendingCaja();
    expect(service.findPendingCaja).toHaveBeenCalled();
  });

  it('findAll delega', async () => {
    service.findAll.mockResolvedValue([] as any);
    await controller.findAll();
    expect(service.findAll).toHaveBeenCalled();
  });

  it('findByPaymentAuthRequest delega el id', async () => {
    service.findByPaymentAuthRequest.mockResolvedValue(null as any);
    await controller.findByPaymentAuthRequest('auth1');
    expect(service.findByPaymentAuthRequest).toHaveBeenCalledWith('auth1');
  });

  it('findOne delega el id', async () => {
    service.findOne.mockResolvedValue({ id: 'rev1' } as any);
    await controller.findOne('rev1');
    expect(service.findOne).toHaveBeenCalledWith('rev1');
  });

  it('gerenciaApprove delega id y userId', async () => {
    service.gerenciaApprove.mockResolvedValue({ id: 'rev1' } as any);
    await controller.gerenciaApprove('rev1', user);
    expect(service.gerenciaApprove).toHaveBeenCalledWith('rev1', 'u1');
  });

  it('gerenciaReject delega id, userId y dto', async () => {
    const dto = { rejectionNotes: 'no' } as any;
    service.gerenciaReject.mockResolvedValue({ id: 'rev1' } as any);
    await controller.gerenciaReject('rev1', dto, user);
    expect(service.gerenciaReject).toHaveBeenCalledWith('rev1', 'u1', dto);
  });

  it('cajaApprove delega id y el usuario', async () => {
    service.cajaApprove.mockResolvedValue({ success: true } as any);
    await controller.cajaApprove('rev1', user);
    expect(service.cajaApprove).toHaveBeenCalledWith('rev1', user);
  });

  it('cajaReject delega id, usuario y dto', async () => {
    const dto = { rejectionNotes: 'no' } as any;
    service.cajaReject.mockResolvedValue({ id: 'rev1' } as any);
    await controller.cajaReject('rev1', dto, user);
    expect(service.cajaReject).toHaveBeenCalledWith('rev1', user, dto);
  });
});
