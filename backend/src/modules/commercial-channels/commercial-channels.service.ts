import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  CreateCommercialChannelDto,
  UpdateCommercialChannelDto,
} from './dto';
import { CommercialChannelsRepository } from './commercial-channels.repository';

@Injectable()
export class CommercialChannelsService {
  constructor(
    private readonly repository: CommercialChannelsRepository,
  ) {}

  /**
   * Crear un nuevo canal de venta
   */
  async create(dto: CreateCommercialChannelDto) {
    // Validar que no exista un canal con el mismo nombre
    const existing = await this.repository.findByName(dto.name);

    if (existing) {
      throw new BadRequestException(
        `El canal comercial con el nombre "${dto.name}" ya existe`,
      );
    }

    return this.repository.create(dto);
  }

  /**
   * Obtener todos los canales de venta
   */
  async findAll() {
    return this.repository.findAll();
  }

  /**
   * Obtener un canal de venta por ID
   */
  async findOne(id: string) {
    const channel = await this.repository.findById(id);

    if (!channel) {
      throw new NotFoundException(
        `Canal comercial con ID ${id} no encontrado`,
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
      const existing = await this.repository.findByName(dto.name);

      if (existing && existing.id !== id) {
        throw new BadRequestException(
          `El canal comercial con el nombre "${dto.name}" ya existe`,
        );
      }
    }

    return this.repository.update(id, dto);
  }

  /**
   * Eliminar un canal de venta
   */
  async remove(id: string) {
    // Verificar que existe
    await this.findOne(id);

    // Aquí se podría agregar validación si tiene pedidos asociados, similar a cargos con usuarios
    // Por ahora solo eliminamos como estaba originalmente pero usando el repo

    await this.repository.delete(id);

    return { message: 'Canal comercial eliminado correctamente' };
  }
}
