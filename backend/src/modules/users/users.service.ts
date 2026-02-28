import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { CreateUserDto, UpdateUserDto } from './dto';
import { UsersRepository } from './users.repository';
import { RolesRepository } from '../roles/roles.repository';
import { CargosRepository } from '../cargos/cargos.repository';

@Injectable()
export class UsersService {
  private readonly SALT_ROUNDS = 12;

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly rolesRepository: RolesRepository,
    private readonly cargosRepository: CargosRepository,
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
    const userResult = user as any;
    return {
      ...userResult,
      role: {
        id: userResult.role.id,
        name: userResult.role.name,
        permissions: userResult.role.permissions.map((rp: any) => rp.permission),
      },
    };
  }

  /**
   * Genera un username único a partir del nombre y apellido.
   * Si el username base ya existe, agrega un sufijo numérico incremental.
   */
  private async generateUniqueUsername(
    firstName?: string,
    lastName?: string,
  ): Promise<string> {
    const parts = [firstName, lastName].filter(Boolean).join('');
    const base = parts.toLowerCase().replace(/\s+/g, '') || 'user';

    const exists = await this.usersRepository.findByUsername(base);
    if (!exists) return base;

    for (let counter = 1; counter <= 999; counter++) {
      const candidate = `${base}${counter}`;
      const taken = await this.usersRepository.findByUsername(candidate);
      if (!taken) return candidate;
    }

    throw new BadRequestException(
      'Could not generate a unique username. Please provide one manually.',
    );
  }

  /**
   * Crea un nuevo usuario
   */
  async create(createUserDto: CreateUserDto) {
    // Determinar el username
    let username: string;
    if (createUserDto.username) {
      const existingByUsername = await this.usersRepository.findByUsername(
        createUserDto.username,
      );
      if (existingByUsername) {
        throw new BadRequestException('Username already taken');
      }
      username = createUserDto.username;
    } else {
      username = await this.generateUniqueUsername(
        createUserDto.firstName,
        createUserDto.lastName,
      );
    }

    // Verificar si el email ya existe (si se proporciona)
    if (createUserDto.email) {
      const existingUser = await this.usersRepository.findByEmail(createUserDto.email);
      if (existingUser) {
        throw new BadRequestException('Email already registered');
      }
    }

    // Verificar si el rol existe
    const role = await this.rolesRepository.findById(createUserDto.roleId);

    if (!role) {
      throw new BadRequestException('Invalid role ID');
    }

    // Verificar si el cargo existe (si se proporciona)
    if (createUserDto.cargoId) {
      const cargo = await this.cargosRepository.findById(createUserDto.cargoId);

      if (!cargo) {
        throw new BadRequestException('Invalid cargo ID');
      }

      if (!cargo.isActive) {
        throw new BadRequestException('Cannot assign an inactive cargo');
      }
    }

    // Hashear el password
    const hashedPassword = await bcrypt.hash(
      createUserDto.password,
      this.SALT_ROUNDS,
    );

    // Crear el usuario
    return this.usersRepository.create({
      username: username as string,
      ...(createUserDto.email && { email: createUserDto.email }),
      password: hashedPassword,
      firstName: createUserDto.firstName,
      lastName: createUserDto.lastName,
      role: {
        connect: { id: createUserDto.roleId },
      },
      ...(createUserDto.cargoId && {
        cargo: {
          connect: { id: createUserDto.cargoId },
        },
      }),
    });
  }

  /**
   * Actualiza un usuario
   */
  async update(id: string, updateUserDto: UpdateUserDto) {
    // Verificar que el usuario existe
    await this.findOne(id);

    // Si se actualiza el username, verificar unicidad
    if (updateUserDto.username) {
      const existingByUsername =
        await this.usersRepository.findByUsernameExcludingId(
          updateUserDto.username,
          id,
        );
      if (existingByUsername) {
        throw new BadRequestException('Username already taken');
      }
    }

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

    // Si se actualiza el cargo, verificar que existe y está activo
    if (updateUserDto.cargoId) {
      const cargo = await this.cargosRepository.findById(updateUserDto.cargoId);

      if (!cargo) {
        throw new BadRequestException('Invalid cargo ID');
      }

      if (!cargo.isActive) {
        throw new BadRequestException('Cannot assign an inactive cargo');
      }
    }

    // Preparar datos de actualización
    const { password, roleId, cargoId, username, ...updateData } = updateUserDto;

    // Incluir username si fue provisto
    if (username) {
      (updateData as any).username = username;
    }

    // Si se actualiza el password, hashearlo
    if (password) {
      (updateData as any).password = await bcrypt.hash(
        password,
        this.SALT_ROUNDS,
      );
    }

    // Si se actualiza el roleId, usar la sintaxis de Prisma connect
    if (roleId) {
      (updateData as any).role = { connect: { id: roleId } };
    }

    // Manejar cargoId: connect si tiene valor, disconnect si es null
    if (cargoId !== undefined) {
      if (cargoId === null) {
        (updateData as any).cargo = { disconnect: true };
      } else {
        (updateData as any).cargo = { connect: { id: cargoId } };
      }
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
