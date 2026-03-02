import { Test, TestingModule } from '@nestjs/testing';
import { CompanyRepository } from './company.repository';
import { PrismaService } from '../../database/prisma.service';
import {
  createMockPrismaService,
  MockPrismaService,
} from '../../database/prisma.service.mock';

const mockCompany = {
  id: 'company-1',
  name: 'High Solutions',
  nit: '900123456',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('CompanyRepository', () => {
  let repository: CompanyRepository;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompanyRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    repository = module.get<CompanyRepository>(CompanyRepository);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findOne', () => {
    it('should call company.findFirst and return the first record', async () => {
      prisma.company.findFirst.mockResolvedValue(mockCompany);
      const result = await repository.findOne();
      expect(prisma.company.findFirst).toHaveBeenCalled();
      expect(result).toEqual(mockCompany);
    });

    it('should return null when no company record exists', async () => {
      prisma.company.findFirst.mockResolvedValue(null);
      expect(await repository.findOne()).toBeNull();
    });
  });

  describe('create', () => {
    it('should call company.create with the provided data', async () => {
      prisma.company.create.mockResolvedValue(mockCompany);
      await repository.create({ name: 'High Solutions' } as any);
      expect(prisma.company.create).toHaveBeenCalledWith({
        data: { name: 'High Solutions' },
      });
    });
  });

  describe('update', () => {
    it('should call company.update with the given id and data', async () => {
      prisma.company.update.mockResolvedValue(mockCompany);
      await repository.update('company-1', { name: 'Nombre Actualizado' } as any);
      expect(prisma.company.update).toHaveBeenCalledWith({
        where: { id: 'company-1' },
        data: { name: 'Nombre Actualizado' },
      });
    });
  });
});
