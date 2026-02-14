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
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { QuotesService } from './quotes.service';
import {
  CreateQuoteDto,
  UpdateQuoteDto,
  FilterQuotesDto,
} from './dto';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody, ApiParam } from '@nestjs/swagger';
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

  @Post(':quoteId/items/:itemId/sample-image')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Subir imagen de muestra para un item de cotización' })
  @ApiParam({ name: 'quoteId', description: 'ID de la cotización' })
  @ApiParam({ name: 'itemId', description: 'ID del item' })
  @ApiBody({
    description: 'Imagen de muestra',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async uploadSampleImage(
    @Param('quoteId') quoteId: string,
    @Param('itemId') itemId: string,
    @UploadedFile() file: Express.Multer.File,
    @NestRequest() req: AuthenticatedRequest,
  ) {
    return this.quotesService.uploadItemSampleImage(quoteId, itemId, file, req.user.id);
  }

  @Delete(':quoteId/items/:itemId/sample-image')
  @ApiOperation({ summary: 'Eliminar imagen de muestra de un item de cotización' })
  @ApiParam({ name: 'quoteId', description: 'ID de la cotización' })
  @ApiParam({ name: 'itemId', description: 'ID del item' })
  async deleteSampleImage(
    @Param('quoteId') quoteId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.quotesService.deleteItemSampleImage(quoteId, itemId);
  }
}
