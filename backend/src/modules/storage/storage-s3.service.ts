import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommandOutput,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { FileUploadFailedException } from './exceptions/storage.exceptions';

@Injectable()
export class StorageS3Service {
  private readonly logger = new Logger(StorageS3Service.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly defaultSignedUrlExpiration: number;

  constructor(private readonly configService: ConfigService) {
    const accessKeyId = this.configService.get<string>('aws.accessKeyId');
    const secretAccessKey = this.configService.get<string>(
      'aws.secretAccessKey',
    );
    const region = this.configService.get<string>('aws.region');
    const endpoint = this.configService.get<string>('aws.endpoint');

    this.bucketName = this.configService.get<string>('aws.s3.bucketName') || '';
    this.defaultSignedUrlExpiration =
      this.configService.get<number>('aws.s3.signedUrlExpiration') || 3600;

    if (!accessKeyId || !secretAccessKey || !this.bucketName) {
      throw new Error(
        'AWS S3 configuration is missing. Please check your environment variables.',
      );
    }

    this.s3Client = new S3Client({
      region: region || 'auto',
      endpoint: endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    this.logger.log('S3Client initialized successfully');
  }

  /**
   * Upload a file to S3
   * @param key - The S3 key (path) for the file
   * @param buffer - File buffer
   * @param mimeType - MIME type of the file
   */
  async uploadFile(
    key: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<void> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      });

      await this.s3Client.send(command);
      this.logger.log(`File uploaded successfully: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to upload file to S3: ${key}`, error.stack);
      throw new FileUploadFailedException(error.message);
    }
  }

  /**
   * Delete a file from S3
   * @param key - The S3 key (path) of the file to delete
   */
  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
      this.logger.log(`File deleted successfully: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete file from S3: ${key}`, error.stack);
      throw new FileUploadFailedException(
        `Failed to delete file: ${error.message}`,
      );
    }
  }

  /**
   * Generate a signed URL for accessing a file
   * @param key - The S3 key (path) of the file
   * @param expiresIn - URL expiration time in seconds (default: configured value)
   * @returns Signed URL
   */
  async getSignedUrl(
    key: string,
    expiresIn: number = this.defaultSignedUrlExpiration,
  ): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn,
      });

      this.logger.log(`Signed URL generated for: ${key}`);
      this.logger.debug(`Signed URL: ${signedUrl}`);
      return signedUrl;
    } catch (error) {
      this.logger.error(
        `Failed to generate signed URL for: ${key}`,
        error.stack,
      );
      throw new FileUploadFailedException(
        `Failed to generate signed URL: ${error.message}`,
      );
    }
  }

  /**
   * Check if a file exists in S3
   * @param key - The S3 key (path) to check
   * @returns True if file exists, false otherwise
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      this.logger.error(`Error checking file existence: ${key}`, error.stack);
      throw error;
    }
  }

  /**
   * Get file metadata from S3
   * @param key - The S3 key (path) of the file
   * @returns File metadata
   */
  async getFileMetadata(key: string): Promise<HeadObjectCommandOutput> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.s3Client.send(command);
      return response;
    } catch (error) {
      this.logger.error(`Failed to get file metadata: ${key}`, error.stack);
      throw new FileUploadFailedException(
        `Failed to get file metadata: ${error.message}`,
      );
    }
  }

  /**
   * List files with a given prefix
   * @param prefix - The prefix to filter files (e.g., 'development/order/')
   * @returns Array of S3 keys
   */
  async listFiles(prefix: string): Promise<string[]> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: prefix,
      });

      const response = await this.s3Client.send(command);
      return (response.Contents || [])
        .map((item) => item.Key)
        .filter((key): key is string => Boolean(key));
    } catch (error) {
      this.logger.error(`Failed to list files with prefix: ${prefix}`, error.stack);
      throw new FileUploadFailedException(
        `Failed to list files: ${error.message}`,
      );
    }
  }
}
