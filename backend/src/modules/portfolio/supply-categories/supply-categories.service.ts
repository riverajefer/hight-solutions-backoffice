import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  CreateSupplyCategoryDto,
  UpdateSupplyCategoryDto,
} from './dto';
import { SupplyCategoriesRepository } from './supply-categories.repository';

@Injectable()
export class SupplyCategoriesService {
  constructor(
    private readonly supplyCategoriesRepository: SupplyCategoriesRepository,
  ) {}

  /**
   * Obtiene todas las categorías de insumos
   */
  async findAll(includeInactive = false) {
    return this.supplyCategoriesRepository.findAll(includeInactive);
  }

  /**
   * Obtiene una categoría de insumo por ID
   */
  async findOne(id: string) {
    const category = await this.supplyCategoriesRepository.findById(id);

    if (!category) {
      throw new NotFoundException(
        `Categoría de insumo con ID ${id} no encontrada`,
      );
    }

    return category;
  }

  /**
   * Crea una nueva categoría de insumo
   */
  async create(createSupplyCategoryDto: CreateSupplyCategoryDto) {
    // Verificar nombre único
    const existingName = await this.supplyCategoriesRepository.findByName(
      createSupplyCategoryDto.name,
    );

    if (existingName) {
      throw new BadRequestException(
        `Ya existe una categoría de insumo con el nombre "${createSupplyCategoryDto.name}"`,
      );
    }

    // Verificar slug único
    const existingSlug = await this.supplyCategoriesRepository.findBySlug(
      createSupplyCategoryDto.slug,
    );

    if (existingSlug) {
      throw new BadRequestException(
        `Ya existe una categoría de insumo con el slug "${createSupplyCategoryDto.slug}"`,
      );
    }

    return this.supplyCategoriesRepository.create({
      name: createSupplyCategoryDto.name,
      slug: createSupplyCategoryDto.slug,
      description: createSupplyCategoryDto.description,
      icon: createSupplyCategoryDto.icon,
      sortOrder: createSupplyCategoryDto.sortOrder ?? 0,
    });
  }

  /**
   * Actualiza una categoría de insumo
   */
  async update(
    id: string,
    updateSupplyCategoryDto: UpdateSupplyCategoryDto,
  ) {
    // Verificar que existe
    await this.findOne(id);

    // Si se actualiza el nombre, verificar que no exista
    if (updateSupplyCategoryDto.name) {
      const existingName =
        await this.supplyCategoriesRepository.findByNameExcludingId(
          updateSupplyCategoryDto.name,
          id,
        );

      if (existingName) {
        throw new BadRequestException(
          `Ya existe una categoría de insumo con el nombre "${updateSupplyCategoryDto.name}"`,
        );
      }
    }

    // Si se actualiza el slug, verificar que no exista
    if (updateSupplyCategoryDto.slug) {
      const existingSlug =
        await this.supplyCategoriesRepository.findBySlugExcludingId(
          updateSupplyCategoryDto.slug,
          id,
        );

      if (existingSlug) {
        throw new BadRequestException(
          `Ya existe una categoría de insumo con el slug "${updateSupplyCategoryDto.slug}"`,
        );
      }
    }

    return this.supplyCategoriesRepository.update(
      id,
      updateSupplyCategoryDto,
    );
  }

  /**
   * Soft delete de una categoría de insumo
   */
  async remove(id: string) {
    // Verificar que existe
    await this.findOne(id);

    // TODO: En el futuro, verificar que no tenga insumos asociados
    // const suppliesCount = await this.supplyCategoriesRepository.countSupplies(id);
    // if (suppliesCount > 0) {
    //   throw new BadRequestException(
    //     `No se puede eliminar la categoría porque tiene ${suppliesCount} insumo(s) asociado(s)`,
    //   );
    // }

    // Soft delete
    await this.supplyCategoriesRepository.update(id, { isActive: false });

    return {
      message: `Categoría de insumo con ID ${id} eliminada correctamente`,
    };
  }
}
