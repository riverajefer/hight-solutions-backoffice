import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreateUnitOfMeasureDto, UpdateUnitOfMeasureDto } from './dto';
import { UnitsOfMeasureRepository } from './units-of-measure.repository';

@Injectable()
export class UnitsOfMeasureService {
  constructor(
    private readonly unitsOfMeasureRepository: UnitsOfMeasureRepository,
  ) {}

  /**
   * Obtiene todas las unidades de medida
   */
  async findAll(includeInactive = false) {
    return this.unitsOfMeasureRepository.findAll(includeInactive);
  }

  /**
   * Obtiene una unidad de medida por ID
   */
  async findOne(id: string) {
    const unit = await this.unitsOfMeasureRepository.findById(id);

    if (!unit) {
      throw new NotFoundException(
        `Unidad de medida con ID ${id} no encontrada`,
      );
    }

    return unit;
  }

  /**
   * Crea una nueva unidad de medida
   */
  async create(createUnitOfMeasureDto: CreateUnitOfMeasureDto) {
    // Verificar nombre único
    const existingName = await this.unitsOfMeasureRepository.findByName(
      createUnitOfMeasureDto.name,
    );

    if (existingName) {
      throw new BadRequestException(
        `Ya existe una unidad de medida con el nombre "${createUnitOfMeasureDto.name}"`,
      );
    }

    // Verificar abreviatura única
    const existingAbbreviation =
      await this.unitsOfMeasureRepository.findByAbbreviation(
        createUnitOfMeasureDto.abbreviation,
      );

    if (existingAbbreviation) {
      throw new BadRequestException(
        `Ya existe una unidad de medida con la abreviatura "${createUnitOfMeasureDto.abbreviation}"`,
      );
    }

    return this.unitsOfMeasureRepository.create({
      name: createUnitOfMeasureDto.name,
      abbreviation: createUnitOfMeasureDto.abbreviation,
      description: createUnitOfMeasureDto.description,
    });
  }

  /**
   * Actualiza una unidad de medida
   */
  async update(id: string, updateUnitOfMeasureDto: UpdateUnitOfMeasureDto) {
    // Verificar que existe
    await this.findOne(id);

    // Si se actualiza el nombre, verificar que no exista
    if (updateUnitOfMeasureDto.name) {
      const existingName =
        await this.unitsOfMeasureRepository.findByNameExcludingId(
          updateUnitOfMeasureDto.name,
          id,
        );

      if (existingName) {
        throw new BadRequestException(
          `Ya existe una unidad de medida con el nombre "${updateUnitOfMeasureDto.name}"`,
        );
      }
    }

    // Si se actualiza la abreviatura, verificar que no exista
    if (updateUnitOfMeasureDto.abbreviation) {
      const existingAbbreviation =
        await this.unitsOfMeasureRepository.findByAbbreviationExcludingId(
          updateUnitOfMeasureDto.abbreviation,
          id,
        );

      if (existingAbbreviation) {
        throw new BadRequestException(
          `Ya existe una unidad de medida con la abreviatura "${updateUnitOfMeasureDto.abbreviation}"`,
        );
      }
    }

    return this.unitsOfMeasureRepository.update(id, updateUnitOfMeasureDto);
  }

  /**
   * Soft delete de una unidad de medida
   */
  async remove(id: string) {
    // Verificar que existe
    await this.findOne(id);

    // TODO: En el futuro, verificar que no esté siendo usada por Supplies
    // const isUsedInSupplies = await this.checkIfUsedInSupplies(id);
    // if (isUsedInSupplies) {
    //   throw new BadRequestException(
    //     'No se puede eliminar la unidad porque está siendo usada por insumos',
    //   );
    // }

    // Soft delete
    await this.unitsOfMeasureRepository.update(id, { isActive: false });

    return {
      message: `Unidad de medida con ID ${id} eliminada correctamente`,
    };
  }
}
