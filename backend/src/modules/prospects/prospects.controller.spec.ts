import { Test, TestingModule } from '@nestjs/testing';
import { ProspectsController } from './prospects.controller';
import { ProspectsService } from './prospects.service';
import { PrismaService } from '../../database/prisma.service';

describe('ProspectsController', () => {
  let controller: ProspectsController;
  let service: jest.Mocked<ProspectsService>;
  const req = { user: { id: 'u1', email: 'u@e.com' } } as any;

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      getMetrics: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      addContact: jest.fn(),
      removeContact: jest.fn(),
      convert: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProspectsController],
      providers: [
        { provide: ProspectsService, useValue: service },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    controller = module.get<ProspectsController>(ProspectsController);
  });

  it('create delega dto y userId', async () => {
    const dto = { name: 'Juan' } as any;
    service.create.mockResolvedValue({ id: 'p1' } as any);
    await controller.create(dto, req);
    expect(service.create).toHaveBeenCalledWith(dto, 'u1');
  });

  it('findAll delega filtros y userId', async () => {
    const filters = { page: 1 } as any;
    service.findAll.mockResolvedValue({ data: [] } as any);
    await controller.findAll(filters, req);
    expect(service.findAll).toHaveBeenCalledWith(filters, 'u1');
  });

  it('getMetrics delega filtros y userId', async () => {
    const filters = {} as any;
    service.getMetrics.mockResolvedValue({} as any);
    await controller.getMetrics(filters, req);
    expect(service.getMetrics).toHaveBeenCalledWith(filters, 'u1');
  });

  it('findOne delega id y userId', async () => {
    service.findOne.mockResolvedValue({ id: 'p1' } as any);
    await controller.findOne('p1', req);
    expect(service.findOne).toHaveBeenCalledWith('p1', 'u1');
  });

  it('update delega id, dto y userId', async () => {
    const dto = { name: 'Nuevo' } as any;
    service.update.mockResolvedValue({ id: 'p1' } as any);
    await controller.update('p1', dto, req);
    expect(service.update).toHaveBeenCalledWith('p1', dto, 'u1');
  });

  it('remove delega id y userId', async () => {
    service.remove.mockResolvedValue({ success: true } as any);
    await controller.remove('p1', req);
    expect(service.remove).toHaveBeenCalledWith('p1', 'u1');
  });

  it('addContact delega id, dto y userId', async () => {
    const dto = { medium: 'WHATSAPP' } as any;
    service.addContact.mockResolvedValue({ id: 'c1' } as any);
    await controller.addContact('p1', dto, req);
    expect(service.addContact).toHaveBeenCalledWith('p1', dto, 'u1');
  });

  it('removeContact delega id, contactId y userId', async () => {
    service.removeContact.mockResolvedValue(undefined as any);
    await controller.removeContact('p1', 'c1', req);
    expect(service.removeContact).toHaveBeenCalledWith('p1', 'c1', 'u1');
  });

  it('convert delega id, dto y userId', async () => {
    const dto = { clientId: 'cli1' } as any;
    service.convert.mockResolvedValue({ id: 'p1' } as any);
    await controller.convert('p1', dto, req);
    expect(service.convert).toHaveBeenCalledWith('p1', dto, 'u1');
  });
});
