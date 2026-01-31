import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateCommercialChannelDto,
  UpdateCommercialChannelDto,
} from './dto';

@Injectable()
export class CommercialChannelsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crear un nuevo canal de venta
   */
  async create(dto: CreateCommercialChannelDto) {
    // Validar que no exista un canal con el mismo nombre
    const existing = await this.prisma.commercialChannel.findUnique({
      where: { name: dto.name },
    });

    if (existing) {
      throw new BadRequestException(
        `Commercial channel with name "${dto.name}" already exists`,
      );
    }

    return this.prisma.commercialChannel.create({
      data: dto,
    });
  }

  /**
   * Obtener todos los canales de venta
   */
  async findAll() {
    return this.prisma.commercialChannel.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Obtener un canal de venta por ID
   */
  async findOne(id: string) {
    const channel = await this.prisma.commercialChannel.findUnique({
      where: { id },
    });

    if (!channel) {
      throw new NotFoundException(
        `Commercial channel with ID ${id} not found`,
      );
    }

    return channel;
  }

  /**
   * Actualizar un canal de venta
   */
  async update(id: string, dto: UpdateCommercialChannelDto) {
    // Verificar que existe
    await this.findOne(id);

    // Si se está actualizando el nombre, validar que no exista otro con ese nombre
    if (dto.name) {
      const existing = await this.prisma.commercialChannel.findUnique({
        where: { name: dto.name },
      });

      if (existing && existing.id !== id) {
        throw new BadRequestException(
          `Commercial channel with name "${dto.name}" already exists`,
        );
      }
    }

    return this.prisma.commercialChannel.update({
      where: { id },
      data: dto,
    });
  }

  /**
   * Eliminar un canal de venta
   */
  async remove(id: string) {
    // Verificar que existe
    await this.findOne(id);

    await this.prisma.commercialChannel.delete({
      where: { id },
    });

    return { message: 'Commercial channel deleted successfully' };
  }
}
