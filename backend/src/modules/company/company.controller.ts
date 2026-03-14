import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CompanyService } from './company.service';
import { UpdateCompanyDto } from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { PermissionsGuard } from '../../common/guards';
import { RequirePermissions } from '../../common/decorators';

@ApiTags('company')
@ApiBearerAuth('JWT-auth')
@Controller('company')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  /**
   * GET /api/v1/company
   * Obtiene la información de la compañía
   * Requiere permiso: read_company
   */
  @Get()
  @RequirePermissions('read_company')
  @ApiOperation({ summary: 'Obtener información de la compañía' })
  @ApiResponse({ status: 200, description: 'Información de la compañía' })
  getCompany() {
    return this.companyService.getCompany();
  }

  /**
   * PUT /api/v1/company
   * Crea o actualiza la información de la compañía (upsert)
   * Requiere permiso: update_company
   */
  @Put()
  @RequirePermissions('update_company')
  @ApiOperation({ summary: 'Crear o actualizar información de la compañía' })
  @ApiResponse({ status: 200, description: 'Información de la compañía actualizada' })
  upsertCompany(@Body() dto: UpdateCompanyDto) {
    return this.companyService.upsertCompany(dto);
  }
}
