import { Test, TestingModule } from '@nestjs/testing';
import { StorageRepository } from './storage.repository';
import { PrismaService } from '../../database/prisma.service';
import {
  createMockPrismaService,
  MockPrismaService,
} from '../../database/prisma.service.mock';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const mockFile = {
  id: 'file-1',
  s3Key: 'uploads/file-1.png',
  originalName: 'logo.png',
  mimeType: 'image/png',
  size: 12345,
  entityType: 'company',
  entityId: 'company-1',
  uploadedBy: 'user-1',
  isDeleted: false,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------
describe('StorageRepository', () => {
  let repository: StorageRepository;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get<StorageRepository>(StorageRepository);
  });

  afterEach(() => jest.clearAllMocks());

  // -------------------------------------------------------------------------
  // create
  // -------------------------------------------------------------------------
  describe('create', () => {
    it('should call uploadedFile.create with the provided data', async () => {
      prisma.uploadedFile.create.mockResolvedValue(mockFile);

      const result = await repository.create({ s3Key: 'uploads/file-1.png' } as any);

      expect(prisma.uploadedFile.create).toHaveBeenCalledWith({
        data: { s3Key: 'uploads/file-1.png' },
      });
      expect(result).toEqual(mockFile);
    });
  });

  // -------------------------------------------------------------------------
  // findById
  // -------------------------------------------------------------------------
  describe('findById', () => {
    it('should call uploadedFile.findUnique with the given id', async () => {
      prisma.uploadedFile.findUnique.mockResolvedValue(mockFile);

      const result = await repository.findById('file-1');

      expect(prisma.uploadedFile.findUnique).toHaveBeenCalledWith({ where: { id: 'file-1' } });
      expect(result).toEqual(mockFile);
    });

    it('should return null when file does not exist', async () => {
      prisma.uploadedFile.findUnique.mockResolvedValue(null);

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // findByS3Key
  // -------------------------------------------------------------------------
  describe('findByS3Key', () => {
    it('should call uploadedFile.findUnique with the given s3Key', async () => {
      prisma.uploadedFile.findUnique.mockResolvedValue(mockFile);

      await repository.findByS3Key('uploads/file-1.png');

      expect(prisma.uploadedFile.findUnique).toHaveBeenCalledWith({
        where: { s3Key: 'uploads/file-1.png' },
      });
    });
  });

  // -------------------------------------------------------------------------
  // findByEntity
  // -------------------------------------------------------------------------
  describe('findByEntity', () => {
    it('should filter by entityType, entityId and isDeleted=false', async () => {
      prisma.uploadedFile.findMany.mockResolvedValue([mockFile]);

      const result = await repository.findByEntity('company', 'company-1');

      expect(prisma.uploadedFile.findMany).toHaveBeenCalledWith({
        where: { entityType: 'company', entityId: 'company-1', isDeleted: false },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual([mockFile]);
    });
  });

  // -------------------------------------------------------------------------
  // findByUser
  // -------------------------------------------------------------------------
  describe('findByUser', () => {
    it('should filter by uploadedBy and isDeleted=false', async () => {
      prisma.uploadedFile.findMany.mockResolvedValue([mockFile]);

      await repository.findByUser('user-1');

      expect(prisma.uploadedFile.findMany).toHaveBeenCalledWith({
        where: { uploadedBy: 'user-1', isDeleted: false },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  // -------------------------------------------------------------------------
  // softDelete
  // -------------------------------------------------------------------------
  describe('softDelete', () => {
    it('should set isDeleted=true for the given id', async () => {
      prisma.uploadedFile.update.mockResolvedValue({ ...mockFile, isDeleted: true });

      await repository.softDelete('file-1');

      expect(prisma.uploadedFile.update).toHaveBeenCalledWith({
        where: { id: 'file-1' },
        data: { isDeleted: true },
      });
    });
  });

  // -------------------------------------------------------------------------
  // hardDelete
  // -------------------------------------------------------------------------
  describe('hardDelete', () => {
    it('should call uploadedFile.delete with the given id', async () => {
      prisma.uploadedFile.delete.mockResolvedValue(mockFile);

      await repository.hardDelete('file-1');

      expect(prisma.uploadedFile.delete).toHaveBeenCalledWith({ where: { id: 'file-1' } });
    });
  });

  // -------------------------------------------------------------------------
  // findDeletedFiles
  // -------------------------------------------------------------------------
  describe('findDeletedFiles', () => {
    it('should filter by isDeleted=true and updatedAt < olderThan', async () => {
      const olderThan = new Date('2026-01-01');
      prisma.uploadedFile.findMany.mockResolvedValue([]);

      await repository.findDeletedFiles(olderThan);

      expect(prisma.uploadedFile.findMany).toHaveBeenCalledWith({
        where: {
          isDeleted: true,
          updatedAt: { lt: olderThan },
        },
      });
    });
  });

  // -------------------------------------------------------------------------
  // findAll
  // -------------------------------------------------------------------------
  describe('findAll', () => {
    it('should return all files ordered by createdAt desc', async () => {
      prisma.uploadedFile.findMany.mockResolvedValue([mockFile]);

      const result = await repository.findAll();

      expect(prisma.uploadedFile.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual([mockFile]);
    });
  });
});
