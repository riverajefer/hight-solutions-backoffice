import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
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
import { AccountsPayableService } from './accounts-payable.service';
import {
  CancelAccountPayableDto,
  CreateAccountPayableDto,
  CreateAttachmentDto,
  FilterAccountPayableDto,
  RegisterPaymentDto,
  SetInstallmentsDto,
  UpdateAccountPayableDto,
  UpdateInstallmentDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/auth.interface';

@ApiTags('accounts-payable')
@ApiBearerAuth('JWT-auth')
@Controller('accounts-payable')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AccountsPayableController {
  constructor(private readonly service: AccountsPayableService) {}

  @Get()
  @RequirePermissions('read_accounts_payable')
  @ApiOperation({ summary: 'Listar cuentas por pagar con filtros y paginación' })
  @ApiResponse({ status: 200, description: 'Cuentas por pagar obtenidas correctamente' })
  findAll(@Query() filters: FilterAccountPayableDto) {
    return this.service.findAll(filters);
  }

  @Get('summary')
  @RequirePermissions('read_accounts_payable')
  @ApiOperation({ summary: 'Obtener métricas y totales de cuentas por pagar' })
  @ApiResponse({ status: 200, description: 'Resumen obtenido correctamente' })
  getSummary() {
    return this.service.getSummary();
  }

  @Get(':id')
  @RequirePermissions('read_accounts_payable')
  @ApiOperation({ summary: 'Obtener detalle de una cuenta por pagar' })
  @ApiParam({ name: 'id', description: 'ID de la cuenta por pagar' })
  @ApiResponse({ status: 200, description: 'Cuenta obtenida correctamente' })
  @ApiResponse({ status: 404, description: 'Cuenta no encontrada' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @RequirePermissions('create_accounts_payable')
  @ApiOperation({ summary: 'Crear una nueva cuenta por pagar' })
  @ApiResponse({ status: 201, description: 'Cuenta creada correctamente' })
  create(
    @Body() dto: CreateAccountPayableDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create(dto, user.id);
  }

  @Put(':id')
  @RequirePermissions('update_accounts_payable')
  @ApiOperation({ summary: 'Actualizar una cuenta por pagar' })
  @ApiParam({ name: 'id', description: 'ID de la cuenta por pagar' })
  @ApiResponse({ status: 200, description: 'Cuenta actualizada correctamente' })
  @ApiResponse({ status: 400, description: 'Operación no permitida en el estado actual' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAccountPayableDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('delete_accounts_payable')
  @ApiOperation({ summary: 'Anular una cuenta por pagar' })
  @ApiParam({ name: 'id', description: 'ID de la cuenta por pagar' })
  @ApiResponse({ status: 200, description: 'Cuenta anulada correctamente' })
  @ApiResponse({ status: 400, description: 'No se puede anular la cuenta en su estado actual' })
  cancel(
    @Param('id') id: string,
    @Body() dto: CancelAccountPayableDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.cancel(id, dto, user.id);
  }

  @Post(':id/payments')
  @RequirePermissions('register_ap_payment')
  @ApiOperation({ summary: 'Registrar un pago/abono a una cuenta por pagar' })
  @ApiParam({ name: 'id', description: 'ID de la cuenta por pagar' })
  @ApiResponse({ status: 201, description: 'Pago registrado correctamente' })
  @ApiResponse({ status: 400, description: 'Monto supera el saldo pendiente' })
  registerPayment(
    @Param('id') id: string,
    @Body() dto: RegisterPaymentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.registerPayment(id, dto, user.id);
  }

  @Get(':id/payments')
  @RequirePermissions('read_accounts_payable')
  @ApiOperation({ summary: 'Obtener historial de pagos de una cuenta por pagar' })
  @ApiParam({ name: 'id', description: 'ID de la cuenta por pagar' })
  @ApiResponse({ status: 200, description: 'Historial de pagos obtenido correctamente' })
  getPaymentHistory(@Param('id') id: string) {
    return this.service.getPaymentHistory(id);
  }

  @Delete(':id/payments/:paymentId')
  @RequirePermissions('delete_accounts_payable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Anular un pago registrado (solo admin)' })
  @ApiParam({ name: 'id', description: 'ID de la cuenta por pagar' })
  @ApiParam({ name: 'paymentId', description: 'ID del pago a anular' })
  @ApiResponse({ status: 200, description: 'Pago anulado correctamente' })
  deletePayment(
    @Param('id') id: string,
    @Param('paymentId') paymentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.deletePayment(id, paymentId, user.id);
  }

  // ─── Attachments ─────────────────────────────────────────────────────────────

  @Post(':id/attachments')
  @RequirePermissions('update_accounts_payable')
  @ApiOperation({ summary: 'Adjuntar un archivo a una cuenta por pagar' })
  @ApiParam({ name: 'id', description: 'ID de la cuenta por pagar' })
  @ApiResponse({ status: 201, description: 'Adjunto registrado correctamente' })
  addAttachment(
    @Param('id') id: string,
    @Body() dto: CreateAttachmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.addAttachment(id, dto, user.id);
  }

  @Delete(':id/attachments/:attachmentId')
  @RequirePermissions('update_accounts_payable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar un adjunto de una cuenta por pagar' })
  @ApiParam({ name: 'id', description: 'ID de la cuenta por pagar' })
  @ApiParam({ name: 'attachmentId', description: 'ID del adjunto' })
  @ApiResponse({ status: 200, description: 'Adjunto eliminado correctamente' })
  removeAttachment(
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
  ) {
    return this.service.removeAttachment(id, attachmentId);
  }

  // ─── Installments ─────────────────────────────────────────────────────────────

  @Post(':id/installments')
  @RequirePermissions('update_accounts_payable')
  @ApiOperation({ summary: 'Definir o reemplazar el plan de cuotas de una cuenta por pagar' })
  @ApiParam({ name: 'id', description: 'ID de la cuenta por pagar' })
  @ApiResponse({ status: 201, description: 'Plan de cuotas guardado correctamente' })
  setInstallments(
    @Param('id') id: string,
    @Body() dto: SetInstallmentsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.setInstallments(id, dto, user.id);
  }

  @Get(':id/installments')
  @RequirePermissions('read_accounts_payable')
  @ApiOperation({ summary: 'Obtener plan de cuotas de una cuenta por pagar' })
  @ApiParam({ name: 'id', description: 'ID de la cuenta por pagar' })
  getInstallments(@Param('id') id: string) {
    return this.service.getInstallments(id);
  }

  @Patch(':id/installments/:installmentId')
  @RequirePermissions('update_accounts_payable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Marcar cuota como pagada o pendiente' })
  @ApiParam({ name: 'id', description: 'ID de la cuenta por pagar' })
  @ApiParam({ name: 'installmentId', description: 'ID de la cuota' })
  toggleInstallmentPaid(
    @Param('id') id: string,
    @Param('installmentId') installmentId: string,
    @Body() dto: UpdateInstallmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.toggleInstallmentPaid(id, installmentId, dto, user.id);
  }

  @Delete(':id/installments/:installmentId')
  @RequirePermissions('update_accounts_payable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar una cuota del plan de pagos' })
  @ApiParam({ name: 'id', description: 'ID de la cuenta por pagar' })
  @ApiParam({ name: 'installmentId', description: 'ID de la cuota' })
  deleteInstallment(
    @Param('id') id: string,
    @Param('installmentId') installmentId: string,
  ) {
    return this.service.deleteInstallment(id, installmentId);
  }
}
