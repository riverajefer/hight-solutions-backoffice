import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ExpenseTypesService } from './expense-types.service';
import {
  CreateExpenseTypeDto,
  UpdateExpenseTypeDto,
  CreateExpenseSubcategoryDto,
  UpdateExpenseSubcategoryDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';

@ApiTags('expense-types')
@ApiBearerAuth('JWT-auth')
@Controller('expense-types')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ExpenseTypesController {
  constructor(private readonly service: ExpenseTypesService) {}

  // ─── Expense Types ────────────────────────────────────────────────────────

  @Get()
  @RequirePermissions('read_expense_types')
  @ApiOperation({ summary: 'Listar todos los tipos de gasto con sus subcategorías' })
  @ApiResponse({ status: 200, description: 'Tipos de gasto obtenidos' })
  findAllTypes() {
    return this.service.findAllTypes();
  }

  @Get(':id')
  @RequirePermissions('read_expense_types')
  @ApiOperation({ summary: 'Obtener un tipo de gasto por ID' })
  @ApiParam({ name: 'id', description: 'ID del tipo de gasto' })
  findOneType(@Param('id') id: string) {
    return this.service.findOneType(id);
  }

  @Post()
  @RequirePermissions('create_expense_types')
  @ApiOperation({ summary: 'Crear un tipo de gasto' })
  @ApiResponse({ status: 201, description: 'Tipo de gasto creado' })
  createType(@Body() dto: CreateExpenseTypeDto) {
    return this.service.createType(dto);
  }

  @Patch(':id')
  @RequirePermissions('update_expense_types')
  @ApiOperation({ summary: 'Actualizar un tipo de gasto' })
  @ApiParam({ name: 'id', description: 'ID del tipo de gasto' })
  updateType(@Param('id') id: string, @Body() dto: UpdateExpenseTypeDto) {
    return this.service.updateType(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('delete_expense_types')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Desactivar un tipo de gasto' })
  @ApiParam({ name: 'id', description: 'ID del tipo de gasto' })
  removeType(@Param('id') id: string) {
    return this.service.removeType(id);
  }

  // ─── Expense Subcategories ─────────────────────────────────────────────────

  @Get('subcategories/all')
  @RequirePermissions('read_expense_types')
  @ApiOperation({ summary: 'Listar subcategorías de gasto (opcionalmente filtradas por tipo)' })
  @ApiQuery({ name: 'expenseTypeId', required: false, description: 'Filtrar por tipo de gasto' })
  findAllSubcategories(@Query('expenseTypeId') expenseTypeId?: string) {
    return this.service.findAllSubcategories(expenseTypeId);
  }

  @Get('subcategories/:id')
  @RequirePermissions('read_expense_types')
  @ApiOperation({ summary: 'Obtener una subcategoría por ID' })
  @ApiParam({ name: 'id', description: 'ID de la subcategoría' })
  findOneSubcategory(@Param('id') id: string) {
    return this.service.findOneSubcategory(id);
  }

  @Post('subcategories')
  @RequirePermissions('create_expense_types')
  @ApiOperation({ summary: 'Crear una subcategoría de gasto' })
  @ApiResponse({ status: 201, description: 'Subcategoría creada' })
  createSubcategory(@Body() dto: CreateExpenseSubcategoryDto) {
    return this.service.createSubcategory(dto);
  }

  @Patch('subcategories/:id')
  @RequirePermissions('update_expense_types')
  @ApiOperation({ summary: 'Actualizar una subcategoría de gasto' })
  @ApiParam({ name: 'id', description: 'ID de la subcategoría' })
  updateSubcategory(@Param('id') id: string, @Body() dto: UpdateExpenseSubcategoryDto) {
    return this.service.updateSubcategory(id, dto);
  }

  @Delete('subcategories/:id')
  @RequirePermissions('delete_expense_types')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Desactivar una subcategoría de gasto' })
  @ApiParam({ name: 'id', description: 'ID de la subcategoría' })
  removeSubcategory(@Param('id') id: string) {
    return this.service.removeSubcategory(id);
  }
}
