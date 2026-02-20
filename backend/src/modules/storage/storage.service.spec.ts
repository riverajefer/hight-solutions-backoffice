// uuid is ESM-only in v9+; mock before any imports
jest.mock('uuid', () => ({ v4: jest.fn(() => 'mock-uuid') }));

import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageService } from './storage.service';
import { StorageRepository } from './storage.repository';
import { StorageS3Service } from './storage-s3.service';
import {
  FileNotFoundStorageException,
  InvalidFileTypeException,
  FileSizeLimitException,
  FileUploadFailedException,
} from './exceptions/storage.exceptions';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockStorageRepository = {
  findById: jest.fn(),
  findByEntity: jest.fn(),
  findByUser: jest.fn(),
  create: jest.fn(),
  softDelete: jest.fn(),
  hardDelete: jest.fn(),
};

const mockStorageS3Service = {
  uploadFile: jest.fn(),
  getSignedUrl: jest.fn(),
  deleteFile: jest.fn(),
};

const mockConfigService = {
  get: jest.fn((key: string) => {
    const config: Record<string, string> = {
      'app.nodeEnv': 'development',
      'aws.s3.bucketName': 'test-bucket',
    };
    return config[key];
  }),
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const makeFile = (overrides: Partial<Express.Multer.File> = {}): Express.Multer.File => ({
  fieldname: 'file',
  originalname: 'test document.pdf',
  encoding: '7bit',
  mimetype: 'application/pdf',
  buffer: Buffer.from('test content'),
  size: 1024, // 1 KB
  stream: null as any,
  destination: '',
  filename: '',
  path: '',
  ...overrides,
});

const mockSavedFile = {
  id: 'file-1',
  originalName: 'test document.pdf',
  fileName: 'sanitized.pdf',
  mimeType: 'application/pdf',
  size: 1024,
  s3Key: 'development/general/mock-uuid/sanitized.pdf',
  s3Bucket: 'test-bucket',
  isDeleted: false,
};

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------
describe('StorageService', () => {
  let service: StorageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        { provide: StorageRepository, useValue: mockStorageRepository },
        { provide: StorageS3Service, useValue: mockStorageS3Service },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<StorageService>(StorageService);

    // Default happy-path stubs
    mockStorageS3Service.uploadFile.mockResolvedValue(undefined);
    mockStorageS3Service.getSignedUrl.mockResolvedValue('https://s3.example.com/signed');
    mockStorageRepository.create.mockResolvedValue(mockSavedFile);
    mockStorageRepository.findById.mockResolvedValue(mockSavedFile);
  });

  afterEach(() => jest.clearAllMocks());

  // ---------------------------------------------------------------------------
  // uploadFile
  // ---------------------------------------------------------------------------
  describe('uploadFile', () => {
    it('should throw InvalidFileTypeException for a disallowed MIME type', async () => {
      const file = makeFile({ mimetype: 'application/zip' });

      await expect(service.uploadFile(file)).rejects.toThrow(
        InvalidFileTypeException,
      );
    });

    it('should throw FileSizeLimitException when file exceeds 10MB', async () => {
      const file = makeFile({ size: 11 * 1024 * 1024 }); // 11 MB

      await expect(service.uploadFile(file)).rejects.toThrow(
        FileSizeLimitException,
      );
    });

    it('should call storageS3Service.uploadFile with the generated s3Key', async () => {
      const file = makeFile();

      await service.uploadFile(file);

      expect(mockStorageS3Service.uploadFile).toHaveBeenCalledWith(
        expect.stringContaining('development/'),
        file.buffer,
        file.mimetype,
      );
    });

    it('should save file metadata to the repository after S3 upload', async () => {
      const file = makeFile();

      await service.uploadFile(file);

      expect(mockStorageRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          originalName: 'test document.pdf',
          mimeType: 'application/pdf',
          size: 1024,
          s3Bucket: 'test-bucket',
        }),
      );
    });

    it('should include entityType in the s3Key when provided', async () => {
      const file = makeFile();

      await service.uploadFile(file, { entityType: 'order' });

      expect(mockStorageS3Service.uploadFile).toHaveBeenCalledWith(
        expect.stringContaining('order/'),
        expect.anything(),
        expect.anything(),
      );
    });

    it('should use "general" as s3Key segment when entityType is not provided', async () => {
      const file = makeFile();

      await service.uploadFile(file);

      expect(mockStorageS3Service.uploadFile).toHaveBeenCalledWith(
        expect.stringContaining('general/'),
        expect.anything(),
        expect.anything(),
      );
    });

    it('should return the saved file enriched with a signed URL', async () => {
      const file = makeFile();

      const result = await service.uploadFile(file);

      expect(result).toMatchObject({
        id: 'file-1',
        url: 'https://s3.example.com/signed',
      });
    });

    it('should sanitize the original file name (replace spaces and special chars with underscores)', async () => {
      const file = makeFile({ originalname: 'My Document (1).pdf' });

      await service.uploadFile(file);

      const createArg = mockStorageRepository.create.mock.calls[0][0];
      // fileName should not contain spaces or parentheses
      expect(createArg.fileName).not.toMatch(/[ ()]/);
    });

    it('should throw FileUploadFailedException and attempt S3 rollback when repository.create fails', async () => {
      const loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
      mockStorageRepository.create.mockRejectedValue(new Error('DB error'));
      mockStorageS3Service.deleteFile.mockResolvedValue(undefined);

      const file = makeFile();

      await expect(service.uploadFile(file)).rejects.toThrow(
        FileUploadFailedException,
      );

      // Rollback: S3 file should be deleted
      expect(mockStorageS3Service.deleteFile).toHaveBeenCalled();

      loggerErrorSpy.mockRestore();
    });
  });

  // ---------------------------------------------------------------------------
  // getFile
  // ---------------------------------------------------------------------------
  describe('getFile', () => {
    it('should return the file when found and not deleted', async () => {
      const result = await service.getFile('file-1');

      expect(result).toEqual(mockSavedFile);
    });

    it('should throw FileNotFoundStorageException when file does not exist', async () => {
      mockStorageRepository.findById.mockResolvedValue(null);

      await expect(service.getFile('nonexistent')).rejects.toThrow(
        FileNotFoundStorageException,
      );
    });

    it('should throw FileNotFoundStorageException when file is soft-deleted', async () => {
      mockStorageRepository.findById.mockResolvedValue({
        ...mockSavedFile,
        isDeleted: true,
      });

      await expect(service.getFile('file-1')).rejects.toThrow(
        FileNotFoundStorageException,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // getFileUrl
  // ---------------------------------------------------------------------------
  describe('getFileUrl', () => {
    it('should return a signed URL for the file', async () => {
      const result = await service.getFileUrl('file-1');

      expect(mockStorageS3Service.getSignedUrl).toHaveBeenCalledWith(
        mockSavedFile.s3Key,
        undefined,
      );
      expect(result).toBe('https://s3.example.com/signed');
    });

    it('should pass custom expiresIn to getSignedUrl when provided', async () => {
      await service.getFileUrl('file-1', 7200);

      expect(mockStorageS3Service.getSignedUrl).toHaveBeenCalledWith(
        mockSavedFile.s3Key,
        7200,
      );
    });

    it('should throw FileNotFoundStorageException when file does not exist', async () => {
      mockStorageRepository.findById.mockResolvedValue(null);

      await expect(service.getFileUrl('nonexistent')).rejects.toThrow(
        FileNotFoundStorageException,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // getFilesByEntity
  // ---------------------------------------------------------------------------
  describe('getFilesByEntity', () => {
    it('should delegate to repository.findByEntity with entityType and entityId', async () => {
      const files = [mockSavedFile];
      mockStorageRepository.findByEntity.mockResolvedValue(files);

      const result = await service.getFilesByEntity('order', 'order-1');

      expect(mockStorageRepository.findByEntity).toHaveBeenCalledWith(
        'order',
        'order-1',
      );
      expect(result).toEqual(files);
    });
  });

  // ---------------------------------------------------------------------------
  // getFilesByUser
  // ---------------------------------------------------------------------------
  describe('getFilesByUser', () => {
    it('should delegate to repository.findByUser with userId', async () => {
      const files = [mockSavedFile];
      mockStorageRepository.findByUser.mockResolvedValue(files);

      const result = await service.getFilesByUser('user-1');

      expect(mockStorageRepository.findByUser).toHaveBeenCalledWith('user-1');
      expect(result).toEqual(files);
    });
  });

  // ---------------------------------------------------------------------------
  // deleteFile
  // ---------------------------------------------------------------------------
  describe('deleteFile', () => {
    it('should throw FileNotFoundStorageException when file does not exist', async () => {
      mockStorageRepository.findById.mockResolvedValue(null);

      await expect(service.deleteFile('nonexistent')).rejects.toThrow(
        FileNotFoundStorageException,
      );
    });

    it('should call repository.softDelete with the file ID', async () => {
      mockStorageRepository.softDelete.mockResolvedValue(undefined);

      await service.deleteFile('file-1');

      expect(mockStorageRepository.softDelete).toHaveBeenCalledWith('file-1');
    });

    it('should NOT delete the file from S3 (physical deletion is deferred)', async () => {
      mockStorageRepository.softDelete.mockResolvedValue(undefined);

      await service.deleteFile('file-1');

      expect(mockStorageS3Service.deleteFile).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // hardDeleteFile
  // ---------------------------------------------------------------------------
  describe('hardDeleteFile', () => {
    it('should throw FileNotFoundStorageException when file does not exist', async () => {
      mockStorageRepository.findById.mockResolvedValue(null);

      await expect(service.hardDeleteFile('nonexistent')).rejects.toThrow(
        FileNotFoundStorageException,
      );
    });

    it('should delete the file from S3 using the stored s3Key', async () => {
      mockStorageS3Service.deleteFile.mockResolvedValue(undefined);
      mockStorageRepository.hardDelete.mockResolvedValue(undefined);

      await service.hardDeleteFile('file-1');

      expect(mockStorageS3Service.deleteFile).toHaveBeenCalledWith(
        mockSavedFile.s3Key,
      );
    });

    it('should delete the file record from the database', async () => {
      mockStorageS3Service.deleteFile.mockResolvedValue(undefined);
      mockStorageRepository.hardDelete.mockResolvedValue(undefined);

      await service.hardDeleteFile('file-1');

      expect(mockStorageRepository.hardDelete).toHaveBeenCalledWith('file-1');
    });

    it('should throw FileUploadFailedException when S3 deletion fails', async () => {
      const loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
      mockStorageS3Service.deleteFile.mockRejectedValue(new Error('S3 error'));

      await expect(service.hardDeleteFile('file-1')).rejects.toThrow(
        FileUploadFailedException,
      );

      loggerErrorSpy.mockRestore();
    });
  });
});
