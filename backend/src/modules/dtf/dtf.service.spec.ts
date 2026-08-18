// uuid es ESM-only en v9+; se mockea antes de los imports (StorageService lo usa).
jest.mock('uuid', () => ({ v4: jest.fn(() => 'mock-uuid') }));

import { Test, TestingModule } from '@nestjs/testing';
import { DtfService } from './dtf.service';
import { DtfRepository } from './dtf.repository';
import { PrismaService } from '../../database/prisma.service';
import { ConsecutivesService } from '../consecutives/consecutives.service';
import { StorageService } from '../storage/storage.service';
import { OrdersService } from '../orders/orders.service';
import { DtfStatus, PaymentMethod } from '../../generated/prisma';

const mockDtfRepository = {
  findByIdRaw: jest.fn(),
  updateStatus: jest.fn(),
  createStatusHistory: jest.fn(),
};

const mockPrisma = {
  product: { findUnique: jest.fn() },
  productionArea: { findFirst: jest.fn() },
  payment: { create: jest.fn(), update: jest.fn(), findFirst: jest.fn() },
  order: { update: jest.fn() },
  orderItem: { update: jest.fn() },
  uploadedFile: { update: jest.fn() },
};

const mockStorageService = { getFilesByEntity: jest.fn() };
const mockOrdersService = { create: jest.fn() };
const mockConsecutivesService = { generateNumber: jest.fn(), syncCounter: jest.fn() };

const makeRecord = (overrides = {}) => ({
  id: 'dtf-1',
  consecutive: 'DTF-TEXTIL-2026-0001',
  status: DtfStatus.COMPLETADA,
  clientId: 'client-1',
  productId: 'product-1',
  quantity: 100,
  unitPrice: 17000,
  abono: 50000,
  abonoPaymentMethod: PaymentMethod.TRANSFER,
  abonoBankEntity: 'Bancolombia',
  abonoNotes: null,
  applyIva: false,
  ...overrides,
});

describe('DtfService.convertToOrder', () => {
  let service: DtfService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DtfService,
        { provide: DtfRepository, useValue: mockDtfRepository },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConsecutivesService, useValue: mockConsecutivesService },
        { provide: StorageService, useValue: mockStorageService },
        { provide: OrdersService, useValue: mockOrdersService },
      ],
    }).compile();

    service = module.get<DtfService>(DtfService);

    mockDtfRepository.findByIdRaw.mockResolvedValue(makeRecord());
    mockPrisma.product.findUnique.mockResolvedValue({ id: 'product-1', name: 'DTF TEXTIL' });
    mockPrisma.productionArea.findFirst.mockResolvedValue({ id: 'area-1', name: 'DTF Textil' });
    mockStorageService.getFilesByEntity.mockResolvedValue([]);
    mockOrdersService.create.mockResolvedValue({
      id: 'order-1',
      orderNumber: 'OP-2026-0001',
      items: [{ id: 'item-1' }],
    });
    mockPrisma.payment.findFirst.mockResolvedValue({ id: 'payment-1' });
  });

  // El bug que motiva estos tests: el abono se insertaba con Prisma directo
  // "para evitar la maquinaria de cash-session", y el 90% de los abonos DTF
  // nunca llegó al historial de caja. Debe pasar por `ordersService.create`,
  // que es quien genera el CashMovement.
  it('manda el abono como pago inicial de la OP, no como insert directo', async () => {
    await service.convertToOrder('dtf-1', 'user-1');

    expect(mockOrdersService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        initialPayment: {
          amount: 50000,
          paymentMethod: PaymentMethod.TRANSFER,
          bankEntity: 'Bancolombia',
          reference: 'DTF-TEXTIL-2026-0001',
          notes: 'Anticipo DTF DTF-TEXTIL-2026-0001',
        },
      }),
      'user-1',
    );
  });

  it('NUNCA crea el pago por fuera de ordersService (saltaría la caja)', async () => {
    await service.convertToOrder('dtf-1', 'user-1');

    expect(mockPrisma.payment.create).not.toHaveBeenCalled();
  });

  it('no toca paidAmount/balance a mano: los calcula ordersService', async () => {
    await service.convertToOrder('dtf-1', 'user-1');

    expect(mockPrisma.order.update).not.toHaveBeenCalled();
  });

  it('respeta las notas del abono cuando el usuario las escribió', async () => {
    mockDtfRepository.findByIdRaw.mockResolvedValue(
      makeRecord({ abonoNotes: '  Consignación Davivienda  ' }),
    );

    await service.convertToOrder('dtf-1', 'user-1');

    expect(mockOrdersService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        initialPayment: expect.objectContaining({
          notes: '  Consignación Davivienda  ',
        }),
      }),
      'user-1',
    );
  });

  it('cae a TRANSFER cuando la DTF no trae método de pago', async () => {
    mockDtfRepository.findByIdRaw.mockResolvedValue(
      makeRecord({ abonoPaymentMethod: null, abonoBankEntity: null }),
    );

    await service.convertToOrder('dtf-1', 'user-1');

    const [dto] = mockOrdersService.create.mock.calls[0];
    expect(dto.initialPayment.paymentMethod).toBe(PaymentMethod.TRANSFER);
    // `null` rompería la validación del DTO, que espera string | undefined.
    expect(dto.initialPayment.bankEntity).toBeUndefined();
  });

  it('no manda pago inicial cuando la DTF no tiene abono', async () => {
    mockDtfRepository.findByIdRaw.mockResolvedValue(makeRecord({ abono: 0 }));

    await service.convertToOrder('dtf-1', 'user-1');

    const [dto] = mockOrdersService.create.mock.calls[0];
    expect(dto.initialPayment).toBeUndefined();
    expect(mockPrisma.payment.create).not.toHaveBeenCalled();
  });

  it('cuelga el comprobante DTF del pago que creó ordersService', async () => {
    mockStorageService.getFilesByEntity.mockImplementation((type: string) =>
      Promise.resolve(type === 'DTF_COMPROBANTE' ? [{ id: 'file-9' }] : []),
    );

    await service.convertToOrder('dtf-1', 'user-1');

    expect(mockPrisma.uploadedFile.update).toHaveBeenCalledWith({
      where: { id: 'file-9' },
      data: { entityType: 'payment', entityId: 'payment-1' },
    });
    expect(mockPrisma.payment.update).toHaveBeenCalledWith({
      where: { id: 'payment-1' },
      data: { receiptFileId: 'file-9' },
    });
  });

  it('no busca comprobante que colgar si no hubo abono', async () => {
    mockDtfRepository.findByIdRaw.mockResolvedValue(makeRecord({ abono: 0 }));
    mockStorageService.getFilesByEntity.mockImplementation((type: string) =>
      Promise.resolve(type === 'DTF_COMPROBANTE' ? [{ id: 'file-9' }] : []),
    );

    await service.convertToOrder('dtf-1', 'user-1');

    expect(mockPrisma.payment.update).not.toHaveBeenCalled();
  });
});
