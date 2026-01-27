import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Prisma } from '../../../generated/prisma';

@Injectable()
export class UnitsOfMeasureRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Encuentra todas las unidades de medida
   */
  async findAll(includeInactive = false) {
    return this.prisma.unitOfMeasure.findMany({
      where: includeInactive ? {} : { isActive: true },
      select: {
        id: true,
        name: true,
        abbreviation: true,
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Encuentra una unidad de medida por ID
   */
  async findById(id: string) {
    return this.prisma.unitOfMeasure.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        abbreviation: true,
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Encuentra por nombre
   */
  async findByName(name: string) {
    return this.prisma.unitOfMeasure.findUnique({
      where: { name },
    });
  }

  /**
   * Encuentra por nombre excluyendo un ID
   */
  async findByNameExcludingId(name: string, excludeId: string) {
    return this.prisma.unitOfMeasure.findFirst({
      where: {
        name,
        NOT: { id: excludeId },
      },
    });
  }

  /**
   * Encuentra por abreviatura
   */
  async findByAbbreviation(abbreviation: string) {
    return this.prisma.unitOfMeasure.findUnique({
      where: { abbreviation },
    });
  }

  /**
   * Encuentra por abreviatura excluyendo un ID
   */
  async findByAbbreviationExcludingId(abbreviation: string, excludeId: string) {
    return this.prisma.unitOfMeasure.findFirst({
      where: {
        abbreviation,
        NOT: { id: excludeId },
      },
    });
  }

  /**
   * Crea una nueva unidad de medida
   */
  async create(data: Prisma.UnitOfMeasureCreateInput) {
    return this.prisma.unitOfMeasure.create({
      data,
      select: {
        id: true,
        name: true,
        abbreviation: true,
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Actualiza una unidad de medida
   */
  async update(id: string, data: Prisma.UnitOfMeasureUpdateInput) {
    return this.prisma.unitOfMeasure.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        abbreviation: true,
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Elimina una unidad de medida (hard delete)
   */
  async delete(id: string) {
    return this.prisma.unitOfMeasure.delete({
      where: { id },
    });
  }
}
