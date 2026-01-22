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
}
