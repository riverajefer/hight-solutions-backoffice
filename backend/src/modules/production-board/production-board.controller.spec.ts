import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../auth/guards';
import { PermissionsGuard } from '../../common/guards';
import { PERMISSIONS_KEY } from '../../common/decorators/require-permissions.decorator';
import { ProductionBoardController } from './production-board.controller';
import { ProductionBoardService } from './production-board.service';

const mockService = {
  getBoard: jest.fn(),
};

describe('ProductionBoardController', () => {
  let controller: ProductionBoardController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductionBoardController],
      providers: [{ provide: ProductionBoardService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard).useValue({ canActivate: () => true })
      .compile();
    controller = module.get(ProductionBoardController);
  });

  afterEach(() => jest.clearAllMocks());

  describe('getBoard', () => {
    it('should delegate to service.getBoard with the query', async () => {
      const board = { generatedAt: '', cutoffDate: '', staleOpenCount: 0, cards: [] };
      mockService.getBoard.mockResolvedValue(board);

      const result = await controller.getBoard({ days: 15 });

      expect(result).toBe(board);
      expect(mockService.getBoard).toHaveBeenCalledWith({ days: 15 });
    });

    it('should require the read_production_board permission', () => {
      const permissions = Reflect.getMetadata(
        PERMISSIONS_KEY,
        ProductionBoardController.prototype.getBoard,
      );

      expect(permissions).toEqual(['read_production_board']);
    });
  });
});
