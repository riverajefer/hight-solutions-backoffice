import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { ClientsRepository } from './clients.repository';
import { LocationsService } from '../locations/locations.service';
import { PersonType } from '../../generated/prisma';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockClientsRepository = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByEmail: jest.fn(),
  findByEmailExcludingId: jest.fn(),
  findAllEmails: jest.fn(),
  create: jest.fn(),
  createMany: jest.fn(),
  update: jest.fn(),
  updateSpecialCondition: jest.fn(),
};

const mockLocationsService = {
  findDepartmentById: jest.fn(),
  validateCityBelongsToDepartment: jest.fn(),
  findAllDepartments: jest.fn(),
  findCityByNameAndDepartment: jest.fn(),
};

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const mockClient = {
  id: 'client-1',
  name: 'Cliente ABC S.A.S',
  email: 'abc@cliente.com',
  phone: '3001234567',
  personType: PersonType.EMPRESA,
  nit: '900123456',
  cedula: null,
  manager: 'John Doe',
  encargado: null,
  departmentId: 'dept-1',
  cityId: 'city-1',
  isActive: true,
};

const mockNaturalClient = {
  ...mockClient,
  id: 'client-2',
  email: 'natural@cliente.com',
  personType: PersonType.NATURAL,
  nit: null,
  cedula: '1234567890',
};

const createEmpresaDto = {
  name: 'Empresa Nueva S.A.S',
  email: 'nueva@empresa.com',
  phone: '3109876543',
  personType: PersonType.EMPRESA,
  nit: '800987654',
  cedula: undefined,
  manager: 'Jane Doe',
  departmentId: 'dept-1',
  cityId: 'city-1',
};

const createNaturalDto = {
  name: 'Persona Natural',
  email: 'natural@nuevo.com',
  phone: '3005551234',
  personType: PersonType.NATURAL,
  nit: undefined,
  cedula: '9876543210',
  departmentId: 'dept-1',
  cityId: 'city-1',
};

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------
describe('ClientsService', () => {
  let service: ClientsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientsService,
        { provide: ClientsRepository, useValue: mockClientsRepository },
        { provide: LocationsService, useValue: mockLocationsService },
      ],
    }).compile();

    service = module.get<ClientsService>(ClientsService);

    // Default happy-path stubs
    mockClientsRepository.findByEmail.mockResolvedValue(null);
    mockClientsRepository.findById.mockResolvedValue(mockClient);
    mockClientsRepository.create.mockResolvedValue(mockClient);
    mockLocationsService.findDepartmentById.mockResolvedValue({ id: 'dept-1' });
    mockLocationsService.validateCityBelongsToDepartment.mockResolvedValue(true);
  });

  afterEach(() => jest.clearAllMocks());

  // ---------------------------------------------------------------------------
  // findAll
  // ---------------------------------------------------------------------------
  describe('findAll', () => {
    it('should delegate to clientsRepository.findAll with includeInactive=false by default', async () => {
      mockClientsRepository.findAll.mockResolvedValue([mockClient]);

      const result = await service.findAll();

      expect(mockClientsRepository.findAll).toHaveBeenCalledWith(false);
      expect(result).toEqual([mockClient]);
    });

    it('should pass includeInactive=true when requested', async () => {
      mockClientsRepository.findAll.mockResolvedValue([mockClient]);

      await service.findAll(true);

      expect(mockClientsRepository.findAll).toHaveBeenCalledWith(true);
    });
  });

  // ---------------------------------------------------------------------------
  // findOne
  // ---------------------------------------------------------------------------
  describe('findOne', () => {
    it('should return the client when found', async () => {
      const result = await service.findOne('client-1');

      expect(mockClientsRepository.findById).toHaveBeenCalledWith('client-1');
      expect(result).toEqual(mockClient);
    });

    it('should throw NotFoundException when client does not exist', async () => {
      mockClientsRepository.findById.mockResolvedValue(null);

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
      mockClientsRepository.findByEmail.mockResolvedValue(mockClient);

      await expect(service.create(createEmpresaDto as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should call locationsService.findDepartmentById with the provided departmentId', async () => {
      await service.create(createEmpresaDto as any);

      expect(mockLocationsService.findDepartmentById).toHaveBeenCalledWith(
        'dept-1',
      );
    });

    it('should throw BadRequestException when city does not belong to department', async () => {
      mockLocationsService.validateCityBelongsToDepartment.mockResolvedValue(
        false,
      );

      await expect(service.create(createEmpresaDto as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when personType is EMPRESA and nit is missing', async () => {
      const dto = { ...createEmpresaDto, nit: undefined };

      await expect(service.create(dto as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should allow NATURAL personType without nit', async () => {
      mockClientsRepository.create.mockResolvedValue(mockNaturalClient);

      await service.create(createNaturalDto as any);

      expect(mockClientsRepository.create).toHaveBeenCalled();
    });

    it('should set nit=null for NATURAL personType', async () => {
      mockClientsRepository.create.mockResolvedValue(mockNaturalClient);

      await service.create(createNaturalDto as any);

      const createArg = mockClientsRepository.create.mock.calls[0][0];
      expect(createArg.nit).toBeNull();
    });

    it('should set cedula=null for EMPRESA personType', async () => {
      await service.create(createEmpresaDto as any);

      const createArg = mockClientsRepository.create.mock.calls[0][0];
      expect(createArg.cedula).toBeNull();
    });

    it('should call repository.create with department and city as connect relations', async () => {
      await service.create(createEmpresaDto as any);

      expect(mockClientsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          department: { connect: { id: 'dept-1' } },
          city: { connect: { id: 'city-1' } },
        }),
      );
    });

    it('should return the created client', async () => {
      const result = await service.create(createEmpresaDto as any);

      expect(result).toEqual(mockClient);
    });
  });

  // ---------------------------------------------------------------------------
  // update
  // ---------------------------------------------------------------------------
  describe('update', () => {
    it('should throw NotFoundException when client does not exist', async () => {
      mockClientsRepository.findById.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', { name: 'New Name' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when new email already belongs to another client', async () => {
      mockClientsRepository.findByEmailExcludingId.mockResolvedValue({
        id: 'other-client',
      });

      await expect(
        service.update('client-1', { email: 'other@cliente.com' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should NOT check email uniqueness when email is unchanged', async () => {
      mockClientsRepository.update.mockResolvedValue(mockClient);

      await service.update('client-1', { email: 'abc@cliente.com' });

      expect(mockClientsRepository.findByEmailExcludingId).not.toHaveBeenCalled();
    });

    it('should validate department when departmentId changes', async () => {
      mockClientsRepository.update.mockResolvedValue(mockClient);

      await service.update('client-1', { departmentId: 'dept-2' });

      expect(mockLocationsService.findDepartmentById).toHaveBeenCalledWith(
        'dept-2',
      );
    });

    it('should validate city belongs to department when city changes', async () => {
      mockClientsRepository.update.mockResolvedValue(mockClient);

      await service.update('client-1', { cityId: 'city-2' });

      expect(
        mockLocationsService.validateCityBelongsToDepartment,
      ).toHaveBeenCalled();
    });

    it('should throw BadRequestException when changing to EMPRESA personType without nit', async () => {
      mockClientsRepository.findById.mockResolvedValue(mockNaturalClient);

      await expect(
        service.update('client-2', { personType: PersonType.EMPRESA }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow changing to EMPRESA when nit is already set on existing record', async () => {
      const naturalWithNit = { ...mockNaturalClient, nit: '900888777' };
      mockClientsRepository.findById.mockResolvedValue(naturalWithNit);
      mockClientsRepository.update.mockResolvedValue({
        ...naturalWithNit,
        personType: PersonType.EMPRESA,
      });

      await service.update('client-2', { personType: PersonType.EMPRESA });

      expect(mockClientsRepository.update).toHaveBeenCalled();
    });

    it('should set nit=null when updating personType to NATURAL', async () => {
      mockClientsRepository.update.mockResolvedValue(mockNaturalClient);

      await service.update('client-1', { personType: PersonType.NATURAL });

      const updateArg = mockClientsRepository.update.mock.calls[0][1];
      expect(updateArg.nit).toBeNull();
    });

    it('should set cedula=null when updating personType to EMPRESA', async () => {
      mockClientsRepository.findById.mockResolvedValue({
        ...mockNaturalClient,
        nit: '900111222',
      });
      mockClientsRepository.update.mockResolvedValue(mockClient);

      await service.update('client-2', {
        personType: PersonType.EMPRESA,
        nit: '900111222',
      });

      const updateArg = mockClientsRepository.update.mock.calls[0][1];
      expect(updateArg.cedula).toBeNull();
    });

    it('should include department connect when departmentId is provided', async () => {
      mockClientsRepository.update.mockResolvedValue(mockClient);

      await service.update('client-1', { departmentId: 'dept-2' });

      expect(mockClientsRepository.update).toHaveBeenCalledWith(
        'client-1',
        expect.objectContaining({
          department: { connect: { id: 'dept-2' } },
        }),
      );
    });

    it('should include city connect when cityId is provided', async () => {
      mockClientsRepository.update.mockResolvedValue(mockClient);

      await service.update('client-1', { cityId: 'city-2' });

      expect(mockClientsRepository.update).toHaveBeenCalledWith(
        'client-1',
        expect.objectContaining({
          city: { connect: { id: 'city-2' } },
        }),
      );
    });

    it('should return the updated client', async () => {
      const updated = { ...mockClient, name: 'Nuevo Nombre' };
      mockClientsRepository.update.mockResolvedValue(updated);

      const result = await service.update('client-1', { name: 'Nuevo Nombre' });

      expect(result).toEqual(updated);
    });
  });

  // ---------------------------------------------------------------------------
  // updateSpecialCondition
  // ---------------------------------------------------------------------------
  describe('updateSpecialCondition', () => {
    it('should throw NotFoundException when client does not exist', async () => {
      mockClientsRepository.findById.mockResolvedValue(null);

      await expect(
        service.updateSpecialCondition('nonexistent', 'VIP'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should call repository.updateSpecialCondition with the provided value', async () => {
      mockClientsRepository.updateSpecialCondition.mockResolvedValue(mockClient);

      await service.updateSpecialCondition('client-1', 'Condición especial VIP');

      expect(mockClientsRepository.updateSpecialCondition).toHaveBeenCalledWith(
        'client-1',
        'Condición especial VIP',
      );
    });

    it('should pass null when specialCondition is undefined', async () => {
      mockClientsRepository.updateSpecialCondition.mockResolvedValue(mockClient);

      await service.updateSpecialCondition('client-1', undefined);

      expect(mockClientsRepository.updateSpecialCondition).toHaveBeenCalledWith(
        'client-1',
        null,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // remove
  // ---------------------------------------------------------------------------
  describe('remove', () => {
    it('should throw NotFoundException when client does not exist', async () => {
      mockClientsRepository.findById.mockResolvedValue(null);

      await expect(service.remove('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should call repository.update with isActive=false for soft delete', async () => {
      mockClientsRepository.update.mockResolvedValue(undefined);

      await service.remove('client-1');

      expect(mockClientsRepository.update).toHaveBeenCalledWith('client-1', {
        isActive: false,
      });
    });

    it('should return a success message', async () => {
      mockClientsRepository.update.mockResolvedValue(undefined);

      const result = await service.remove('client-1');

      expect(result).toEqual({
        message: 'Cliente con ID client-1 eliminado correctamente',
      });
    });
  });

  // ---------------------------------------------------------------------------
  // uploadClients
  // ---------------------------------------------------------------------------
  describe('uploadClients', () => {
    const headers = 'name,email,phone,personType,department,city,nit,cedula';
    const validRow =
      'Empresa Test S.A.S,test@empresa.com,3001234567,EMPRESA,Cundinamarca,Bogotá,900111222,';

    const buildCsv = (...rows: string[]) =>
      Buffer.from([headers, ...rows].join('\n'));

    beforeEach(() => {
      mockLocationsService.findAllDepartments.mockResolvedValue([
        { id: 'dept-1', name: 'Cundinamarca' },
      ]);
      mockLocationsService.findCityByNameAndDepartment.mockResolvedValue({
        id: 'city-1',
        name: 'Bogotá',
      });
      mockClientsRepository.findAllEmails.mockResolvedValue([]);
      mockClientsRepository.createMany.mockResolvedValue({ count: 1 });
    });

    it('should throw BadRequestException when CSV has only headers (no data rows)', async () => {
      const csv = Buffer.from(headers);

      await expect(service.uploadClients(csv)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when required headers are missing', async () => {
      const badCsv = Buffer.from('name,email\nAlicia,alice@test.com');

      await expect(service.uploadClients(badCsv)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return successful result for a valid CSV row', async () => {
      const csv = buildCsv(validRow);

      const result = await service.uploadClients(csv);

      expect(result.total).toBe(1);
      expect(result.successful).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should call clientsRepository.createMany for valid rows', async () => {
      const csv = buildCsv(validRow);

      await service.uploadClients(csv);

      expect(mockClientsRepository.createMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'Empresa Test S.A.S',
            email: 'test@empresa.com',
          }),
        ]),
      );
    });

    it('should collect error for row with invalid email format', async () => {
      const badRow = 'Empresa,bad-email,3001234567,EMPRESA,Cundinamarca,Bogotá,900111222,';
      const csv = buildCsv(badRow);

      const result = await service.uploadClients(csv);

      expect(result.failed).toBe(1);
      expect(result.errors[0].error).toContain('email tiene formato inválido');
    });

    it('should collect error for EMPRESA row missing nit', async () => {
      const badRow = 'Empresa Sin NIT,ok@test.com,3001234567,EMPRESA,Cundinamarca,Bogotá,,';
      const csv = buildCsv(badRow);

      const result = await service.uploadClients(csv);

      expect(result.failed).toBe(1);
      expect(result.errors[0].error).toContain('nit es requerido');
    });

    it('should collect error for invalid personType value', async () => {
      const badRow = 'Test,ok@test.com,3001234567,INVALIDO,Cundinamarca,Bogotá,,';
      const csv = buildCsv(badRow);

      const result = await service.uploadClients(csv);

      expect(result.failed).toBe(1);
      expect(result.errors[0].error).toContain('personType debe ser NATURAL o EMPRESA');
    });

    it('should collect error when department name is not found', async () => {
      mockLocationsService.findAllDepartments.mockResolvedValue([]);
      const badRow = 'Test,ok@test.com,3001234567,NATURAL,Departamento Falso,Ciudad,,';
      const csv = buildCsv(badRow);

      const result = await service.uploadClients(csv);

      expect(result.failed).toBe(1);
      expect(result.errors[0].error).toContain('Departamento');
    });

    it('should collect error when city is not found in department', async () => {
      mockLocationsService.findCityByNameAndDepartment.mockResolvedValue(null);
      const badRow =
        'Test,ok@test.com,3001234567,NATURAL,Cundinamarca,Ciudad Inexistente,,';
      const csv = buildCsv(badRow);

      const result = await service.uploadClients(csv);

      expect(result.failed).toBe(1);
      expect(result.errors[0].error).toContain('Ciudad');
    });

    it('should collect error for email already existing in the database', async () => {
      mockClientsRepository.findAllEmails.mockResolvedValue([
        'test@empresa.com',
      ]);
      const csv = buildCsv(validRow);

      const result = await service.uploadClients(csv);

      expect(result.failed).toBe(1);
      expect(result.errors[0].error).toContain('ya existe en la base de datos');
    });

    it('should collect error for duplicate email within the same CSV', async () => {
      const csv = buildCsv(validRow, validRow); // same email twice

      const result = await service.uploadClients(csv);

      // First row succeeds, second row fails with duplicate
      expect(result.failed).toBe(1);
      expect(result.errors[0].row).toBe(3);
      expect(result.errors[0].error).toContain('duplicado dentro del CSV');
    });

    it('should report correct row number for errors (row 1 = headers)', async () => {
      const badRow = 'X,bad-email,3001234567,EMPRESA,Cundinamarca,Bogotá,900111222,';
      const csv = buildCsv(badRow);

      const result = await service.uploadClients(csv);

      expect(result.errors[0].row).toBe(2);
    });

    it('should not call createMany when there are no valid rows', async () => {
      const badRow = 'X,bad-email,3001234567,EMPRESA,Cundinamarca,Bogotá,900111222,';
      const csv = buildCsv(badRow);

      await service.uploadClients(csv);

      expect(mockClientsRepository.createMany).not.toHaveBeenCalled();
    });

    it('should strip BOM from the beginning of the CSV', async () => {
      const csvWithBom = Buffer.from('\uFEFF' + headers + '\n' + validRow);

      const result = await service.uploadClients(csvWithBom);

      // Should parse correctly despite BOM
      expect(result.failed).toBe(0);
    });

    it('should use city cache to avoid redundant lookups for same department+city', async () => {
      const row2 =
        'Segunda Empresa,second@empresa.com,3009999888,EMPRESA,Cundinamarca,Bogotá,900999888,';
      const csv = buildCsv(validRow, row2);

      await service.uploadClients(csv);

      // City lookup should only be called once even with 2 rows in same city
      expect(
        mockLocationsService.findCityByNameAndDepartment,
      ).toHaveBeenCalledTimes(1);
    });

    it('should set nit=null for NATURAL rows', async () => {
      const naturalRow =
        'Persona Natural,natural@test.com,3001111111,NATURAL,Cundinamarca,Bogotá,,9876543210';
      const csv = buildCsv(naturalRow);

      await service.uploadClients(csv);

      const createdData = mockClientsRepository.createMany.mock.calls[0][0];
      expect(createdData[0].nit).toBeNull();
    });
  });
});
