import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

/** Campos del doble factor de un usuario. `twoFactorSecret` solo sale de aquí. */
const TWO_FACTOR_STATE_SELECT = {
  id: true,
  username: true,
  isActive: true,
  twoFactorEnabled: true,
  twoFactorSecret: true,
  twoFactorEnabledAt: true,
  twoFactorLastUsedStep: true,
  twoFactorFailedAttempts: true,
  twoFactorLockedUntil: true,
  requireTwoFactor: true,
  role: { select: { id: true, name: true, requireTwoFactor: true } },
} as const;

/** Lo que borra desactivar o restablecer: el usuario queda como si nunca lo hubiera activado. */
const CLEARED_TWO_FACTOR = {
  twoFactorEnabled: false,
  twoFactorSecret: null,
  twoFactorEnabledAt: null,
  twoFactorLastUsedStep: null,
  twoFactorFailedAttempts: 0,
  twoFactorLockedUntil: null,
};

@Injectable()
export class TwoFactorRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findUserState(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: TWO_FACTOR_STATE_SELECT,
    });
  }

  /** Guarda el secreto de un registro en curso; no pisa uno ya activo. */
  async setRequireTwoFactor(userId: string, requireTwoFactor: boolean) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { requireTwoFactor },
      select: { id: true, requireTwoFactor: true },
    });
  }

  async savePendingSecret(userId: string, encryptedSecret: string) {
    const result = await this.prisma.user.updateMany({
      where: { id: userId, twoFactorEnabled: false },
      data: { twoFactorSecret: encryptedSecret },
    });
    return result.count;
  }

  async enable(userId: string, step: number, backupCodeHashes: string[]) {
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          twoFactorEnabled: true,
          twoFactorEnabledAt: new Date(),
          twoFactorLastUsedStep: step,
          twoFactorFailedAttempts: 0,
          twoFactorLockedUntil: null,
        },
      });
      await tx.twoFactorBackupCode.deleteMany({ where: { userId } });
      await tx.twoFactorBackupCode.createMany({
        data: backupCodeHashes.map((codeHash) => ({ userId, codeHash })),
      });
    });
  }

  /**
   * Borra el doble factor del usuario: secreto, códigos y equipos de confianza.
   * Con `closeSessions` también invalida su refresh token.
   */
  async clear(userId: string, closeSessions: boolean) {
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: closeSessions
          ? { ...CLEARED_TWO_FACTOR, refreshToken: null }
          : CLEARED_TWO_FACTOR,
      });
      await tx.twoFactorBackupCode.deleteMany({ where: { userId } });
      await tx.trustedDevice.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });
  }

  async recordSuccess(userId: string, step: number | null) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorFailedAttempts: 0,
        twoFactorLockedUntil: null,
        ...(step !== null && { twoFactorLastUsedStep: step }),
      },
    });
  }

  /** Suma un fallo; devuelve el total de fallos seguidos. */
  async incrementFailedAttempts(userId: string) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorFailedAttempts: { increment: 1 } },
      select: { twoFactorFailedAttempts: true },
    });
    return user.twoFactorFailedAttempts;
  }

  async lock(userId: string, until: Date) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorFailedAttempts: 0, twoFactorLockedUntil: until },
    });
  }

  async replaceBackupCodes(userId: string, codeHashes: string[]) {
    await this.prisma.$transaction(async (tx) => {
      await tx.twoFactorBackupCode.deleteMany({ where: { userId } });
      await tx.twoFactorBackupCode.createMany({
        data: codeHashes.map((codeHash) => ({ userId, codeHash })),
      });
    });
  }

  /** Marca el código como usado; `false` si no existe o ya se usó (incluso en una carrera). */
  async consumeBackupCode(userId: string, codeHash: string) {
    const result = await this.prisma.twoFactorBackupCode.updateMany({
      where: { userId, codeHash, usedAt: null },
      data: { usedAt: new Date() },
    });
    return result.count === 1;
  }

  async countUnusedBackupCodes(userId: string) {
    return this.prisma.twoFactorBackupCode.count({
      where: { userId, usedAt: null },
    });
  }

  async createTrustedDevice(data: {
    userId: string;
    tokenHash: string;
    userAgent?: string;
    ipAddress?: string;
    expiresAt: Date;
  }) {
    return this.prisma.trustedDevice.create({ data, select: { id: true } });
  }

  async findActiveTrustedDevice(tokenHash: string) {
    return this.prisma.trustedDevice.findFirst({
      where: { tokenHash, revokedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, userId: true },
    });
  }

  async touchTrustedDevice(id: string) {
    await this.prisma.trustedDevice.update({
      where: { id },
      data: { lastUsedAt: new Date() },
    });
  }

  async listActiveTrustedDevices(userId: string) {
    return this.prisma.trustedDevice.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      select: {
        id: true,
        userAgent: true,
        ipAddress: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { lastUsedAt: 'desc' },
    });
  }

  async revokeTrustedDevice(userId: string, id: string) {
    const result = await this.prisma.trustedDevice.updateMany({
      where: { id, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return result.count === 1;
  }

  async revokeAllTrustedDevices(userId: string) {
    await this.prisma.trustedDevice.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
