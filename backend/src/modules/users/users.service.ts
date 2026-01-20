import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { CreateUserDto, UpdateUserDto } from './dto';
import { UsersRepository } from './users.repository';
import { RolesRepository } from '../roles/roles.repository';

@Injectable()
export class UsersService {
  private readonly SALT_ROUNDS = 12;

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly rolesRepository: RolesRepository,
  ) {}

  /**
   * Obtiene todos los usuarios con su rol
   */
  async findAll() {
    return this.usersRepository.findAll();
  }

  /**
   * Obtiene un usuario por ID con su rol y permisos
   */
  async findOne(id: string) {
    const user = await this.usersRepository.findById(id);

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Transformar la estructura de permisos para mejor legibilidad
    return {
      ...user,
      role: {
        id: user.role.id,
        name: user.role.name,
        permissions: user.role.permissions.map((rp) => rp.permission),
      },
    };
  }

  /**
   * Crea un nuevo usuario
   */
  async create(createUserDto: CreateUserDto) {
    // Verificar si el email ya existe
    const existingUser = await this.usersRepository.findByEmail(createUserDto.email);

    if (existingUser) {
      throw new BadRequestException('Email already registered');
    }

    // Verificar si el rol existe
    const role = await this.rolesRepository.findById(createUserDto.roleId);

    if (!role) {
      throw new BadRequestException('Invalid role ID');
    }

    // Hashear el password
    const hashedPassword = await bcrypt.hash(
      createUserDto.password,
      this.SALT_ROUNDS,
    );

    // Crear el usuario
    return this.usersRepository.create({
      email: createUserDto.email,
      password: hashedPassword,
      role: {
        connect: { id: createUserDto.roleId },
      },
    });
  }

  /**
   * Actualiza un usuario
   */
  async update(id: string, updateUserDto: UpdateUserDto) {
    // Verificar que el usuario existe
    await this.findOne(id);

    // Si se actualiza el email, verificar que no exista
    if (updateUserDto.email) {
      const existingUser = await this.usersRepository.findByEmailExcludingId(
        updateUserDto.email,
        id,
      );

      if (existingUser) {
        throw new BadRequestException('Email already in use');
      }
    }

    // Si se actualiza el rol, verificar que existe
    if (updateUserDto.roleId) {
      const role = await this.rolesRepository.findById(updateUserDto.roleId);

      if (!role) {
        throw new BadRequestException('Invalid role ID');
      }
    }

    // Preparar datos de actualización
    const updateData: any = { ...updateUserDto };

    // Si se actualiza el password, hashearlo
    if (updateUserDto.password) {
      updateData.password = await bcrypt.hash(
        updateUserDto.password,
        this.SALT_ROUNDS,
      );
    }

    // Si se actualiza el roleId, usar la sintaxis de Prisma connect
    if (updateUserDto.roleId) {
      updateData.role = { connect: { id: updateUserDto.roleId } };
      delete updateData.roleId;
    }

    return this.usersRepository.update(id, updateData);
  }

  /**
   * Elimina un usuario
   */
  async remove(id: string) {
    await this.findOne(id);

    await this.usersRepository.delete(id);

    return { message: `User with ID ${id} deleted successfully` };
  }
}
