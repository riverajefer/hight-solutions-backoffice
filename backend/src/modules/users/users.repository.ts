import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '../../generated/prisma';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Encuentra todos los usuarios con su rol y cargo
   */
  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        roleId: true,
        cargoId: true,
        createdAt: true,
        updatedAt: true,
        firstName: true,
        lastName: true,
        role: {
          select: {
            id: true,
            name: true,
          },
        },
        cargo: {
          select: {
            id: true,
            name: true,
            area: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Encuentra un usuario por ID con su rol, permisos y cargo
   */
  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        roleId: true,
        cargoId: true,
        createdAt: true,
        updatedAt: true,
        firstName: true,
        lastName: true,
        role: {
          select: {
            id: true,
            name: true,
            permissions: {
              select: {
                permission: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                  },
                },
              },
            },
          },
        },
        cargo: {
          select: {
            id: true,
            name: true,
            description: true,
            area: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Encuentra un usuario por email
   */
  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        username: true,
        email: true,
        password: true,
        roleId: true,
        refreshToken: true,
        firstName: true,
        lastName: true,
      },
    });
  }

  /**
   * Encuentra un usuario por email excluyendo un ID específico
   */
  async findByEmailExcludingId(email: string, excludeId: string) {
    return this.prisma.user.findFirst({
      where: {
        email,
        NOT: { id: excludeId },
      },
    });
  }

  /**
   * Encuentra un usuario por username
   */
  async findByUsername(username: string) {
    return this.prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        email: true,
        password: true,
        roleId: true,
        refreshToken: true,
        firstName: true,
        lastName: true,
      },
    });
  }

  /**
   * Encuentra un usuario por username excluyendo un ID específico
   */
  async findByUsernameExcludingId(username: string, excludeId: string) {
    return this.prisma.user.findFirst({
      where: {
        username,
        NOT: { id: excludeId },
      },
    });
  }

  /**
   * Crea un nuevo usuario
   */
  async create(data: Prisma.UserCreateInput) {
    return this.prisma.user.create({
      data,
      select: {
        id: true,
        username: true,
        email: true,
        roleId: true,
        cargoId: true,
        createdAt: true,
        firstName: true,
        lastName: true,
        role: {
          select: {
            id: true,
            name: true,
          },
        },
        cargo: {
          select: {
            id: true,
            name: true,
            area: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Actualiza un usuario
   */
  async update(id: string, data: Prisma.UserUpdateInput) {
    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        username: true,
        email: true,
        roleId: true,
        cargoId: true,
        createdAt: true,
        updatedAt: true,
        firstName: true,
        lastName: true,
        role: {
          select: {
            id: true,
            name: true,
          },
        },
        cargo: {
          select: {
            id: true,
            name: true,
            area: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Actualiza el refresh token de un usuario
   */
  async updateRefreshToken(id: string, refreshToken: string | null) {
    return this.prisma.user.update({
      where: { id },
      data: { refreshToken },
    });
  }

  /**
   * Elimina un usuario
   */
  async delete(id: string) {
    return this.prisma.user.delete({
      where: { id },
    });
  }
}
