// Mock AWS SDK before any imports to intercept S3Client construction
const mockS3Send = jest.fn();

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: mockS3Send })),
  PutObjectCommand: jest.fn().mockImplementation((args) => args),
  GetObjectCommand: jest.fn().mockImplementation((args) => args),
  DeleteObjectCommand: jest.fn().mockImplementation((args) => args),
  HeadObjectCommand: jest.fn().mockImplementation((args) => args),
  ListObjectsV2Command: jest.fn().mockImplementation((args) => args),
}));

const mockGetSignedUrl = jest.fn();
jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: mockGetSignedUrl,
}));

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { StorageS3Service } from './storage-s3.service';
import { FileUploadFailedException } from './exceptions/storage.exceptions';

const mockConfigService = {
  get: jest.fn((key: string) => {
    const config: Record<string, string | number> = {
      'aws.accessKeyId': 'test-access-key',
      'aws.secretAccessKey': 'test-secret-key',
      'aws.region': 'us-east-1',
      'aws.s3.bucketName': 'test-bucket',
      'aws.s3.signedUrlExpiration': 3600,
    };
    return config[key];
  }),
};

describe('StorageS3Service', () => {
  let service: StorageS3Service;

  beforeEach(async () => {
    mockS3Send.mockReset();
    mockGetSignedUrl.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageS3Service,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<StorageS3Service>(StorageS3Service);
  });

  afterEach(() => jest.clearAllMocks());

  // ─────────────────────────────────────────
  // uploadFile
  // ─────────────────────────────────────────
  describe('uploadFile', () => {
    it('should call s3Client.send to upload a file', async () => {
      mockS3Send.mockResolvedValue({});

      await service.uploadFile(
        'development/order/uuid/file.pdf',
        Buffer.from('data'),
        'application/pdf',
      );

      expect(mockS3Send).toHaveBeenCalledTimes(1);
    });

    it('should throw FileUploadFailedException when S3 upload fails', async () => {
      mockS3Send.mockRejectedValue(new Error('S3 upload error'));

      await expect(
        service.uploadFile('key', Buffer.from('data'), 'application/pdf'),
      ).rejects.toThrow(FileUploadFailedException);
    });
  });

  // ─────────────────────────────────────────
  // deleteFile
  // ─────────────────────────────────────────
  describe('deleteFile', () => {
    it('should call s3Client.send to delete a file', async () => {
      mockS3Send.mockResolvedValue({});

      await service.deleteFile('development/order/uuid/file.pdf');

      expect(mockS3Send).toHaveBeenCalledTimes(1);
    });

    it('should throw FileUploadFailedException when S3 delete fails', async () => {
      mockS3Send.mockRejectedValue(new Error('S3 delete error'));

      await expect(service.deleteFile('key')).rejects.toThrow(
        FileUploadFailedException,
      );
    });
  });

  // ─────────────────────────────────────────
  // getSignedUrl
  // ─────────────────────────────────────────
  describe('getSignedUrl', () => {
    it('should return a signed URL from presigner', async () => {
      mockGetSignedUrl.mockResolvedValue('https://s3.example.com/signed-url');

      const result = await service.getSignedUrl('development/order/uuid/file.pdf');

      expect(mockGetSignedUrl).toHaveBeenCalledTimes(1);
      expect(result).toBe('https://s3.example.com/signed-url');
    });

    it('should throw FileUploadFailedException when presigner fails', async () => {
      mockGetSignedUrl.mockRejectedValue(new Error('Presign error'));

      await expect(service.getSignedUrl('key')).rejects.toThrow(
        FileUploadFailedException,
      );
    });

    it('should use default expiration (3600s) when not provided', async () => {
      mockGetSignedUrl.mockResolvedValue('https://s3.example.com/url');

      await service.getSignedUrl('key');

      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ expiresIn: 3600 }),
      );
    });

    it('should use custom expiration when provided', async () => {
      mockGetSignedUrl.mockResolvedValue('https://s3.example.com/url');

      await service.getSignedUrl('key', 7200);

      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ expiresIn: 7200 }),
      );
    });
  });

  // ─────────────────────────────────────────
  // fileExists
  // ─────────────────────────────────────────
  describe('fileExists', () => {
    it('should return true when file exists in S3', async () => {
      mockS3Send.mockResolvedValue({ ContentLength: 1024 });

      const result = await service.fileExists('existing-key');

      expect(result).toBe(true);
    });

    it('should return false when file does not exist (NotFound name)', async () => {
      const notFoundError = { name: 'NotFound', $metadata: { httpStatusCode: 404 } };
      mockS3Send.mockRejectedValue(notFoundError);

      const result = await service.fileExists('non-existing-key');

      expect(result).toBe(false);
    });

    it('should return false when file does not exist (404 status code)', async () => {
      const notFoundError = { name: 'OtherError', $metadata: { httpStatusCode: 404 } };
      mockS3Send.mockRejectedValue(notFoundError);

      const result = await service.fileExists('non-existing-key');

      expect(result).toBe(false);
    });

    it('should rethrow non-404 errors', async () => {
      const serverError = { name: 'InternalServerError', $metadata: { httpStatusCode: 500 } };
      mockS3Send.mockRejectedValue(serverError);

      await expect(service.fileExists('key')).rejects.toMatchObject({
        name: 'InternalServerError',
      });
    });
  });

  // ─────────────────────────────────────────
  // getFileMetadata
  // ─────────────────────────────────────────
  describe('getFileMetadata', () => {
    it('should return metadata from S3', async () => {
      const metadata = { ContentType: 'application/pdf', ContentLength: 1024 };
      mockS3Send.mockResolvedValue(metadata);

      const result = await service.getFileMetadata('key');

      expect(result).toEqual(metadata);
    });

    it('should throw FileUploadFailedException when metadata fetch fails', async () => {
      mockS3Send.mockRejectedValue(new Error('Metadata error'));

      await expect(service.getFileMetadata('key')).rejects.toThrow(
        FileUploadFailedException,
      );
    });
  });

  // ─────────────────────────────────────────
  // listFiles
  // ─────────────────────────────────────────
  describe('listFiles', () => {
    it('should return an array of S3 keys', async () => {
      mockS3Send.mockResolvedValue({
        Contents: [
          { Key: 'development/order/file1.pdf' },
          { Key: 'development/order/file2.pdf' },
        ],
      });

      const result = await service.listFiles('development/order/');

      expect(result).toEqual([
        'development/order/file1.pdf',
        'development/order/file2.pdf',
      ]);
    });

    it('should return empty array when no files found', async () => {
      mockS3Send.mockResolvedValue({ Contents: [] });

      const result = await service.listFiles('development/empty/');

      expect(result).toEqual([]);
    });

    it('should return empty array when Contents is undefined', async () => {
      mockS3Send.mockResolvedValue({});

      const result = await service.listFiles('prefix/');

      expect(result).toEqual([]);
    });

    it('should throw FileUploadFailedException when list operation fails', async () => {
      mockS3Send.mockRejectedValue(new Error('List error'));

      await expect(service.listFiles('prefix/')).rejects.toThrow(
        FileUploadFailedException,
      );
    });
  });
});
