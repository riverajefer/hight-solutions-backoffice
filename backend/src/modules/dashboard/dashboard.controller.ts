import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { DashboardService } from './dashboard.service';
import { FinancialQueryDto } from './dto/financial-query.dto';

@ApiTags('dashboard')
@ApiBearerAuth('JWT-auth')
@Controller('dashboard')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('financial')
  @RequirePermissions('read_financial_dashboard')
  @ApiOperation({ summary: 'Obtener métricas del dashboard financiero' })
  getFinancial(@Query() query: FinancialQueryDto) {
    return this.service.getFinancialDashboard(query);
  }
}
