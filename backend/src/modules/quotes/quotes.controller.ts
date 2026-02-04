import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request as NestRequest,
} from '@nestjs/common';
import { Request } from 'express';
import { QuotesService } from './quotes.service';
import {
  CreateQuoteDto,
  UpdateQuoteDto,
  FilterQuotesDto,
} from './dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
  };
}

@ApiTags('Cotizaciones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('quotes')
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Post()
  @ApiOperation({ summary: 'Crear una nueva cotización' })
  create(@Body() createQuoteDto: CreateQuoteDto, @NestRequest() req: AuthenticatedRequest) {
    return this.quotesService.create(createQuoteDto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Listar cotizaciones con filtros' })
  findAll(@Query() filters: FilterQuotesDto) {
    return this.quotesService.findAll(filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de una cotización' })
  findOne(@Param('id') id: string) {
    return this.quotesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar una cotización' })
  update(
    @Param('id') id: string,
    @Body() updateQuoteDto: UpdateQuoteDto,
    @NestRequest() req: AuthenticatedRequest,
  ) {
    return this.quotesService.update(id, updateQuoteDto, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una cotización' })
  remove(@Param('id') id: string) {
    return this.quotesService.remove(id);
  }

  @Post(':id/convert')
  @ApiOperation({ summary: 'Convertir cotización en orden de pedido' })
  convertToOrder(@Param('id') id: string, @NestRequest() req: AuthenticatedRequest) {
    return this.quotesService.convertToOrder(id, req.user.id);
  }
}
