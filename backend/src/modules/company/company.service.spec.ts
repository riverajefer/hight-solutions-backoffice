// uuid is ESM-only in v9+; StorageService (transitive dep) imports it
jest.mock('uuid', () => ({ v4: jest.fn(() => 'mock-uuid') }));

import { Test, TestingModule } from '@nestjs/testing';
import { CompanyService } from './company.service';
import { CompanyRepository } from './company.repository';
import { StorageService } from '../storage/storage.service';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockCompanyRepository = {
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
};

const mockStorageService = {
  getFileUrl: jest.fn(),
};

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const mockCompany = {
  id: 'company-1',
  name: 'High Solutions S.A.S',
  logoLightId: 'file-light',
  logoDarkId: 'file-dark',
  email: 'info@high.com',
  phone: '3001234567',
  nit: '900123456',
};

const companyNoLogos = {
  ...mockCompany,
  logoLightId: null,
  logoDarkId: null,
};

const updateDto = {
  name: 'High Solutions Actualizada',
  email: 'nuevo@high.com',
  logoLightId: 'file-light',
  logoDarkId: 'file-dark',
};

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------
describe('CompanyService', () => {
  let service: CompanyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompanyService,
        { provide: CompanyRepository, useValue: mockCompanyRepository },
        { provide: StorageService, useValue: mockStorageService },
      ],
    }).compile();

    service = module.get<CompanyService>(CompanyService);

    // Default stubs
    mockCompanyRepository.findOne.mockResolvedValue(mockCompany);
    mockStorageService.getFileUrl.mockResolvedValue('https://s3.example.com/file');
    mockCompanyRepository.create.mockResolvedValue(mockCompany);
    mockCompanyRepository.update.mockResolvedValue(mockCompany);
  });

  afterEach(() => jest.clearAllMocks());

  // ---------------------------------------------------------------------------
  // getCompany
  // ---------------------------------------------------------------------------
  describe('getCompany', () => {
    it('should return null when no company record exists', async () => {
      mockCompanyRepository.findOne.mockResolvedValue(null);

      const result = await service.getCompany();

      expect(result).toBeNull();
    });

    it('should return the company with signed URLs for both logos', async () => {
      mockStorageService.getFileUrl
        .mockResolvedValueOnce('https://s3.example.com/light')
        .mockResolvedValueOnce('https://s3.example.com/dark');

      const result = await service.getCompany();

      expect(result).toMatchObject({
        id: 'company-1',
        logoLightUrl: 'https://s3.example.com/light',
        logoDarkUrl: 'https://s3.example.com/dark',
      });
    });

    it('should return undefined logoLightUrl when logoLightId is null', async () => {
      mockCompanyRepository.findOne.mockResolvedValue(companyNoLogos);

      const result = await service.getCompany();

      expect(result!.logoLightUrl).toBeUndefined();
    });

    it('should return undefined logoDarkUrl when logoDarkId is null', async () => {
      mockCompanyRepository.findOne.mockResolvedValue(companyNoLogos);

      const result = await service.getCompany();

      expect(result!.logoDarkUrl).toBeUndefined();
    });

    it('should return undefined logoLightUrl when getFileUrl throws (file deleted)', async () => {
      mockStorageService.getFileUrl.mockRejectedValue(new Error('Not found'));

      const result = await service.getCompany();

      expect(result!.logoLightUrl).toBeUndefined();
      expect(result!.logoDarkUrl).toBeUndefined();
    });

    it('should call storageService.getFileUrl with the correct logoLightId', async () => {
      await service.getCompany();

      expect(mockStorageService.getFileUrl).toHaveBeenCalledWith('file-light');
    });

    it('should call storageService.getFileUrl with the correct logoDarkId', async () => {
      await service.getCompany();

      expect(mockStorageService.getFileUrl).toHaveBeenCalledWith('file-dark');
    });
  });

  // ---------------------------------------------------------------------------
  // upsertCompany
  // ---------------------------------------------------------------------------
  describe('upsertCompany', () => {
    it('should call repository.create when no existing company record', async () => {
      mockCompanyRepository.findOne.mockResolvedValue(null);
      mockCompanyRepository.create.mockResolvedValue(companyNoLogos);

      await service.upsertCompany({ name: 'Nueva Empresa' } as any);

      expect(mockCompanyRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Nueva Empresa' }),
      );
      expect(mockCompanyRepository.update).not.toHaveBeenCalled();
    });

    it('should use empty string for name when dto.name is not provided on create', async () => {
      mockCompanyRepository.findOne.mockResolvedValue(null);
      mockCompanyRepository.create.mockResolvedValue(companyNoLogos);

      await service.upsertCompany({} as any);

      const createArg = mockCompanyRepository.create.mock.calls[0][0];
      expect(createArg.name).toBe('');
    });

    it('should call repository.update when a company record already exists', async () => {
      mockCompanyRepository.update.mockResolvedValue({
        ...mockCompany,
        name: updateDto.name,
      });

      await service.upsertCompany(updateDto as any);

      expect(mockCompanyRepository.update).toHaveBeenCalledWith(
        'company-1',
        expect.objectContaining({ name: updateDto.name }),
      );
      expect(mockCompanyRepository.create).not.toHaveBeenCalled();
    });

    it('should return the company enriched with signed logo URLs after update', async () => {
      mockStorageService.getFileUrl
        .mockResolvedValueOnce('https://s3.example.com/light')
        .mockResolvedValueOnce('https://s3.example.com/dark');

      const result = await service.upsertCompany(updateDto as any);

      expect(result.logoLightUrl).toBe('https://s3.example.com/light');
      expect(result.logoDarkUrl).toBe('https://s3.example.com/dark');
    });

    it('should return the company enriched with signed logo URLs after create', async () => {
      mockCompanyRepository.findOne.mockResolvedValue(null);
      mockCompanyRepository.create.mockResolvedValue(mockCompany);
      mockStorageService.getFileUrl.mockResolvedValue('https://s3.example.com/logo');

      const result = await service.upsertCompany(updateDto as any);

      expect(result.logoLightUrl).toBe('https://s3.example.com/logo');
    });

    it('should set logoLightUrl=undefined when getFileUrl throws after upsert', async () => {
      mockCompanyRepository.update.mockResolvedValue(mockCompany);
      mockStorageService.getFileUrl.mockRejectedValue(new Error('File gone'));

      const result = await service.upsertCompany(updateDto as any);

      expect(result.logoLightUrl).toBeUndefined();
      expect(result.logoDarkUrl).toBeUndefined();
    });
  });
});
