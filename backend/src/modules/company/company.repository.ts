import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '../../generated/prisma';

@Injectable()
export class CompanyRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtiene el registro único de la compañía
   */
  async findOne() {
    return this.prisma.company.findFirst();
  }

  /**
   * Crea el registro de la compañía
   */
  async create(data: Prisma.CompanyCreateInput) {
    return this.prisma.company.create({ data });
  }

  /**
   * Actualiza el registro de la compañía por ID
   */
  async update(id: string, data: Prisma.CompanyUpdateInput) {
    return this.prisma.company.update({
      where: { id },
      data,
    });
  }
}
