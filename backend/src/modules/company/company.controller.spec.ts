jest.mock('uuid', () => ({ v4: jest.fn(() => 'mock-uuid') }));

import { Test, TestingModule } from '@nestjs/testing';
import { CompanyController } from './company.controller';
import { CompanyService } from './company.service';
import { JwtAuthGuard } from '../auth/guards';
import { PermissionsGuard } from '../../common/guards';

const mockCompanyService = {
  getCompany: jest.fn(),
  upsertCompany: jest.fn(),
};

const mockCompany = {
  id: 'company-1',
  name: 'High Solutions SAS',
  nit: '900123456-7',
  logoLightUrl: 'https://s3.example.com/logo-light.png',
  logoDarkUrl: null,
};

describe('CompanyController', () => {
  let controller: CompanyController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CompanyController],
      providers: [{ provide: CompanyService, useValue: mockCompanyService }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CompanyController>(CompanyController);
  });

  afterEach(() => jest.clearAllMocks());

  describe('getCompany', () => {
    it('should delegate to companyService.getCompany', async () => {
      mockCompanyService.getCompany.mockResolvedValue(mockCompany);

      const result = await controller.getCompany();

      expect(mockCompanyService.getCompany).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockCompany);
    });

    it('should return null when no company exists', async () => {
      mockCompanyService.getCompany.mockResolvedValue(null);

      const result = await controller.getCompany();

      expect(result).toBeNull();
    });
  });

  describe('upsertCompany', () => {
    it('should delegate to companyService.upsertCompany with dto', async () => {
      const dto = { name: 'Nueva Empresa SAS', nit: '900999888-1' } as any;
      mockCompanyService.upsertCompany.mockResolvedValue({ ...mockCompany, ...dto });

      const result = await controller.upsertCompany(dto);

      expect(mockCompanyService.upsertCompany).toHaveBeenCalledWith(dto);
      expect(result).toMatchObject({ name: 'Nueva Empresa SAS' });
    });
  });
});
