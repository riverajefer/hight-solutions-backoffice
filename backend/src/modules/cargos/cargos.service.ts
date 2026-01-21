import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreateCargoDto, UpdateCargoDto } from './dto';
import { CargosRepository } from './cargos.repository';
import { AreasRepository } from '../areas/areas.repository';

@Injectable()
export class CargosService {
  constructor(
    private readonly cargosRepository: CargosRepository,
    private readonly areasRepository: AreasRepository,
  ) {}

  /**
   * Obtiene todos los cargos activos con información del área
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
   * Obtiene cargos por área
   */
  async findByArea(areaId: string, includeInactive = false) {
    // Verificar que el área existe
    const area = await this.areasRepository.findById(areaId);

    if (!area) {
      throw new NotFoundException(`Área con ID ${areaId} no encontrada`);
    }

    const cargos = await this.cargosRepository.findByArea(
      areaId,
      includeInactive,
    );

    return cargos.map((cargo) => ({
      ...cargo,
      usersCount: cargo._count.users,
      _count: undefined,
    }));
  }

  /**
   * Obtiene un cargo por ID con área y conteo de usuarios
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
    // Verificar que el área existe y está activa
    const area = await this.areasRepository.findById(createCargoDto.areaId);

    if (!area) {
      throw new BadRequestException(
        `Área con ID ${createCargoDto.areaId} no encontrada`,
      );
    }

    if (!area.isActive) {
      throw new BadRequestException(
        `No se puede crear un cargo en un área inactiva`,
      );
    }

    // Verificar nombre único dentro del área
    const existingCargo = await this.cargosRepository.findByNameAndArea(
      createCargoDto.name,
      createCargoDto.areaId,
    );

    if (existingCargo) {
      throw new BadRequestException(
        `Ya existe un cargo con el nombre "${createCargoDto.name}" en esta área`,
      );
    }

    return this.cargosRepository.create({
      name: createCargoDto.name,
      description: createCargoDto.description,
      area: {
        connect: { id: createCargoDto.areaId },
      },
    });
  }

  /**
   * Actualiza un cargo
   */
  async update(id: string, updateCargoDto: UpdateCargoDto) {
    // Verificar que el cargo existe
    const cargo = await this.findOne(id);

    // Si se actualiza el área, verificar que existe y está activa
    if (updateCargoDto.areaId && updateCargoDto.areaId !== cargo.areaId) {
      const area = await this.areasRepository.findById(updateCargoDto.areaId);

      if (!area) {
        throw new BadRequestException(
          `Área con ID ${updateCargoDto.areaId} no encontrada`,
        );
      }

      if (!area.isActive) {
        throw new BadRequestException(
          `No se puede mover el cargo a un área inactiva`,
        );
      }
    }

    // Si se actualiza el nombre o el área, verificar unicidad
    const nameToCheck = updateCargoDto.name || cargo.name;
    const areaToCheck = updateCargoDto.areaId || cargo.areaId;

    if (updateCargoDto.name || updateCargoDto.areaId) {
      const existingCargo =
        await this.cargosRepository.findByNameAndAreaExcludingId(
          nameToCheck,
          areaToCheck,
          id,
        );

      if (existingCargo) {
        throw new BadRequestException(
          `Ya existe un cargo con el nombre "${nameToCheck}" en esta área`,
        );
      }
    }

    // Preparar datos de actualización
    const { areaId, ...updateData } = updateCargoDto;

    // Si se actualiza el areaId, usar la sintaxis de Prisma connect
    if (areaId) {
      (updateData as any).area = { connect: { id: areaId } };
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
