import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PayrollPeriodsService } from './payroll-periods.service';
import { PayrollItemsService } from '../items/payroll-items.service';
import { CreatePayrollPeriodDto } from './dto/create-payroll-period.dto';
import { UpdatePayrollPeriodDto } from './dto/update-payroll-period.dto';
import { CreatePayrollItemDto } from '../items/dto/create-payroll-item.dto';
import { UpdatePayrollItemDto } from '../items/dto/update-payroll-item.dto';
import { JwtAuthGuard } from '../../auth/guards';
import { PermissionsGuard } from '../../../common/guards';
import { RequirePermissions } from '../../../common/decorators';

@ApiTags('payroll-periods')
@ApiBearerAuth('JWT-auth')
@Controller('payroll/periods')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PayrollPeriodsController {
  constructor(
    private readonly periodsService: PayrollPeriodsService,
    private readonly itemsService: PayrollItemsService,
  ) {}

  // ── Periodos ──────────────────────────────────────────────────────────────

  @Get()
  @RequirePermissions('read_payroll_periods')
  @ApiOperation({ summary: 'Listar todos los periodos de nómina' })
  findAll() {
    return this.periodsService.findAll();
  }

  @Get(':id')
  @RequirePermissions('read_payroll_periods')
  @ApiOperation({ summary: 'Obtener detalle de un periodo con sus registros' })
  findOne(@Param('id') id: string) {
    return this.periodsService.findOne(id);
  }

  @Get(':id/summary')
  @RequirePermissions('read_payroll_periods')
  @ApiOperation({ summary: 'Obtener resumen de totales del periodo' })
  getSummary(@Param('id') id: string) {
    return this.periodsService.getSummary(id);
  }

  @Post()
  @RequirePermissions('create_payroll_periods')
  @ApiOperation({ summary: 'Crear un nuevo periodo de nómina' })
  create(@Body() dto: CreatePayrollPeriodDto) {
    return this.periodsService.create(dto);
  }

  @Put(':id')
  @RequirePermissions('update_payroll_periods')
  @ApiOperation({ summary: 'Actualizar un periodo de nómina' })
  update(@Param('id') id: string, @Body() dto: UpdatePayrollPeriodDto) {
    return this.periodsService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('delete_payroll_periods')
  @ApiOperation({ summary: 'Eliminar un periodo de nómina' })
  remove(@Param('id') id: string) {
    return this.periodsService.remove(id);
  }

  @Post(':id/generate')
  @RequirePermissions('update_payroll_periods')
  @ApiOperation({ summary: 'Generar registros automáticos para todos los empleados activos' })
  generateItems(@Param('id') id: string) {
    return this.periodsService.generateItems(id);
  }

  // ── Items de nómina (nested bajo periodos) ────────────────────────────────

  @Get(':id/items')
  @RequirePermissions('read_payroll_periods')
  @ApiOperation({ summary: 'Listar registros de nómina del periodo' })
  getItems(@Param('id') periodId: string) {
    return this.itemsService.findByPeriod(periodId);
  }

  @Post(':id/items')
  @RequirePermissions('update_payroll_periods')
  @ApiOperation({ summary: 'Agregar un registro de nómina al periodo' })
  createItem(@Param('id') periodId: string, @Body() dto: CreatePayrollItemDto) {
    return this.itemsService.create(periodId, dto);
  }

  @Put(':id/items/:itemId')
  @RequirePermissions('update_payroll_periods')
  @ApiOperation({ summary: 'Actualizar un registro de nómina' })
  updateItem(
    @Param('id') periodId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdatePayrollItemDto,
  ) {
    return this.itemsService.update(periodId, itemId, dto);
  }

  @Delete(':id/items/:itemId')
  @RequirePermissions('update_payroll_periods')
  @ApiOperation({ summary: 'Eliminar un registro de nómina del periodo' })
  removeItem(@Param('id') periodId: string, @Param('itemId') itemId: string) {
    return this.itemsService.remove(periodId, itemId);
  }
}
