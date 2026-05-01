import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiConsumes,
} from '@nestjs/swagger';
import { DtfService } from './dtf.service';
import { BulkCreateDtfDto } from './dto/create-dtf-record.dto';
import { UpdateDtfRecordDto } from './dto/update-dtf-record.dto';
import { ChangeDtfStatusDto } from './dto/change-dtf-status.dto';
import { DtfStatus } from '../../generated/prisma';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('dtf')
@Controller('dtf')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DtfController {
  constructor(private readonly dtfService: DtfService) {}

  @Get()
  @RequirePermissions('read_dtf')
  @ApiOperation({ summary: 'Listar registros DTF' })
  @ApiResponse({ status: 200, description: 'Lista de registros DTF' })
  findAll(
    @Query('status') status?: DtfStatus,
    @Query('productId') productId?: string,
    @Query('clientId') clientId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.dtfService.findAll({
      status,
      productId,
      clientId,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get(':id/status-history')
  @RequirePermissions('read_dtf')
  @ApiOperation({ summary: 'Obtener historial de estados del registro DTF' })
  @ApiParam({ name: 'id', description: 'DTF Record ID' })
  getStatusHistory(@Param('id') id: string) {
    return this.dtfService.getStatusHistory(id);
  }

  @Get(':id')
  @RequirePermissions('read_dtf')
  @ApiOperation({ summary: 'Obtener registro DTF por ID' })
  @ApiParam({ name: 'id', description: 'DTF Record ID' })
  @ApiResponse({ status: 200, description: 'Registro DTF encontrado' })
  @ApiResponse({ status: 404, description: 'Registro no encontrado' })
  findOne(@Param('id') id: string) {
    return this.dtfService.findOne(id);
  }

  @Post('bulk')
  @RequirePermissions('create_dtf')
  @ApiOperation({ summary: 'Crear múltiples registros DTF en lote' })
  @ApiResponse({ status: 201, description: 'Registros creados exitosamente' })
  bulkCreate(
    @Body() dto: BulkCreateDtfDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.dtfService.bulkCreate(dto, userId);
  }

  @Put(':id')
  @RequirePermissions('update_dtf')
  @ApiOperation({ summary: 'Editar registro DTF' })
  @ApiParam({ name: 'id', description: 'DTF Record ID' })
  @ApiResponse({ status: 200, description: 'Registro actualizado' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDtfRecordDto,
  ) {
    return this.dtfService.update(id, dto);
  }

  @Put(':id/status')
  @RequirePermissions('change_dtf_status')
  @ApiOperation({ summary: 'Cambiar estado del registro DTF' })
  @ApiParam({ name: 'id', description: 'DTF Record ID' })
  @ApiResponse({ status: 200, description: 'Estado actualizado' })
  changeStatus(
    @Param('id') id: string,
    @Body() dto: ChangeDtfStatusDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.dtfService.changeStatus(id, dto, userId);
  }

  @Post(':id/convert-to-order')
  @RequirePermissions('convert_dtf_to_order')
  @ApiOperation({ summary: 'Convertir registro DTF en Orden de Pedido' })
  @ApiParam({ name: 'id', description: 'DTF Record ID' })
  @ApiResponse({ status: 201, description: 'Orden de Pedido creada' })
  convertToOrder(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.dtfService.convertToOrder(id, userId);
  }

  @Patch(':id/image')
  @RequirePermissions('update_dtf')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Subir imagen de referencia DTF' })
  @ApiParam({ name: 'id', description: 'DTF Record ID' })
  uploadImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') userId: string,
  ) {
    return this.dtfService.uploadImage(id, file, userId);
  }

  @Patch(':id/comprobante')
  @RequirePermissions('update_dtf')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Subir comprobante de pago DTF' })
  @ApiParam({ name: 'id', description: 'DTF Record ID' })
  uploadComprobante(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') userId: string,
  ) {
    return this.dtfService.uploadComprobante(id, file, userId);
  }

  @Get(':id/files')
  @RequirePermissions('read_dtf')
  @ApiOperation({ summary: 'Obtener archivos del registro DTF' })
  @ApiParam({ name: 'id', description: 'DTF Record ID' })
  getFiles(@Param('id') id: string) {
    return this.dtfService.getFiles(id);
  }
}
