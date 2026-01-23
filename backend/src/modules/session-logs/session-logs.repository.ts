import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { SessionLogsFilterDto } from './dto';

@Injectable()
export class SessionLogsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a login log entry
   */
  async createLoginLog(userId: string, ipAddress?: string, userAgent?: string) {
    return this.prisma.sessionLog.create({
      data: {
        userId,
        loginAt: new Date(),
        ipAddress,
        userAgent,
      },
    });
  }

  /**
   * Update logout time for the most recent active session
   */
  async updateLogoutLog(userId: string) {
    // Find the most recent session without logout
    const activeSession = await this.prisma.sessionLog.findFirst({
      where: {
        userId,
        logoutAt: null,
      },
      orderBy: {
        loginAt: 'desc',
      },
    });

    if (!activeSession) {
      return null;
    }

    return this.prisma.sessionLog.update({
      where: { id: activeSession.id },
      data: {
        logoutAt: new Date(),
      },
    });
  }

  /**
   * Find all session logs with filters and pagination
   */
  async findAll(filters: SessionLogsFilterDto) {
    const { startDate, endDate, userId, page = 1, limit = 10 } = filters;

    const where: any = {};

    // Date filters
    if (startDate || endDate) {
      where.loginAt = {};
      if (startDate) {
        where.loginAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.loginAt.lte = new Date(endDate);
      }
    }

    // User filter
    if (userId) {
      where.userId = userId;
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.sessionLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          loginAt: 'desc',
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
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
          },
        },
      }),
      this.prisma.sessionLog.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find session logs by user ID
   */
  async findByUserId(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.sessionLog.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: {
          loginAt: 'desc',
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
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
          },
        },
      }),
      this.prisma.sessionLog.count({ where: { userId } }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get all active sessions (no logout time)
   */
  async getActiveSessions() {
    return this.prisma.sessionLog.findMany({
      where: {
        logoutAt: null,
      },
      orderBy: {
        loginAt: 'desc',
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
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
        },
      },
    });
  }
}
