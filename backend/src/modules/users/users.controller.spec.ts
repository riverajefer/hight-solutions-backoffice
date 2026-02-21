import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards';
import { PermissionsGuard } from '../../common/guards';

const mockUsersService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('UsersController', () => {
  let controller: UsersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UsersController>(UsersController);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findAll', () => {
    it('should delegate to usersService.findAll', async () => {
      mockUsersService.findAll.mockResolvedValue([]);
      const result = await controller.findAll();
      expect(mockUsersService.findAll).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should delegate to usersService.findOne with the given id', async () => {
      const user = { id: 'user-1', email: 'a@b.com' };
      mockUsersService.findOne.mockResolvedValue(user);
      const result = await controller.findOne('user-1');
      expect(mockUsersService.findOne).toHaveBeenCalledWith('user-1');
      expect(result).toEqual(user);
    });
  });

  describe('create', () => {
    it('should delegate to usersService.create with the dto', async () => {
      const dto = { email: 'new@test.com', password: 'pass' } as any;
      const created = { id: 'user-2', ...dto };
      mockUsersService.create.mockResolvedValue(created);
      const result = await controller.create(dto);
      expect(mockUsersService.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(created);
    });
  });

  describe('update', () => {
    it('should delegate to usersService.update with id and dto', async () => {
      const dto = { firstName: 'Jane' } as any;
      const updated = { id: 'user-1', firstName: 'Jane' };
      mockUsersService.update.mockResolvedValue(updated);
      const result = await controller.update('user-1', dto);
      expect(mockUsersService.update).toHaveBeenCalledWith('user-1', dto);
      expect(result).toEqual(updated);
    });
  });

  describe('remove', () => {
    it('should delegate to usersService.remove with the given id', async () => {
      mockUsersService.remove.mockResolvedValue({ id: 'user-1' });
      await controller.remove('user-1');
      expect(mockUsersService.remove).toHaveBeenCalledWith('user-1');
    });
  });
});
