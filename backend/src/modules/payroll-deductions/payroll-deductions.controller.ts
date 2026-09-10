import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PayrollDeductionsService } from './payroll-deductions.service';
import {
  ApplyPayrollDeductionDto,
  CancelPayrollDeductionDto,
  FilterPayrollDeductionsDto,
  RejectPayrollDeductionDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('payroll-deductions')
@ApiBearerAuth('JWT-auth')
@Controller('payroll-deductions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PayrollDeductionsController {
  constructor(private readonly service: PayrollDeductionsService) {}

  @Get()
  @RequirePermissions('read_payroll_deductions')
  @ApiOperation({
    summary: 'Listar descuentos de órdenes por nómina',
    description:
      'Bandeja de descuentos. Sin filtros devuelve todos; `onlyPending` deja ' +
      'solo los que faltan por aprobar o por aplicar.',
  })
  @ApiResponse({ status: 200, description: 'Listado paginado de descuentos' })
  async findAll(@Query() filters: FilterPayrollDeductionsDto) {
    return this.service.findAll(filters);
  }

  @Get('employee/:employeeId/approved')
  @RequirePermissions('read_payroll_deductions')
  @ApiOperation({
    summary: 'Descuentos aprobados pendientes de aplicar de un empleado',
    description:
      'Es lo que nómina consulta al liquidar el periodo para saber cuánto hay ' +
      'que restarle al empleado.',
  })
  @ApiParam({ name: 'employeeId', description: 'ID del empleado' })
  async findApprovedForEmployee(@Param('employeeId') employeeId: string) {
    return this.service.findApprovedForEmployee(employeeId);
  }

  @Get(':id')
  @RequirePermissions('read_payroll_deductions')
  @ApiOperation({ summary: 'Obtener un descuento por id' })
  @ApiParam({ name: 'id', description: 'ID del descuento' })
  @ApiResponse({ status: 404, description: 'Descuento no encontrado' })
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Put(':id/approve')
  @RequirePermissions('approve_payroll_deductions')
  @ApiOperation({
    summary: 'Aprobar que la orden se descuente de la nómina del empleado',
  })
  @ApiParam({ name: 'id', description: 'ID del descuento' })
  @ApiResponse({ status: 400, description: 'El descuento ya fue resuelto' })
  async approve(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.approve(id, userId);
  }

  @Put(':id/reject')
  @RequirePermissions('approve_payroll_deductions')
  @ApiOperation({
    summary: 'Rechazar el descuento',
    description:
      'La orden queda con su saldo pendiente: hay que cobrarla por otro medio.',
  })
  @ApiParam({ name: 'id', description: 'ID del descuento' })
  async reject(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: RejectPayrollDeductionDto,
  ) {
    return this.service.reject(id, userId, dto);
  }

  @Post(':id/apply')
  @RequirePermissions('apply_payroll_deductions')
  @ApiOperation({
    summary: 'Aplicar el descuento sobre un periodo de nómina',
    description:
      'Resta el valor en el registro del empleado y genera el abono que salda ' +
      'la orden. No genera movimiento de caja: el dinero nunca entra, se deja ' +
      'de pagar. Es idempotente.',
  })
  @ApiParam({ name: 'id', description: 'ID del descuento' })
  @ApiResponse({
    status: 400,
    description:
      'El periodo está pagado, el empleado no tiene registro en él, o el ' +
      'descuento no está aprobado',
  })
  @ApiResponse({ status: 409, description: 'El descuento ya se aplicó' })
  async apply(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: ApplyPayrollDeductionDto,
  ) {
    return this.service.apply(id, userId, dto);
  }

  @Put(':id/cancel')
  @RequirePermissions('approve_payroll_deductions')
  @ApiOperation({
    summary: 'Cancelar el descuento',
    description:
      'Antes de aplicarse solo cambia el estado. Si ya se aplicó, devuelve el ' +
      'valor a la nómina, anula el abono y la orden vuelve a quedar debiendo.',
  })
  @ApiParam({ name: 'id', description: 'ID del descuento' })
  async cancel(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CancelPayrollDeductionDto,
  ) {
    return this.service.cancel(id, userId, dto);
  }
}
