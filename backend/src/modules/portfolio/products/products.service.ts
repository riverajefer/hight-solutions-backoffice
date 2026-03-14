import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreateProductDto, UpdateProductDto } from './dto';
import { ProductsRepository } from './products.repository';
import { Prisma } from '../../../generated/prisma';

@Injectable()
export class ProductsService {
  constructor(private readonly productsRepository: ProductsRepository) {}

  /**
   * Obtiene todos los productos
   */
  async findAll(includeInactive = false, categoryId?: string) {
    return this.productsRepository.findAll(includeInactive, categoryId);
  }

  /**
   * Obtiene un producto por ID
   */
  async findOne(id: string) {
    const product = await this.productsRepository.findById(id);

    if (!product) {
      throw new NotFoundException(`Producto con ID ${id} no encontrado`);
    }

    return product;
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
   * Crea un nuevo producto
   */
  async create(createProductDto: CreateProductDto) {
    // Autogenerar slug si no se proporciona
    const slug =
      createProductDto.slug || this.generateSlug(createProductDto.name);

    // Verificar slug único
    const existingSlug = await this.productsRepository.findBySlug(slug);

    if (existingSlug) {
      throw new BadRequestException(
        `Ya existe un producto con el slug "${slug}"`,
      );
    }

    // Verificar nombre único dentro de la categoría
    const existingNameInCategory =
      await this.productsRepository.findByNameAndCategory(
        createProductDto.name,
        createProductDto.categoryId,
      );

    if (existingNameInCategory) {
      throw new BadRequestException(
        `Ya existe un producto con el nombre "${createProductDto.name}" en esta categoría`,
      );
    }

    // Convertir basePrice a Decimal si existe
    const basePriceDecimal = createProductDto.basePrice
      ? new Prisma.Decimal(createProductDto.basePrice)
      : null;

    return this.productsRepository.create({
      name: createProductDto.name,
      slug,
      description: createProductDto.description,
      basePrice: basePriceDecimal,
      priceUnit: createProductDto.priceUnit,
      category: {
        connect: { id: createProductDto.categoryId },
      },
    });
  }

  /**
   * Actualiza un producto
   */
  async update(id: string, updateProductDto: UpdateProductDto) {
    // Verificar que existe
    await this.findOne(id);

    // Si se actualiza el nombre, regenerar slug automáticamente
    if (updateProductDto.name && !updateProductDto.slug) {
      updateProductDto.slug = this.generateSlug(updateProductDto.name);
    }

    // Si se actualiza el slug, verificar que no exista
    if (updateProductDto.slug) {
      const existingSlug =
        await this.productsRepository.findBySlugExcludingId(
          updateProductDto.slug,
          id,
        );

      if (existingSlug) {
        throw new BadRequestException(
          `Ya existe un producto con el slug "${updateProductDto.slug}"`,
        );
      }
    }

    // Si se actualiza el nombre y/o categoría, verificar unicidad
    if (updateProductDto.name || updateProductDto.categoryId) {
      const currentProduct = await this.productsRepository.findById(id);
      if (!currentProduct) {
        throw new NotFoundException(`Producto con ID ${id} no encontrado`);
      }
      const nameToCheck = updateProductDto.name || currentProduct.name;
      const categoryToCheck =
        updateProductDto.categoryId || currentProduct.categoryId;

      const existingNameInCategory =
        await this.productsRepository.findByNameAndCategoryExcludingId(
          nameToCheck,
          categoryToCheck,
          id,
        );

      if (existingNameInCategory) {
        throw new BadRequestException(
          `Ya existe un producto con el nombre "${nameToCheck}" en esta categoría`,
        );
      }
    }

    // Preparar datos para actualización
    const updateData: any = {
      ...(updateProductDto.name && { name: updateProductDto.name }),
      ...(updateProductDto.slug && { slug: updateProductDto.slug }),
      ...(updateProductDto.description !== undefined && {
        description: updateProductDto.description,
      }),
      ...(updateProductDto.basePrice !== undefined && {
        basePrice: updateProductDto.basePrice
          ? new Prisma.Decimal(updateProductDto.basePrice)
          : null,
      }),
      ...(updateProductDto.priceUnit !== undefined && {
        priceUnit: updateProductDto.priceUnit,
      }),
      ...(updateProductDto.categoryId && {
        category: { connect: { id: updateProductDto.categoryId } },
      }),
    };

    return this.productsRepository.update(id, updateData);
  }

  /**
   * Soft delete de un producto
   */
  async remove(id: string) {
    // Verificar que existe
    await this.findOne(id);

    // TODO: En el futuro, verificar que no esté siendo usado en otros módulos
    // (por ejemplo, en órdenes de trabajo, cotizaciones, etc.)

    // Soft delete
    await this.productsRepository.update(id, { isActive: false });

    return {
      message: `Producto con ID ${id} eliminado correctamente`,
    };
  }
}
