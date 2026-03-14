jest.mock('uuid', () => ({ v4: jest.fn(() => 'mock-uuid') }));

import { Test, TestingModule } from '@nestjs/testing';
import { StorageController } from './storage.controller';
import { StorageService } from './storage.service';
import { JwtAuthGuard } from '../auth/guards';
import { PermissionsGuard } from '../../common/guards';

const mockStorageService = {
  uploadFile: jest.fn(),
  getFile: jest.fn(),
  getFileUrl: jest.fn(),
  getFilesByEntity: jest.fn(),
  getFilesByUser: jest.fn(),
  deleteFile: jest.fn(),
};

const mockUser = {
  sub: 'user-1',
  email: 'user@example.com',
  permissions: ['upload_files', 'read_files', 'delete_files'],
};

const mockFileRecord = {
  id: 'file-1',
  originalName: 'contrato.pdf',
  fileName: '1234567890-mock-uuid-contrato.pdf',
  mimeType: 'application/pdf',
  size: 204800,
  s3Key: 'development/order/mock-uuid/1234567890-mock-uuid-contrato.pdf',
  entityType: 'order',
  entityId: 'order-1',
  uploadedBy: 'user-1',
  isDeleted: false,
  createdAt: new Date('2026-01-01'),
};

describe('StorageController', () => {
  let controller: StorageController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StorageController],
      providers: [{ provide: StorageService, useValue: mockStorageService }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get<StorageController>(StorageController);
  });

  afterEach(() => jest.clearAllMocks());

  // ─────────────────────────────────────────
  // uploadFile
  // ─────────────────────────────────────────
  describe('uploadFile', () => {
    const mockFile = {
      originalname: 'contrato.pdf',
      buffer: Buffer.from('pdf content'),
      mimetype: 'application/pdf',
      size: 204800,
    } as Express.Multer.File;

    it('should delegate to storageService.uploadFile with file, options and userId', async () => {
      const dto = { entityType: 'order', entityId: 'order-1' } as any;
      mockStorageService.uploadFile.mockResolvedValue({ ...mockFileRecord, url: 'https://s3.example.com/signed' });

      const result = await controller.uploadFile(mockFile, dto, mockUser as any);

      expect(mockStorageService.uploadFile).toHaveBeenCalledWith(mockFile, {
        entityType: 'order',
        entityId: 'order-1',
        userId: 'user-1',
      });
      expect(result).toMatchObject({ id: 'file-1', url: expect.any(String) });
    });

    it('should throw an error when no file is provided', async () => {
      const dto = {} as any;

      await expect(
        controller.uploadFile(undefined as any, dto, mockUser as any),
      ).rejects.toThrow('No file uploaded');
    });

    it('should upload without entity data when dto has no entityType', async () => {
      mockStorageService.uploadFile.mockResolvedValue({ ...mockFileRecord, url: 'https://s3.example.com/url' });

      await controller.uploadFile(mockFile, {} as any, mockUser as any);

      expect(mockStorageService.uploadFile).toHaveBeenCalledWith(mockFile, {
        entityType: undefined,
        entityId: undefined,
        userId: 'user-1',
      });
    });
  });

  // ─────────────────────────────────────────
  // getFile
  // ─────────────────────────────────────────
  describe('getFile', () => {
    it('should delegate to storageService.getFile with id', async () => {
      mockStorageService.getFile.mockResolvedValue(mockFileRecord);

      const result = await controller.getFile('file-1');

      expect(mockStorageService.getFile).toHaveBeenCalledWith('file-1');
      expect(result).toMatchObject({ id: 'file-1' });
    });
  });

  // ─────────────────────────────────────────
  // getFileUrl
  // ─────────────────────────────────────────
  describe('getFileUrl', () => {
    it('should return signed URL wrapped in object', async () => {
      mockStorageService.getFileUrl.mockResolvedValue('https://s3.example.com/signed');

      const result = await controller.getFileUrl('file-1', undefined);

      expect(mockStorageService.getFileUrl).toHaveBeenCalledWith('file-1', undefined);
      expect(result).toEqual({ url: 'https://s3.example.com/signed' });
    });

    it('should pass custom expiresIn to service', async () => {
      mockStorageService.getFileUrl.mockResolvedValue('https://s3.example.com/short-url');

      await controller.getFileUrl('file-1', 900);

      expect(mockStorageService.getFileUrl).toHaveBeenCalledWith('file-1', 900);
    });
  });

  // ─────────────────────────────────────────
  // deleteFile
  // ─────────────────────────────────────────
  describe('deleteFile', () => {
    it('should delegate to storageService.deleteFile and return success message', async () => {
      mockStorageService.deleteFile.mockResolvedValue(undefined);

      const result = await controller.deleteFile('file-1', mockUser as any);

      expect(mockStorageService.deleteFile).toHaveBeenCalledWith('file-1', 'user-1');
      expect(result).toEqual({ message: 'Archivo eliminado exitosamente' });
    });
  });

  // ─────────────────────────────────────────
  // getFilesByEntity
  // ─────────────────────────────────────────
  describe('getFilesByEntity', () => {
    it('should delegate to storageService.getFilesByEntity with entityType and entityId', async () => {
      mockStorageService.getFilesByEntity.mockResolvedValue([mockFileRecord]);

      const result = await controller.getFilesByEntity('order', 'order-1');

      expect(mockStorageService.getFilesByEntity).toHaveBeenCalledWith('order', 'order-1');
      expect(result).toHaveLength(1);
    });

    it('should return empty array when entity has no files', async () => {
      mockStorageService.getFilesByEntity.mockResolvedValue([]);

      const result = await controller.getFilesByEntity('quote', 'quote-99');

      expect(result).toHaveLength(0);
    });
  });

  // ─────────────────────────────────────────
  // getFilesByUser
  // ─────────────────────────────────────────
  describe('getFilesByUser', () => {
    it('should delegate to storageService.getFilesByUser with userId', async () => {
      mockStorageService.getFilesByUser.mockResolvedValue([mockFileRecord]);

      const result = await controller.getFilesByUser('user-1');

      expect(mockStorageService.getFilesByUser).toHaveBeenCalledWith('user-1');
      expect(result).toHaveLength(1);
    });

    it('should return empty array when user has no files', async () => {
      mockStorageService.getFilesByUser.mockResolvedValue([]);

      const result = await controller.getFilesByUser('user-99');

      expect(result).toHaveLength(0);
    });
  });
});
