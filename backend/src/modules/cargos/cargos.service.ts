import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreateCargoDto, UpdateCargoDto } from './dto';
import { CargosRepository } from './cargos.repository';
import { ProductionAreasRepository } from '../production-areas/production-areas.repository';

@Injectable()
export class CargosService {
  constructor(
    private readonly cargosRepository: CargosRepository,
    private readonly productionAreasRepository: ProductionAreasRepository,
  ) {}

  /**
   * Obtiene todos los cargos activos con información del área de producción
   */
  async findAll(includeInactive = false) {
    const cargos = await this.cargosRepository.findAll(includeInactive);

    return cargos.map((cargo) => ({
      ...cargo,
      usersCount: cargo._count.users,
      _count: undefined,
    }));
  }

  /**
   * Obtiene cargos por área de producción
   */
  async findByArea(productionAreaId: string, includeInactive = false) {
    // Verificar que el área de producción existe
    const area = await this.productionAreasRepository.findById(productionAreaId);

    if (!area) {
      throw new NotFoundException(`Área de producción con ID ${productionAreaId} no encontrada`);
    }

    const cargos = await this.cargosRepository.findByArea(
      productionAreaId,
      includeInactive,
    );

    return cargos.map((cargo) => ({
      ...cargo,
      usersCount: cargo._count.users,
      _count: undefined,
    }));
  }

  /**
   * Obtiene un cargo por ID con área de producción y conteo de usuarios
   */
  async findOne(id: string) {
    const cargo = await this.cargosRepository.findById(id);

    if (!cargo) {
      throw new NotFoundException(`Cargo con ID ${id} no encontrado`);
    }

    return {
      ...cargo,
      usersCount: cargo._count.users,
      _count: undefined,
    };
  }

  /**
   * Crea un nuevo cargo
   */
  async create(createCargoDto: CreateCargoDto) {
    // Verificar que el área de producción existe y está activa
    const area = await this.productionAreasRepository.findById(createCargoDto.productionAreaId);

    if (!area) {
      throw new BadRequestException(
        `Área de producción con ID ${createCargoDto.productionAreaId} no encontrada`,
      );
    }

    if (!area.isActive) {
      throw new BadRequestException(
        `No se puede crear un cargo en un área de producción inactiva`,
      );
    }

    // Verificar nombre único dentro del área de producción
    const existingCargo = await this.cargosRepository.findByNameAndArea(
      createCargoDto.name,
      createCargoDto.productionAreaId,
    );

    if (existingCargo) {
      throw new BadRequestException(
        `Ya existe un cargo con el nombre "${createCargoDto.name}" en esta área de producción`,
      );
    }

    return this.cargosRepository.create({
      name: createCargoDto.name,
      description: createCargoDto.description,
      productionArea: {
        connect: { id: createCargoDto.productionAreaId },
      },
    });
  }

  /**
   * Actualiza un cargo
   */
  async update(id: string, updateCargoDto: UpdateCargoDto) {
    // Verificar que el cargo existe
    const cargo = await this.findOne(id);

    // Si se actualiza el área de producción, verificar que existe y está activa
    if (updateCargoDto.productionAreaId && updateCargoDto.productionAreaId !== cargo.productionAreaId) {
      const area = await this.productionAreasRepository.findById(updateCargoDto.productionAreaId);

      if (!area) {
        throw new BadRequestException(
          `Área de producción con ID ${updateCargoDto.productionAreaId} no encontrada`,
        );
      }

      if (!area.isActive) {
        throw new BadRequestException(
          `No se puede mover el cargo a un área de producción inactiva`,
        );
      }
    }

    // Si se actualiza el nombre o el área, verificar unicidad
    const nameToCheck = updateCargoDto.name || cargo.name;
    const areaToCheck = updateCargoDto.productionAreaId || cargo.productionAreaId;

    if (updateCargoDto.name || updateCargoDto.productionAreaId) {
      const existingCargo =
        await this.cargosRepository.findByNameAndAreaExcludingId(
          nameToCheck,
          areaToCheck,
          id,
        );

      if (existingCargo) {
        throw new BadRequestException(
          `Ya existe un cargo con el nombre "${nameToCheck}" en esta área de producción`,
        );
      }
    }

    // Preparar datos de actualización
    const { productionAreaId, ...updateData } = updateCargoDto;

    // Si se actualiza el productionAreaId, usar la sintaxis de Prisma connect
    if (productionAreaId) {
      (updateData as any).productionArea = { connect: { id: productionAreaId } };
    }

    return this.cargosRepository.update(id, updateData);
  }

  /**
   * Soft delete de un cargo (isActive = false)
   */
  async remove(id: string) {
    // Verificar que el cargo existe
    await this.findOne(id);

    // Verificar que no tenga usuarios asignados
    const usersCount = await this.cargosRepository.countUsers(id);

    if (usersCount > 0) {
      throw new BadRequestException(
        `No se puede eliminar el cargo porque tiene ${usersCount} usuario(s) asignado(s)`,
      );
    }

    // Soft delete
    await this.cargosRepository.update(id, { isActive: false });

    return { message: `Cargo con ID ${id} eliminado correctamente` };
  }
}
