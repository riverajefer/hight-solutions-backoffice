import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '../../generated/prisma';

@Injectable()
export class StorageRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new uploaded file record
   */
  async create(data: Prisma.UploadedFileCreateInput) {
    return this.prisma.uploadedFile.create({
      data,
    });
  }

  /**
   * Find a file by ID
   */
  async findById(id: string) {
    return this.prisma.uploadedFile.findUnique({
      where: { id },
    });
  }

  /**
   * Find a file by S3 key
   */
  async findByS3Key(s3Key: string) {
    return this.prisma.uploadedFile.findUnique({
      where: { s3Key },
    });
  }

  /**
   * Find files by entity type and ID
   */
  async findByEntity(entityType: string, entityId: string) {
    return this.prisma.uploadedFile.findMany({
      where: {
        entityType,
        entityId,
        isDeleted: false,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find files by user ID
   */
  async findByUser(userId: string) {
    return this.prisma.uploadedFile.findMany({
      where: {
        uploadedBy: userId,
        isDeleted: false,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Soft delete a file (mark as deleted)
   */
  async softDelete(id: string) {
    return this.prisma.uploadedFile.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  /**
   * Hard delete a file (remove from database)
   */
  async hardDelete(id: string): Promise<void> {
    await this.prisma.uploadedFile.delete({
      where: { id },
    });
  }

  /**
   * Find deleted files older than a specific date
   */
  async findDeletedFiles(olderThan: Date) {
    return this.prisma.uploadedFile.findMany({
      where: {
        isDeleted: true,
        updatedAt: {
          lt: olderThan,
        },
      },
    });
  }

  /**
   * Find all files (including deleted ones)
   */
  async findAll() {
    return this.prisma.uploadedFile.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }
}
