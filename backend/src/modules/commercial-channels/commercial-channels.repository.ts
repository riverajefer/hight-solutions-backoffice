import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '../../generated/prisma';

@Injectable()
export class CommercialChannelsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Encuentra todos los canales comerciales
   */
  async findAll() {
    return this.prisma.commercialChannel.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Encuentra un canal comercial por ID
   */
  async findById(id: string) {
    return this.prisma.commercialChannel.findUnique({
      where: { id },
    });
  }

  /**
   * Encuentra un canal comercial por nombre
   */
  async findByName(name: string) {
    return this.prisma.commercialChannel.findUnique({
      where: { name },
    });
  }

  /**
   * Crea un nuevo canal comercial
   */
  async create(data: Prisma.CommercialChannelCreateInput) {
    return this.prisma.commercialChannel.create({
      data,
    });
  }

  /**
   * Actualiza un canal comercial
   */
  async update(id: string, data: Prisma.CommercialChannelUpdateInput) {
    return this.prisma.commercialChannel.update({
      where: { id },
      data,
    });
  }

  /**
   * Elimina un canal comercial
   */
  async delete(id: string) {
    return this.prisma.commercialChannel.delete({
      where: { id },
    });
  }
}
