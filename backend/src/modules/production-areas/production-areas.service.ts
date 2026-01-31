import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreateProductionAreaDto, UpdateProductionAreaDto } from './dto';
import { ProductionAreasRepository } from './production-areas.repository';

@Injectable()
export class ProductionAreasService {
  constructor(
    private readonly productionAreasRepository: ProductionAreasRepository,
  ) {}

  /**
   * Obtiene todas las áreas de producción
   */
  async findAll(includeInactive = false) {
    return this.productionAreasRepository.findAll(includeInactive);
  }

  /**
   * Obtiene un área de producción por ID
   */
  async findOne(id: string) {
    const productionArea =
      await this.productionAreasRepository.findById(id);

    if (!productionArea) {
      throw new NotFoundException(
        `Área de producción con ID ${id} no encontrada`,
      );
    }

    return productionArea;
  }

  /**
   * Crea una nueva área de producción
   */
  async create(createProductionAreaDto: CreateProductionAreaDto) {
    // Verificar nombre único
    const existingArea = await this.productionAreasRepository.findByName(
      createProductionAreaDto.name,
    );

    if (existingArea) {
      throw new BadRequestException(
        `Ya existe un área de producción con el nombre "${createProductionAreaDto.name}"`,
      );
    }

    return this.productionAreasRepository.create({
      name: createProductionAreaDto.name,
      description: createProductionAreaDto.description,
    });
  }

  /**
   * Actualiza un área de producción
   */
  async update(id: string, updateProductionAreaDto: UpdateProductionAreaDto) {
    // Verificar que el área existe
    await this.findOne(id);

    // Si se actualiza el nombre, verificar que no exista
    if (updateProductionAreaDto.name) {
      const existingArea =
        await this.productionAreasRepository.findByNameExcludingId(
          updateProductionAreaDto.name,
          id,
        );

      if (existingArea) {
        throw new BadRequestException(
          `Ya existe un área de producción con el nombre "${updateProductionAreaDto.name}"`,
        );
      }
    }

    return this.productionAreasRepository.update(id, updateProductionAreaDto);
  }

  /**
   * Soft delete de un área de producción (isActive = false)
   */
  async remove(id: string) {
    // Verificar que el área existe
    await this.findOne(id);

    // Soft delete
    await this.productionAreasRepository.update(id, { isActive: false });

    return {
      message: `Área de producción con ID ${id} eliminada correctamente`,
    };
  }
}
