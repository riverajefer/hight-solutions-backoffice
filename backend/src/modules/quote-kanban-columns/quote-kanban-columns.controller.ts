import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { QuoteKanbanColumnsService } from './quote-kanban-columns.service';
import {
  CreateQuoteKanbanColumnDto,
  ReorderQuoteKanbanColumnsDto,
  UpdateQuoteKanbanColumnDto,
} from './dto';

@ApiTags('Quote Kanban Columns')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('quote-kanban-columns')
export class QuoteKanbanColumnsController {
  constructor(private readonly service: QuoteKanbanColumnsService) {}

  @Get()
  @RequirePermissions('read_quotes')
  @ApiOperation({ summary: 'Listar columnas activas del tablero Kanban' })
  findAll() {
    return this.service.findAll();
  }

  @Get('all')
  @RequirePermissions('manage_quote_columns')
  @ApiOperation({ summary: 'Listar todas las columnas (incluyendo inactivas) para administración' })
  findAllIncludingInactive() {
    return this.service.findAllIncludingInactive();
  }

  @Get(':id')
  @RequirePermissions('manage_quote_columns')
  @ApiOperation({ summary: 'Obtener una columna por ID' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @RequirePermissions('manage_quote_columns')
  @ApiOperation({ summary: 'Crear una nueva columna del tablero Kanban' })
  create(@Body() dto: CreateQuoteKanbanColumnDto) {
    return this.service.create(dto);
  }

  @Patch('reorder')
  @RequirePermissions('manage_quote_columns')
  @ApiOperation({ summary: 'Reordenar columnas del tablero Kanban' })
  reorder(@Body() dto: ReorderQuoteKanbanColumnsDto) {
    return this.service.reorder(dto);
  }

  @Patch(':id')
  @RequirePermissions('manage_quote_columns')
  @ApiOperation({ summary: 'Actualizar una columna del tablero Kanban' })
  update(@Param('id') id: string, @Body() dto: UpdateQuoteKanbanColumnDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('manage_quote_columns')
  @ApiOperation({ summary: 'Eliminar una columna del tablero Kanban' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
