import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SuppliersRepository } from './suppliers.repository';
import { LocationsService } from '../locations/locations.service';
import { CreateSupplierDto, UpdateSupplierDto } from './dto';
import { PersonType } from '../../generated/prisma';

@Injectable()
export class SuppliersService {
  constructor(
    private readonly suppliersRepository: SuppliersRepository,
    private readonly locationsService: LocationsService,
  ) {}

  /**
   * Get all suppliers
   */
  async findAll(includeInactive = false) {
    return this.suppliersRepository.findAll(includeInactive);
  }

  /**
   * Get supplier by ID
   */
  async findOne(id: string) {
    const supplier = await this.suppliersRepository.findById(id);

    if (!supplier) {
      throw new NotFoundException(`Proveedor con ID ${id} no encontrado`);
    }

    return supplier;
  }

  /**
   * Create a new supplier
   */
  async create(createSupplierDto: CreateSupplierDto) {
    // Validate email uniqueness
    const existingSupplier = await this.suppliersRepository.findByEmail(
      createSupplierDto.email,
    );

    if (existingSupplier) {
      throw new BadRequestException(
        `Ya existe un proveedor con el email "${createSupplierDto.email}"`,
      );
    }

    // Validate department exists
    await this.locationsService.findDepartmentById(createSupplierDto.departmentId);

    // Validate city belongs to department
    const cityBelongs = await this.locationsService.validateCityBelongsToDepartment(
      createSupplierDto.cityId,
      createSupplierDto.departmentId,
    );

    if (!cityBelongs) {
      throw new BadRequestException(
        'La ciudad seleccionada no pertenece al departamento indicado',
      );
    }

    // Validate NIT for EMPRESA type
    if (createSupplierDto.personType === PersonType.EMPRESA && !createSupplierDto.nit) {
      throw new BadRequestException(
        'El NIT es requerido para proveedores de tipo EMPRESA',
      );
    }

    // Set NIT to null for NATURAL type
    const nit = createSupplierDto.personType === PersonType.NATURAL ? null : createSupplierDto.nit;

    return this.suppliersRepository.create({
      name: createSupplierDto.name,
      phone: createSupplierDto.phone,
      address: createSupplierDto.address,
      email: createSupplierDto.email,
      personType: createSupplierDto.personType,
      nit,
      department: { connect: { id: createSupplierDto.departmentId } },
      city: { connect: { id: createSupplierDto.cityId } },
    });
  }

  /**
   * Update a supplier
   */
  async update(id: string, updateSupplierDto: UpdateSupplierDto) {
    // Verify supplier exists
    const existingSupplier = await this.findOne(id);

    // If email is being changed, check for duplicates
    if (updateSupplierDto.email && updateSupplierDto.email !== existingSupplier.email) {
      const supplierWithEmail = await this.suppliersRepository.findByEmailExcludingId(
        updateSupplierDto.email,
        id,
      );

      if (supplierWithEmail) {
        throw new BadRequestException(
          `Ya existe un proveedor con el email "${updateSupplierDto.email}"`,
        );
      }
    }

    // If department is being changed, validate it exists
    if (updateSupplierDto.departmentId) {
      await this.locationsService.findDepartmentById(updateSupplierDto.departmentId);
    }

    // If city or department is being changed, validate city belongs to department
    const finalDepartmentId = updateSupplierDto.departmentId || existingSupplier.departmentId;
    const finalCityId = updateSupplierDto.cityId || existingSupplier.cityId;

    if (updateSupplierDto.cityId || updateSupplierDto.departmentId) {
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
    const finalPersonType = updateSupplierDto.personType || existingSupplier.personType;

    // Validate NIT for EMPRESA type
    if (finalPersonType === PersonType.EMPRESA) {
      const finalNit = updateSupplierDto.nit !== undefined ? updateSupplierDto.nit : existingSupplier.nit;
      if (!finalNit) {
        throw new BadRequestException(
          'El NIT es requerido para proveedores de tipo EMPRESA',
        );
      }
    }

    // Build update data
    const updateData: any = {};

    if (updateSupplierDto.name !== undefined) updateData.name = updateSupplierDto.name;
    if (updateSupplierDto.phone !== undefined) updateData.phone = updateSupplierDto.phone;
    if (updateSupplierDto.address !== undefined) updateData.address = updateSupplierDto.address;
    if (updateSupplierDto.email !== undefined) updateData.email = updateSupplierDto.email;
    if (updateSupplierDto.personType !== undefined) updateData.personType = updateSupplierDto.personType;
    if (updateSupplierDto.isActive !== undefined) updateData.isActive = updateSupplierDto.isActive;

    // Handle NIT based on personType
    if (updateSupplierDto.nit !== undefined) {
      updateData.nit = finalPersonType === PersonType.NATURAL ? null : updateSupplierDto.nit;
    } else if (updateSupplierDto.personType === PersonType.NATURAL) {
      updateData.nit = null;
    }

    // Handle department/city updates
    if (updateSupplierDto.departmentId) {
      updateData.department = { connect: { id: updateSupplierDto.departmentId } };
    }
    if (updateSupplierDto.cityId) {
      updateData.city = { connect: { id: updateSupplierDto.cityId } };
    }

    return this.suppliersRepository.update(id, updateData);
  }

  /**
   * Soft delete a supplier
   */
  async remove(id: string) {
    // Verify supplier exists
    await this.findOne(id);

    // Soft delete
    await this.suppliersRepository.update(id, { isActive: false });

    return { message: `Proveedor con ID ${id} eliminado correctamente` };
  }
}
