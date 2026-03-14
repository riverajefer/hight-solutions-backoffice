import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  CreateProductCategoryDto,
  UpdateProductCategoryDto,
} from './dto';
import { ProductCategoriesRepository } from './product-categories.repository';

@Injectable()
export class ProductCategoriesService {
  constructor(
    private readonly productCategoriesRepository: ProductCategoriesRepository,
  ) {}

  /**
   * Obtiene todas las categorías de productos
   */
  async findAll(includeInactive = false) {
    return this.productCategoriesRepository.findAll(includeInactive);
  }

  /**
   * Obtiene una categoría de producto por ID
   */
  async findOne(id: string) {
    const category = await this.productCategoriesRepository.findById(id);

    if (!category) {
      throw new NotFoundException(
        `Categoría de producto con ID ${id} no encontrada`,
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
   * Crea una nueva categoría de producto
   */
  async create(createServiceCategoryDto: CreateProductCategoryDto) {
    // Verificar nombre único
    const existingName = await this.productCategoriesRepository.findByName(
      createServiceCategoryDto.name,
    );

    if (existingName) {
      throw new BadRequestException(
        `Ya existe una categoría de producto con el nombre "${createServiceCategoryDto.name}"`,
      );
    }

    // Autogenerar slug si no se proporciona
    const slug =
      createServiceCategoryDto.slug || this.generateSlug(createServiceCategoryDto.name);

    // Verificar slug único
    const existingSlug =
      await this.productCategoriesRepository.findBySlug(slug);

    if (existingSlug) {
      throw new BadRequestException(
        `Ya existe una categoría de producto con el slug "${slug}"`,
      );
    }

    return this.productCategoriesRepository.create({
      name: createServiceCategoryDto.name,
      slug,
      description: createServiceCategoryDto.description,
      icon: createServiceCategoryDto.icon,
      sortOrder: createServiceCategoryDto.sortOrder ?? 0,
    });
  }

  /**
   * Actualiza una categoría de producto
   */
  async update(
    id: string,
    updateServiceCategoryDto: UpdateProductCategoryDto,
  ) {
    // Verificar que existe
    await this.findOne(id);

    // Si se actualiza el nombre, verificar que no exista
    if (updateServiceCategoryDto.name) {
      const existingName =
        await this.productCategoriesRepository.findByNameExcludingId(
          updateServiceCategoryDto.name,
          id,
        );

      if (existingName) {
        throw new BadRequestException(
          `Ya existe una categoría de producto con el nombre "${updateServiceCategoryDto.name}"`,
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
        await this.productCategoriesRepository.findBySlugExcludingId(
          updateServiceCategoryDto.slug,
          id,
        );

      if (existingSlug) {
        throw new BadRequestException(
          `Ya existe una categoría de producto con el slug "${updateServiceCategoryDto.slug}"`,
        );
      }
    }

    return this.productCategoriesRepository.update(
      id,
      updateServiceCategoryDto,
    );
  }

  /**
   * Soft delete de una categoría de producto
   */
  async remove(id: string) {
    // Verificar que existe
    await this.findOne(id);

    // TODO: En el futuro, verificar que no tenga productos asociados
    // const productsCount = await this.productCategoriesRepository.countProducts(id);
    // if (productsCount > 0) {
    //   throw new BadRequestException(
    //     `No se puede eliminar la categoría porque tiene ${productsCount} producto(s) asociado(s)`,
    //   );
    // }

    // Soft delete
    await this.productCategoriesRepository.update(id, { isActive: false });

    return {
      message: `Categoría de producto con ID ${id} eliminada correctamente`,
    };
  }
}
