import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreateAreaDto, UpdateAreaDto } from './dto';
import { AreasRepository } from './areas.repository';

@Injectable()
export class AreasService {
  constructor(private readonly areasRepository: AreasRepository) {}

  /**
   * Obtiene todas las áreas activas con conteo de cargos
   */
  async findAll(includeInactive = false) {
    const areas = await this.areasRepository.findAll(includeInactive);

    return areas.map((area) => ({
      ...area,
      cargosCount: area._count.cargos,
      _count: undefined,
    }));
  }

  /**
   * Obtiene un área por ID con sus cargos
   */
  async findOne(id: string) {
    const area = await this.areasRepository.findById(id);

    if (!area) {
      throw new NotFoundException(`Área con ID ${id} no encontrada`);
    }

    return {
      ...area,
      cargos: area.cargos.map((cargo) => ({
        ...cargo,
        usersCount: cargo._count.users,
        _count: undefined,
      })),
    };
  }

  /**
   * Crea una nueva área
   */
  async create(createAreaDto: CreateAreaDto) {
    // Verificar nombre único
    const existingArea = await this.areasRepository.findByName(
      createAreaDto.name,
    );

    if (existingArea) {
      throw new BadRequestException(
        `Ya existe un área con el nombre "${createAreaDto.name}"`,
      );
    }

    return this.areasRepository.create({
      name: createAreaDto.name,
      description: createAreaDto.description,
    });
  }

  /**
   * Actualiza un área
   */
  async update(id: string, updateAreaDto: UpdateAreaDto) {
    // Verificar que el área existe
    await this.findOne(id);

    // Si se actualiza el nombre, verificar que no exista
    if (updateAreaDto.name) {
      const existingArea = await this.areasRepository.findByNameExcludingId(
        updateAreaDto.name,
        id,
      );

      if (existingArea) {
        throw new BadRequestException(
          `Ya existe un área con el nombre "${updateAreaDto.name}"`,
        );
      }
    }

    return this.areasRepository.update(id, updateAreaDto);
  }

  /**
   * Soft delete de un área (isActive = false)
   */
  async remove(id: string) {
    // Verificar que el área existe
    await this.findOne(id);

    // Verificar que no tenga cargos activos
    const activeCargosCount =
      await this.areasRepository.countActiveCargos(id);

    if (activeCargosCount > 0) {
      throw new BadRequestException(
        `No se puede eliminar el área porque tiene ${activeCargosCount} cargo(s) activo(s)`,
      );
    }

    // Soft delete
    await this.areasRepository.update(id, { isActive: false });

    return { message: `Área con ID ${id} eliminada correctamente` };
  }
}
