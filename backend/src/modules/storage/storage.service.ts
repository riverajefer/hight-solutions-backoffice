import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { StorageS3Service } from './storage-s3.service';
import { StorageRepository } from './storage.repository';
import {
  FileNotFoundStorageException,
  InvalidFileTypeException,
  FileSizeLimitException,
  FileUploadFailedException,
  FileDeleteForbiddenException,
} from './exceptions/storage.exceptions';
import { FILE_CONFIG } from './constants/file-config.constants';

interface UploadOptions {
  entityType?: string;
  entityId?: string;
  userId?: string;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly environment: string;

  constructor(
    private readonly storageRepository: StorageRepository,
    private readonly storageS3Service: StorageS3Service,
    private readonly configService: ConfigService,
  ) {
    this.environment = this.configService.get<string>('app.nodeEnv') || 'development';
  }

  /**
   * Upload a file to S3 and store metadata in database
   */
  async uploadFile(file: Express.Multer.File, options: UploadOptions = {}) {
    // Validate file
    this.validateFile(file);

    // Generate unique file name and S3 key
    const fileName = this.generateFileName(file.originalname);
    const s3Key = this.generateS3Key(fileName, options.entityType);

    try {
      // Upload to S3
      await this.storageS3Service.uploadFile(
        s3Key,
        file.buffer,
        file.mimetype,
      );

      // Save metadata to database
      const uploadedFile = await this.storageRepository.create({
        originalName: file.originalname,
        fileName,
        mimeType: file.mimetype,
        size: file.size,
        s3Key,
        s3Bucket:
          this.configService.get<string>('aws.s3.bucketName') || '',
        entityType: options.entityType,
        entityId: options.entityId,
        uploadedBy: options.userId,
      });

      this.logger.log(`File uploaded successfully: ${fileName}`);

      // Generate signed URL and attach to response
      const url = await this.storageS3Service.getSignedUrl(s3Key);

      return {
        ...uploadedFile,
        url,
      };
    } catch (error) {
      // If S3 upload succeeded but database save failed, try to rollback S3 upload
      try {
        await this.storageS3Service.deleteFile(s3Key);
      } catch (rollbackError) {
        this.logger.error(
          `Failed to rollback S3 upload for: ${s3Key}`,
          rollbackError.stack,
        );
      }

      this.logger.error(`File upload failed: ${fileName}`, error.stack);
      throw new FileUploadFailedException(error.message);
    }
  }

  /**
   * Get file metadata by ID
   */
  async getFile(fileId: string) {
    const file = await this.storageRepository.findById(fileId);

    if (!file) {
      throw new FileNotFoundStorageException(fileId);
    }

    if (file.isDeleted) {
      throw new FileNotFoundStorageException(fileId);
    }

    return file;
  }

  /**
   * Get a signed URL for accessing a file
   */
  async getFileUrl(fileId: string, expiresIn?: number) {
    const file = await this.getFile(fileId);
    const url = await this.storageS3Service.getSignedUrl(
      file.s3Key,
      expiresIn,
    );
    return url;
  }

  /**
   * Get files by entity
   */
  async getFilesByEntity(entityType: string, entityId: string) {
    return this.storageRepository.findByEntity(entityType, entityId);
  }

  /**
   * Get files by user
   */
  async getFilesByUser(userId: string) {
    return this.storageRepository.findByUser(userId);
  }

  /**
   * Delete a file (soft delete)
   */
  async deleteFile(fileId: string, userId?: string) {
    const file = await this.getFile(fileId);

    // Check if user has permission to delete (only their own files unless admin)
    // This should be complemented by permission guards in the controller
    if (userId && file.uploadedBy && file.uploadedBy !== userId) {
      // This is a soft check, the actual permission check is in the guard
      this.logger.warn(
        `User ${userId} attempting to delete file ${fileId} uploaded by ${file.uploadedBy}`,
      );
    }

    // Soft delete in database
    await this.storageRepository.softDelete(fileId);

    this.logger.log(`File soft-deleted: ${fileId}`);

    // Note: Physical deletion from S3 can be done by a scheduled cleanup job
    // This prevents accidental permanent deletions
  }

  /**
   * Hard delete a file (remove from S3 and database)
   * Should only be called by cleanup jobs or admins
   */
  async hardDeleteFile(fileId: string) {
    const file = await this.storageRepository.findById(fileId);

    if (!file) {
      throw new FileNotFoundStorageException(fileId);
    }

    try {
      // Delete from S3
      await this.storageS3Service.deleteFile(file.s3Key);

      // Delete from database
      await this.storageRepository.hardDelete(fileId);

      this.logger.log(`File hard-deleted: ${fileId}`);
    } catch (error) {
      this.logger.error(`Hard delete failed for: ${fileId}`, error.stack);
      throw new FileUploadFailedException(
        `Failed to hard delete file: ${error.message}`,
      );
    }
  }

  /**
   * Validate file type and size
   */
  private validateFile(file: Express.Multer.File): void {
    // Check MIME type
    const allowedMimeTypes: readonly string[] = FILE_CONFIG.ALLOWED_MIME_TYPES;
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new InvalidFileTypeException(file.mimetype);
    }

    // Check file size
    if (file.size > FILE_CONFIG.MAX_FILE_SIZE) {
      throw new FileSizeLimitException(file.size, FILE_CONFIG.MAX_FILE_SIZE);
    }
  }

  /**
   * Generate a unique file name
   */
  private generateFileName(originalName: string): string {
    const sanitized = this.sanitizeFileName(originalName);
    const uuid = uuidv4();
    const timestamp = Date.now();
    return `${timestamp}-${uuid}-${sanitized}`;
  }

  /**
   * Sanitize file name (remove special characters, spaces, etc.)
   */
  private sanitizeFileName(fileName: string): string {
    return fileName
      .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace special chars with underscore
      .replace(/_{2,}/g, '_') // Replace multiple underscores with single
      .toLowerCase();
  }

  /**
   * Generate S3 key with environment and entity type prefix
   * Format: {environment}/{entityType}/{uuid}/{fileName}
   * Example: development/order/abc-123/myfile.pdf
   */
  private generateS3Key(fileName: string, entityType?: string): string {
    const parts = [this.environment];

    if (entityType) {
      parts.push(entityType);
    } else {
      parts.push('general');
    }

    parts.push(uuidv4()); // Add UUID folder to prevent collisions
    parts.push(fileName);

    return parts.join('/');
  }
}
