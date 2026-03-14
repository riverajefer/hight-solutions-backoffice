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
import { ProductCategoriesService } from './product-categories.service';
import {
  CreateProductCategoryDto,
  UpdateProductCategoryDto,
} from './dto';
import { JwtAuthGuard } from '../../auth/guards';
import { PermissionsGuard } from '../../../common/guards';
import { RequirePermissions } from '../../../common/decorators';

@ApiTags('product-categories')
@ApiBearerAuth('JWT-auth')
@Controller('product-categories')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProductCategoriesController {
  constructor(
    private readonly productCategoriesService: ProductCategoriesService,
  ) {}

  /**
   * GET /api/v1/product-categories
   * Lista todas las categorías de productos
   * Requiere permiso: read_product_categories
   */
  @Get()
  @RequirePermissions('read_product_categories')
  @ApiOperation({ summary: 'Listar todas las categorías de productos' })
  @ApiQuery({
    name: 'includeInactive',
    required: false,
    type: Boolean,
    description: 'Incluir categorías inactivas',
  })
  findAll(@Query('includeInactive') includeInactive?: string) {
    return this.productCategoriesService.findAll(includeInactive === 'true');
  }

  /**
   * GET /api/v1/product-categories/:id
   * Obtiene una categoría de producto por ID
   * Requiere permiso: read_product_categories
   */
  @Get(':id')
  @RequirePermissions('read_product_categories')
  @ApiOperation({ summary: 'Obtener categoría de producto por ID' })
  findOne(@Param('id') id: string) {
    return this.productCategoriesService.findOne(id);
  }

  /**
   * POST /api/v1/product-categories
   * Crea una nueva categoría de producto
   * Requiere permiso: create_product_categories
   */
  @Post()
  @RequirePermissions('create_product_categories')
  @ApiOperation({ summary: 'Crear nueva categoría de producto' })
  create(@Body() createProductCategoryDto: CreateProductCategoryDto) {
    return this.productCategoriesService.create(createProductCategoryDto);
  }

  /**
   * PUT /api/v1/product-categories/:id
   * Actualiza una categoría de producto
   * Requiere permiso: update_product_categories
   */
  @Put(':id')
  @RequirePermissions('update_product_categories')
  @ApiOperation({ summary: 'Actualizar categoría de producto' })
  update(
    @Param('id') id: string,
    @Body() updateProductCategoryDto: UpdateProductCategoryDto,
  ) {
    return this.productCategoriesService.update(
      id,
      updateProductCategoryDto,
    );
  }

  /**
   * DELETE /api/v1/product-categories/:id
   * Soft delete de una categoría de producto
   * Requiere permiso: delete_product_categories
   */
  @Delete(':id')
  @RequirePermissions('delete_product_categories')
  @ApiOperation({
    summary: 'Eliminar categoría de producto (soft delete)',
  })
  remove(@Param('id') id: string) {
    return this.productCategoriesService.remove(id);
  }
}
