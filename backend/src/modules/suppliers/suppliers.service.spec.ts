import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { SuppliersRepository } from './suppliers.repository';
import { LocationsService } from '../locations/locations.service';
import { PersonType } from '../../generated/prisma';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockSuppliersRepository = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByEmail: jest.fn(),
  findByEmailExcludingId: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
};

const mockLocationsService = {
  findDepartmentById: jest.fn(),
  validateCityBelongsToDepartment: jest.fn(),
};

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const mockSupplier = {
  id: 'supplier-1',
  name: 'Proveedor ABC',
  email: 'abc@proveedor.com',
  phone: '3001234567',
  personType: PersonType.EMPRESA,
  nit: '900123456',
  departmentId: 'dept-1',
  cityId: 'city-1',
  isActive: true,
};

const mockNaturalSupplier = {
  ...mockSupplier,
  id: 'supplier-2',
  personType: PersonType.NATURAL,
  nit: null,
};

const createDto = {
  name: 'Proveedor XYZ',
  email: 'xyz@proveedor.com',
  phone: '3109876543',
  personType: PersonType.EMPRESA,
  nit: '800987654',
  departmentId: 'dept-1',
  cityId: 'city-1',
};

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------
describe('SuppliersService', () => {
  let service: SuppliersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuppliersService,
        { provide: SuppliersRepository, useValue: mockSuppliersRepository },
        { provide: LocationsService, useValue: mockLocationsService },
      ],
    }).compile();

    service = module.get<SuppliersService>(SuppliersService);

    // Default happy-path stubs
    mockSuppliersRepository.findByEmail.mockResolvedValue(null);
    mockLocationsService.findDepartmentById.mockResolvedValue({ id: 'dept-1' });
    mockLocationsService.validateCityBelongsToDepartment.mockResolvedValue(true);
    mockSuppliersRepository.create.mockResolvedValue(mockSupplier);
    mockSuppliersRepository.findById.mockResolvedValue(mockSupplier);
  });

  afterEach(() => jest.clearAllMocks());

  // ---------------------------------------------------------------------------
  // findAll
  // ---------------------------------------------------------------------------
  describe('findAll', () => {
    it('should delegate to suppliersRepository.findAll with includeInactive=false by default', async () => {
      mockSuppliersRepository.findAll.mockResolvedValue([mockSupplier]);

      const result = await service.findAll();

      expect(mockSuppliersRepository.findAll).toHaveBeenCalledWith(false);
      expect(result).toEqual([mockSupplier]);
    });

    it('should pass includeInactive=true when requested', async () => {
      mockSuppliersRepository.findAll.mockResolvedValue([mockSupplier]);

      await service.findAll(true);

      expect(mockSuppliersRepository.findAll).toHaveBeenCalledWith(true);
    });
  });

  // ---------------------------------------------------------------------------
  // findOne
  // ---------------------------------------------------------------------------
  describe('findOne', () => {
    it('should return the supplier when found', async () => {
      const result = await service.findOne('supplier-1');

      expect(mockSuppliersRepository.findById).toHaveBeenCalledWith('supplier-1');
      expect(result).toEqual(mockSupplier);
    });

    it('should throw NotFoundException when supplier does not exist', async () => {
      mockSuppliersRepository.findById.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // create
  // ---------------------------------------------------------------------------
  describe('create', () => {
    it('should throw BadRequestException when email already exists', async () => {
      mockSuppliersRepository.findByEmail.mockResolvedValue(mockSupplier);

      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should call locationsService.findDepartmentById with departmentId', async () => {
      await service.create(createDto);

      expect(mockLocationsService.findDepartmentById).toHaveBeenCalledWith(
        'dept-1',
      );
    });

    it('should throw BadRequestException when city does not belong to department', async () => {
      mockLocationsService.validateCityBelongsToDepartment.mockResolvedValue(
        false,
      );

      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when personType is EMPRESA and nit is missing', async () => {
      const dto = { ...createDto, nit: undefined };

      await expect(service.create(dto as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should allow NATURAL personType without nit', async () => {
      const dto = {
        ...createDto,
        personType: PersonType.NATURAL,
        nit: undefined,
      };

      await service.create(dto as any);

      expect(mockSuppliersRepository.create).toHaveBeenCalled();
    });

    it('should call repository.create with department and city as connect relations', async () => {
      await service.create(createDto);

      expect(mockSuppliersRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          department: { connect: { id: 'dept-1' } },
          city: { connect: { id: 'city-1' } },
        }),
      );
    });

    it('should return the created supplier', async () => {
      const result = await service.create(createDto);

      expect(result).toEqual(mockSupplier);
    });
  });

  // ---------------------------------------------------------------------------
  // update
  // ---------------------------------------------------------------------------
  describe('update', () => {
    it('should throw NotFoundException when supplier does not exist', async () => {
      mockSuppliersRepository.findById.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', { name: 'New Name' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when new email already belongs to another supplier', async () => {
      mockSuppliersRepository.findByEmailExcludingId.mockResolvedValue({
        id: 'other-supplier',
      });

      await expect(
        service.update('supplier-1', { email: 'other@proveedor.com' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should NOT check email uniqueness when email is unchanged', async () => {
      await service.update('supplier-1', { email: 'abc@proveedor.com' });

      expect(mockSuppliersRepository.findByEmailExcludingId).not.toHaveBeenCalled();
    });

    it('should validate department when departmentId changes', async () => {
      await service.update('supplier-1', { departmentId: 'dept-2' });

      expect(mockLocationsService.findDepartmentById).toHaveBeenCalledWith(
        'dept-2',
      );
    });

    it('should validate city belongs to department when city changes', async () => {
      await service.update('supplier-1', { cityId: 'city-2' });

      expect(
        mockLocationsService.validateCityBelongsToDepartment,
      ).toHaveBeenCalled();
    });

    it('should throw BadRequestException when changing to EMPRESA personType without nit', async () => {
      mockSuppliersRepository.findById.mockResolvedValue(mockNaturalSupplier);

      await expect(
        service.update('supplier-2', { personType: PersonType.EMPRESA }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow changing to EMPRESA when nit is provided in update', async () => {
      mockSuppliersRepository.findById.mockResolvedValue(mockNaturalSupplier);
      mockSuppliersRepository.update.mockResolvedValue({
        ...mockNaturalSupplier,
        personType: PersonType.EMPRESA,
        nit: '900111222',
      });

      await service.update('supplier-2', {
        personType: PersonType.EMPRESA,
        nit: '900111222',
      });

      expect(mockSuppliersRepository.update).toHaveBeenCalled();
    });

    it('should include department connect when departmentId is provided', async () => {
      mockSuppliersRepository.update.mockResolvedValue(mockSupplier);

      await service.update('supplier-1', { departmentId: 'dept-2' });

      expect(mockSuppliersRepository.update).toHaveBeenCalledWith(
        'supplier-1',
        expect.objectContaining({
          department: { connect: { id: 'dept-2' } },
        }),
      );
    });

    it('should include city connect when cityId is provided', async () => {
      mockSuppliersRepository.update.mockResolvedValue(mockSupplier);

      await service.update('supplier-1', { cityId: 'city-2' });

      expect(mockSuppliersRepository.update).toHaveBeenCalledWith(
        'supplier-1',
        expect.objectContaining({
          city: { connect: { id: 'city-2' } },
        }),
      );
    });

    it('should return the updated supplier', async () => {
      const updated = { ...mockSupplier, name: 'Nuevo Nombre' };
      mockSuppliersRepository.update.mockResolvedValue(updated);

      const result = await service.update('supplier-1', { name: 'Nuevo Nombre' });

      expect(result).toEqual(updated);
    });
  });

  // ---------------------------------------------------------------------------
  // remove
  // ---------------------------------------------------------------------------
  describe('remove', () => {
    it('should throw NotFoundException when supplier does not exist', async () => {
      mockSuppliersRepository.findById.mockResolvedValue(null);

      await expect(service.remove('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should call repository.update with isActive=false for soft delete', async () => {
      mockSuppliersRepository.update.mockResolvedValue(undefined);

      await service.remove('supplier-1');

      expect(mockSuppliersRepository.update).toHaveBeenCalledWith('supplier-1', {
        isActive: false,
      });
    });

    it('should return a success message', async () => {
      mockSuppliersRepository.update.mockResolvedValue(undefined);

      const result = await service.remove('supplier-1');

      expect(result).toEqual({
        message: 'Proveedor con ID supplier-1 eliminado correctamente',
      });
    });
  });
});
