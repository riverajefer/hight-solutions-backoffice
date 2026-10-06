import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards';
import { PermissionsGuard } from '../../common/guards';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { ProductionBoardQueryDto } from './dto';
import { ProductionBoardService } from './production-board.service';

@ApiTags('production-board')
@ApiBearerAuth('JWT-auth')
@Controller('production-board')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProductionBoardController {
  constructor(private readonly service: ProductionBoardService) {}

  @Get()
  @RequirePermissions('read_production_board')
  @ApiOperation({
    summary: 'Órdenes de pedido abiertas para el tablero de control de producción',
  })
  @ApiResponse({ status: 200, description: 'Tarjetas del tablero obtenidas correctamente' })
  getBoard(@Query() query: ProductionBoardQueryDto) {
    return this.service.getBoard(query);
  }
}
