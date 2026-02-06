import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreateServiceDto, UpdateServiceDto } from './dto';
import { ServicesRepository } from './services.repository';
import { Prisma } from '../../../generated/prisma';

@Injectable()
export class ServicesService {
  constructor(private readonly servicesRepository: ServicesRepository) {}

  /**
   * Obtiene todos los servicios
   */
  async findAll(includeInactive = false, categoryId?: string) {
    return this.servicesRepository.findAll(includeInactive, categoryId);
  }

  /**
   * Obtiene un servicio por ID
   */
  async findOne(id: string) {
    const service = await this.servicesRepository.findById(id);

    if (!service) {
      throw new NotFoundException(`Servicio con ID ${id} no encontrado`);
    }

    return service;
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
   * Crea un nuevo servicio
   */
  async create(createServiceDto: CreateServiceDto) {
    // Autogenerar slug si no se proporciona
    const slug =
      createServiceDto.slug || this.generateSlug(createServiceDto.name);

    // Verificar slug único
    const existingSlug = await this.servicesRepository.findBySlug(slug);

    if (existingSlug) {
      throw new BadRequestException(
        `Ya existe un servicio con el slug "${slug}"`,
      );
    }

    // Verificar nombre único dentro de la categoría
    const existingNameInCategory =
      await this.servicesRepository.findByNameAndCategory(
        createServiceDto.name,
        createServiceDto.categoryId,
      );

    if (existingNameInCategory) {
      throw new BadRequestException(
        `Ya existe un servicio con el nombre "${createServiceDto.name}" en esta categoría`,
      );
    }

    // Convertir basePrice a Decimal si existe
    const basePriceDecimal = createServiceDto.basePrice
      ? new Prisma.Decimal(createServiceDto.basePrice)
      : null;

    return this.servicesRepository.create({
      name: createServiceDto.name,
      slug,
      description: createServiceDto.description,
      basePrice: basePriceDecimal,
      priceUnit: createServiceDto.priceUnit,
      category: {
        connect: { id: createServiceDto.categoryId },
      },
    });
  }

  /**
   * Actualiza un servicio
   */
  async update(id: string, updateServiceDto: UpdateServiceDto) {
    // Verificar que existe
    await this.findOne(id);

    // Si se actualiza el nombre, regenerar slug automáticamente
    if (updateServiceDto.name && !updateServiceDto.slug) {
      updateServiceDto.slug = this.generateSlug(updateServiceDto.name);
    }

    // Si se actualiza el slug, verificar que no exista
    if (updateServiceDto.slug) {
      const existingSlug =
        await this.servicesRepository.findBySlugExcludingId(
          updateServiceDto.slug,
          id,
        );

      if (existingSlug) {
        throw new BadRequestException(
          `Ya existe un servicio con el slug "${updateServiceDto.slug}"`,
        );
      }
    }

    // Si se actualiza el nombre y/o categoría, verificar unicidad
    if (updateServiceDto.name || updateServiceDto.categoryId) {
      const currentService = await this.servicesRepository.findById(id);
      if (!currentService) {
        throw new NotFoundException(`Servicio con ID ${id} no encontrado`);
      }
      const nameToCheck = updateServiceDto.name || currentService.name;
      const categoryToCheck =
        updateServiceDto.categoryId || currentService.categoryId;

      const existingNameInCategory =
        await this.servicesRepository.findByNameAndCategoryExcludingId(
          nameToCheck,
          categoryToCheck,
          id,
        );

      if (existingNameInCategory) {
        throw new BadRequestException(
          `Ya existe un servicio con el nombre "${nameToCheck}" en esta categoría`,
        );
      }
    }

    // Preparar datos para actualización
    const updateData: any = {
      ...(updateServiceDto.name && { name: updateServiceDto.name }),
      ...(updateServiceDto.slug && { slug: updateServiceDto.slug }),
      ...(updateServiceDto.description !== undefined && {
        description: updateServiceDto.description,
      }),
      ...(updateServiceDto.basePrice !== undefined && {
        basePrice: updateServiceDto.basePrice
          ? new Prisma.Decimal(updateServiceDto.basePrice)
          : null,
      }),
      ...(updateServiceDto.priceUnit !== undefined && {
        priceUnit: updateServiceDto.priceUnit,
      }),
      ...(updateServiceDto.categoryId && {
        category: { connect: { id: updateServiceDto.categoryId } },
      }),
    };

    return this.servicesRepository.update(id, updateData);
  }

  /**
   * Soft delete de un servicio
   */
  async remove(id: string) {
    // Verificar que existe
    await this.findOne(id);

    // TODO: En el futuro, verificar que no esté siendo usado en otros módulos
    // (por ejemplo, en órdenes de trabajo, cotizaciones, etc.)

    // Soft delete
    await this.servicesRepository.update(id, { isActive: false });

    return {
      message: `Servicio con ID ${id} eliminado correctamente`,
    };
  }
}
