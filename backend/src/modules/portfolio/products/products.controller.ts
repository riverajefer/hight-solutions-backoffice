import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto } from './dto';
import { JwtAuthGuard } from '../../auth/guards';
import { PermissionsGuard } from '../../../common/guards';
import { RequirePermissions } from '../../../common/decorators';

@ApiTags('products')
@ApiBearerAuth('JWT-auth')
@Controller('products')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  /**
   * GET /api/v1/products
   * Lista todos los productos
   * Requiere permiso: read_products
   */
  @Get()
  @RequirePermissions('read_products')
  @ApiOperation({ summary: 'Listar todos los productos' })
  @ApiQuery({
    name: 'includeInactive',
    required: false,
    type: Boolean,
    description: 'Incluir productos inactivos',
  })
  @ApiQuery({
    name: 'categoryId',
    required: false,
    type: String,
    description: 'Filtrar por categoría',
  })
  findAll(
    @Query('includeInactive') includeInactive?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.productsService.findAll(
      includeInactive === 'true',
      categoryId,
    );
  }

  /**
   * GET /api/v1/products/:id
   * Obtiene un producto por ID
   * Requiere permiso: read_products
   */
  @Get(':id')
  @RequirePermissions('read_products')
  @ApiOperation({ summary: 'Obtener producto por ID' })
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  /**
   * POST /api/v1/products
   * Crea un nuevo producto
   * Requiere permiso: create_products
   */
  @Post()
  @RequirePermissions('create_products')
  @ApiOperation({ summary: 'Crear nuevo producto' })
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  /**
   * PUT /api/v1/products/:id
   * Actualiza un producto
   * Requiere permiso: update_products
   */
  @Put(':id')
  @RequirePermissions('update_products')
  @ApiOperation({ summary: 'Actualizar producto' })
  update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productsService.update(id, updateProductDto);
  }

  /**
   * DELETE /api/v1/products/:id
   * Soft delete de un producto
   * Requiere permiso: delete_products
   */
  @Delete(':id')
  @RequirePermissions('delete_products')
  @ApiOperation({ summary: 'Eliminar producto (soft delete)' })
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
