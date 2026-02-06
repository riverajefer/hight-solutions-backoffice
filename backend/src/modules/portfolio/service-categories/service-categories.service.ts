import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  CreateServiceCategoryDto,
  UpdateServiceCategoryDto,
} from './dto';
import { ServiceCategoriesRepository } from './service-categories.repository';

@Injectable()
export class ServiceCategoriesService {
  constructor(
    private readonly serviceCategoriesRepository: ServiceCategoriesRepository,
  ) {}

  /**
   * Obtiene todas las categorías de servicios
   */
  async findAll(includeInactive = false) {
    return this.serviceCategoriesRepository.findAll(includeInactive);
  }

  /**
   * Obtiene una categoría de servicio por ID
   */
  async findOne(id: string) {
    const category = await this.serviceCategoriesRepository.findById(id);

    if (!category) {
      throw new NotFoundException(
        `Categoría de servicio con ID ${id} no encontrada`,
      );
    }

    return category;
  }

  /**
   * Genera un slug a partir de un texto
   */
  private generateSlug(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  /**
   * Crea una nueva categoría de servicio
   */
  async create(createServiceCategoryDto: CreateServiceCategoryDto) {
    // Verificar nombre único
    const existingName = await this.serviceCategoriesRepository.findByName(
      createServiceCategoryDto.name,
    );

    if (existingName) {
      throw new BadRequestException(
        `Ya existe una categoría de servicio con el nombre "${createServiceCategoryDto.name}"`,
      );
    }

    // Autogenerar slug si no se proporciona
    const slug =
      createServiceCategoryDto.slug || this.generateSlug(createServiceCategoryDto.name);

    // Verificar slug único
    const existingSlug =
      await this.serviceCategoriesRepository.findBySlug(slug);

    if (existingSlug) {
      throw new BadRequestException(
        `Ya existe una categoría de servicio con el slug "${slug}"`,
      );
    }

    return this.serviceCategoriesRepository.create({
      name: createServiceCategoryDto.name,
      slug,
      description: createServiceCategoryDto.description,
      icon: createServiceCategoryDto.icon,
      sortOrder: createServiceCategoryDto.sortOrder ?? 0,
    });
  }

  /**
   * Actualiza una categoría de servicio
   */
  async update(
    id: string,
    updateServiceCategoryDto: UpdateServiceCategoryDto,
  ) {
    // Verificar que existe
    await this.findOne(id);

    // Si se actualiza el nombre, verificar que no exista
    if (updateServiceCategoryDto.name) {
      const existingName =
        await this.serviceCategoriesRepository.findByNameExcludingId(
          updateServiceCategoryDto.name,
          id,
        );

      if (existingName) {
        throw new BadRequestException(
          `Ya existe una categoría de servicio con el nombre "${updateServiceCategoryDto.name}"`,
        );
      }
    }

    // Si se actualiza el nombre, regenerar slug automáticamente
    if (updateServiceCategoryDto.name && !updateServiceCategoryDto.slug) {
      updateServiceCategoryDto.slug = this.generateSlug(updateServiceCategoryDto.name);
    }

    // Si se actualiza el slug, verificar que no exista
    if (updateServiceCategoryDto.slug) {
      const existingSlug =
        await this.serviceCategoriesRepository.findBySlugExcludingId(
          updateServiceCategoryDto.slug,
          id,
        );

      if (existingSlug) {
        throw new BadRequestException(
          `Ya existe una categoría de servicio con el slug "${updateServiceCategoryDto.slug}"`,
        );
      }
    }

    return this.serviceCategoriesRepository.update(
      id,
      updateServiceCategoryDto,
    );
  }

  /**
   * Soft delete de una categoría de servicio
   */
  async remove(id: string) {
    // Verificar que existe
    await this.findOne(id);

    // TODO: En el futuro, verificar que no tenga servicios asociados
    // const servicesCount = await this.serviceCategoriesRepository.countServices(id);
    // if (servicesCount > 0) {
    //   throw new BadRequestException(
    //     `No se puede eliminar la categoría porque tiene ${servicesCount} servicio(s) asociado(s)`,
    //   );
    // }

    // Soft delete
    await this.serviceCategoriesRepository.update(id, { isActive: false });

    return {
      message: `Categoría de servicio con ID ${id} eliminada correctamente`,
    };
  }
}
