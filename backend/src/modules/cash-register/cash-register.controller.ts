import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CashRegisterService } from './cash-register.service';
import { CreateCashRegisterDto, UpdateCashRegisterDto } from './dto';

@ApiTags('cash-registers')
@ApiBearerAuth()
@Controller('cash-registers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CashRegisterController {
  constructor(private readonly service: CashRegisterService) {}

  @Get()
  @RequirePermissions('read_cash_registers')
  @ApiOperation({ summary: 'Listar todas las cajas registradoras' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @RequirePermissions('read_cash_registers')
  @ApiOperation({ summary: 'Obtener una caja registradora por ID' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @RequirePermissions('create_cash_registers')
  @ApiOperation({ summary: 'Crear una nueva caja registradora' })
  @ApiResponse({ status: 201, description: 'Caja creada correctamente' })
  create(
    @Body() dto: CreateCashRegisterDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.create(dto, userId);
  }

  @Put(':id')
  @RequirePermissions('update_cash_registers')
  @ApiOperation({ summary: 'Actualizar una caja registradora' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCashRegisterDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.update(id, dto, userId);
  }

  @Delete(':id')
  @RequirePermissions('delete_cash_registers')
  @ApiOperation({ summary: 'Eliminar una caja registradora' })
  remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.remove(id, userId);
  }
}
