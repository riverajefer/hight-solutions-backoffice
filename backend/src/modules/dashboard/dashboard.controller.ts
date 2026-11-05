import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { DashboardService } from './dashboard.service';
import { FinancialQueryDto } from './dto/financial-query.dto';
import { CommercialQueryDto } from './dto/commercial-query.dto';
import { CommercialDashboardService } from './commercial-dashboard.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('dashboard')
@ApiBearerAuth('JWT-auth')
@Controller('dashboard')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DashboardController {
  constructor(
    private readonly service: DashboardService,
    private readonly commercialService: CommercialDashboardService,
  ) {}

  @Get('financial')
  @RequirePermissions('read_financial_dashboard')
  @ApiOperation({ summary: 'Obtener métricas del dashboard financiero' })
  getFinancial(@Query() query: FinancialQueryDto) {
    return this.service.getFinancialDashboard(query);
  }

  @Get('commercial')
  @RequirePermissions('read_commercial_dashboard')
  @ApiOperation({
    summary:
      'Tablero comercial: cotizaciones, conversión, ventas por estado, cartera por edades, meta y ranking',
  })
  @ApiResponse({ status: 200, description: 'Métricas del tablero comercial' })
  @ApiResponse({ status: 403, description: 'Sin permiso para ver a otra asesora' })
  getCommercial(
    @Query() query: CommercialQueryDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.commercialService.getCommercialDashboard(query, userId);
  }
}
