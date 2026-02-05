import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ClientsRepository } from './clients.repository';
import { LocationsService } from '../locations/locations.service';
import { CreateClientDto, UpdateClientDto } from './dto';
import { PersonType } from '../../generated/prisma';

@Injectable()
export class ClientsService {
  constructor(
    private readonly clientsRepository: ClientsRepository,
    private readonly locationsService: LocationsService,
  ) {}

  /**
   * Get all clients
   */
  async findAll(includeInactive = false) {
    return this.clientsRepository.findAll(includeInactive);
  }

  /**
   * Get client by ID
   */
  async findOne(id: string) {
    const client = await this.clientsRepository.findById(id);

    if (!client) {
      throw new NotFoundException(`Cliente con ID ${id} no encontrado`);
    }

    return client;
  }

  /**
   * Create a new client
   */
  async create(createClientDto: CreateClientDto) {
    // Validate email uniqueness
    const existingClient = await this.clientsRepository.findByEmail(
      createClientDto.email,
    );

    if (existingClient) {
      throw new BadRequestException(
        `Ya existe un cliente con el email "${createClientDto.email}"`,
      );
    }

    // Validate department exists
    await this.locationsService.findDepartmentById(createClientDto.departmentId);

    // Validate city belongs to department
    const cityBelongs = await this.locationsService.validateCityBelongsToDepartment(
      createClientDto.cityId,
      createClientDto.departmentId,
    );

    if (!cityBelongs) {
      throw new BadRequestException(
        'La ciudad seleccionada no pertenece al departamento indicado',
      );
    }

    // Validate NIT for EMPRESA type
    if (createClientDto.personType === PersonType.EMPRESA && !createClientDto.nit) {
      throw new BadRequestException(
        'El NIT es requerido para clientes de tipo EMPRESA',
      );
    }

    // Set NIT to null for NATURAL type
    const nit = createClientDto.personType === PersonType.NATURAL ? null : createClientDto.nit;

    return this.clientsRepository.create({
      name: createClientDto.name,
      manager: createClientDto.manager,
      phone: createClientDto.phone,
      address: createClientDto.address,
      email: createClientDto.email,
      personType: createClientDto.personType,
      nit,
      department: { connect: { id: createClientDto.departmentId } },
      city: { connect: { id: createClientDto.cityId } },
    });
  }

  /**
   * Update a client
   */
  async update(id: string, updateClientDto: UpdateClientDto) {
    // Verify client exists
    const existingClient = await this.findOne(id);

    // If email is being changed, check for duplicates
    if (updateClientDto.email && updateClientDto.email !== existingClient.email) {
      const clientWithEmail = await this.clientsRepository.findByEmailExcludingId(
        updateClientDto.email,
        id,
      );

      if (clientWithEmail) {
        throw new BadRequestException(
          `Ya existe un cliente con el email "${updateClientDto.email}"`,
        );
      }
    }

    // If department is being changed, validate it exists
    if (updateClientDto.departmentId) {
      await this.locationsService.findDepartmentById(updateClientDto.departmentId);
    }

    // If city or department is being changed, validate city belongs to department
    const finalDepartmentId = updateClientDto.departmentId || existingClient.departmentId;
    const finalCityId = updateClientDto.cityId || existingClient.cityId;

    if (updateClientDto.cityId || updateClientDto.departmentId) {
      const cityBelongs = await this.locationsService.validateCityBelongsToDepartment(
        finalCityId,
        finalDepartmentId,
      );

      if (!cityBelongs) {
        throw new BadRequestException(
          'La ciudad seleccionada no pertenece al departamento indicado',
        );
      }
    }

    // Determine final personType
    const finalPersonType = updateClientDto.personType || existingClient.personType;

    // Validate NIT for EMPRESA type
    if (finalPersonType === PersonType.EMPRESA) {
      const finalNit = updateClientDto.nit !== undefined ? updateClientDto.nit : existingClient.nit;
      if (!finalNit) {
        throw new BadRequestException(
          'El NIT es requerido para clientes de tipo EMPRESA',
        );
      }
    }

    // Build update data
    const updateData: any = {};

    if (updateClientDto.name !== undefined) updateData.name = updateClientDto.name;
    if (updateClientDto.manager !== undefined) updateData.manager = updateClientDto.manager;
    if (updateClientDto.phone !== undefined) updateData.phone = updateClientDto.phone;
    if (updateClientDto.address !== undefined) updateData.address = updateClientDto.address;
    if (updateClientDto.email !== undefined) updateData.email = updateClientDto.email;
    if (updateClientDto.personType !== undefined) updateData.personType = updateClientDto.personType;
    if (updateClientDto.isActive !== undefined) updateData.isActive = updateClientDto.isActive;

    // Handle NIT based on personType
    if (updateClientDto.nit !== undefined) {
      updateData.nit = finalPersonType === PersonType.NATURAL ? null : updateClientDto.nit;
    } else if (updateClientDto.personType === PersonType.NATURAL) {
      updateData.nit = null;
    }

    // Handle department/city updates
    if (updateClientDto.departmentId) {
      updateData.department = { connect: { id: updateClientDto.departmentId } };
    }
    if (updateClientDto.cityId) {
      updateData.city = { connect: { id: updateClientDto.cityId } };
    }

    return this.clientsRepository.update(id, updateData);
  }

  /**
   * Soft delete a client
   */
  async remove(id: string) {
    // Verify client exists
    await this.findOne(id);

    // Soft delete
    await this.clientsRepository.update(id, { isActive: false });

    return { message: `Cliente con ID ${id} eliminado correctamente` };
  }

  /**
   * Bulk upload clients from a CSV buffer.
   * Parses, validates each row, resolves department/city names to IDs,
   * and inserts all valid rows in a single transaction.
   * Invalid rows are collected as errors in the response.
   */
  async uploadClients(csvBuffer: Buffer) {
    // --- PHASE 1: Parse CSV ---
    const csvString = csvBuffer.toString('utf-8').replace(/^\uFEFF/, ''); // strip BOM
    const lines = csvString
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length < 2) {
      throw new BadRequestException(
        'El CSV debe tener al menos una fila de cabeceras y una fila de datos',
      );
    }

    const headers = lines[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));
    const requiredHeaders = ['name', 'email', 'phone', 'personType', 'department', 'city'];
    const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h));

    if (missingHeaders.length > 0) {
      throw new BadRequestException(
        `Cabeceras faltantes en el CSV: ${missingHeaders.join(', ')}`,
      );
    }

    // Parse a CSV line respecting quoted fields
    const parseCsvLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    // Map header name → column index
    const headerIndex = new Map<string, number>();
    headers.forEach((h, i) => headerIndex.set(h, i));

    const getField = (values: string[], fieldName: string): string => {
      const idx = headerIndex.get(fieldName);
      return idx !== undefined && values[idx] !== undefined
        ? values[idx].replace(/^["']|["']$/g, '')
        : '';
    };

    // --- PHASE 2: Validate rows and resolve locations ---
    const errors: { row: number; error: string }[] = [];
    const validatedRows: Array<{
      name: string;
      email: string;
      phone: string;
      personType: PersonType;
      departmentId: string;
      cityId: string;
      nit: string | null;
      cedula: string | null;
      manager: string | null;
      encargado: string | null;
      landlinePhone: string | null;
      address: string | null;
    }> = [];

    // Pre-load departments into a map (1 query)
    const allDepartments = await this.locationsService.findAllDepartments();
    const deptMap = new Map<string, { id: string; name: string }>();
    for (const dept of allDepartments) {
      deptMap.set(dept.name.toLowerCase(), { id: dept.id, name: dept.name });
    }

    // Pre-load existing emails into a set (1 query)
    const existingEmails = new Set(
      (await this.clientsRepository.findAllEmails()).map((e) => e.toLowerCase()),
    );

    // Track emails seen within the CSV to detect intra-file duplicates
    const seenEmails = new Set<string>();

    // Lazy city cache: `${departmentId}:${cityNameLower}` → cityId
    const cityCache = new Map<string, string>();

    const dataLines = lines.slice(1);

    for (let i = 0; i < dataLines.length; i++) {
      const rowNumber = i + 2; // row 1 = headers
      const values = parseCsvLine(dataLines[i]);
      const rowErrors: string[] = [];

      const name = getField(values, 'name');
      const email = getField(values, 'email');
      const phone = getField(values, 'phone');
      const personTypeRaw = getField(values, 'personType');
      const departmentName = getField(values, 'department') || 'Cundinamarca';
      const cityName = getField(values, 'city') || 'Bogotá';
      const nit = getField(values, 'nit') || null;
      const cedula = getField(values, 'cedula') || null;
      const manager = getField(values, 'manager') || null;
      const encargado = getField(values, 'encargado') || null;
      const landlinePhone = getField(values, 'landlinePhone') || null;
      const address = getField(values, 'address') || null;

      // Required field validations
      if (!name || name.length < 2 || name.length > 200) {
        rowErrors.push('name es requerido (2-200 caracteres)');
      }
      if (!email) {
        rowErrors.push('email es requerido');
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        rowErrors.push('email tiene formato inválido');
      }
      if (!phone || phone.length < 10 || phone.length > 20) {
        rowErrors.push('phone es requerido (10-20 caracteres)');
      }
      if (personTypeRaw !== 'NATURAL' && personTypeRaw !== 'EMPRESA') {
        rowErrors.push('personType debe ser NATURAL o EMPRESA');
      }
      // Optional field length validations
      if (nit && (nit.length < 5 || nit.length > 20)) {
        rowErrors.push('nit debe tener entre 5 y 20 caracteres');
      }
      if (cedula && (cedula.length < 6 || cedula.length > 15)) {
        rowErrors.push('cedula debe tener entre 6 y 15 caracteres');
      }
      if (manager && manager.length > 200) {
        rowErrors.push('manager no puede exceder 200 caracteres');
      }
      if (encargado && encargado.length > 200) {
        rowErrors.push('encargado no puede exceder 200 caracteres');
      }
      if (landlinePhone && landlinePhone.length > 20) {
        rowErrors.push('landlinePhone no puede exceder 20 caracteres');
      }
      if (address && address.length > 300) {
        rowErrors.push('address no puede exceder 300 caracteres');
      }

      // NIT required for EMPRESA
      if (personTypeRaw === 'EMPRESA' && !nit) {
        rowErrors.push('nit es requerido para clientes de tipo EMPRESA');
      }

      // Email uniqueness checks
      if (email) {
        const emailLower = email.toLowerCase();
        if (existingEmails.has(emailLower)) {
          rowErrors.push(`Email "${email}" ya existe en la base de datos`);
        } else if (seenEmails.has(emailLower)) {
          rowErrors.push(`Email "${email}" está duplicado dentro del CSV`);
        }
        seenEmails.add(emailLower);
      }

      // Resolve department name → ID
      let departmentId: string | null = null;
      if (departmentName) {
        const dept = deptMap.get(departmentName.toLowerCase());
        if (!dept) {
          rowErrors.push(`Departamento "${departmentName}" no encontrado`);
        } else {
          departmentId = dept.id;
        }
      }

      // Resolve city name → ID (only if department resolved)
      let cityId: string | null = null;
      if (cityName && departmentId) {
        const cacheKey = `${departmentId}:${cityName.toLowerCase()}`;
        if (cityCache.has(cacheKey)) {
          cityId = cityCache.get(cacheKey)!;
        } else {
          const city = await this.locationsService.findCityByNameAndDepartment(
            cityName,
            departmentId,
          );
          if (!city) {
            rowErrors.push(
              `Ciudad "${cityName}" no encontrada en el departamento "${departmentName}"`,
            );
          } else {
            cityId = city.id;
            cityCache.set(cacheKey, city.id);
          }
        }
      }

      if (rowErrors.length > 0) {
        errors.push({ row: rowNumber, error: rowErrors.join('; ') });
        continue;
      }

      validatedRows.push({
        name,
        email,
        phone,
        personType: personTypeRaw as PersonType,
        departmentId: departmentId!,
        cityId: cityId!,
        nit: personTypeRaw === 'NATURAL' ? null : nit,
        cedula,
        manager,
        encargado,
        landlinePhone,
        address,
      });
    }

    // --- PHASE 3: Insert valid rows ---
    if (validatedRows.length > 0) {
      await this.clientsRepository.createMany(validatedRows);
    }

    return {
      total: dataLines.length,
      successful: validatedRows.length,
      failed: errors.length,
      errors,
    };
  }
}
