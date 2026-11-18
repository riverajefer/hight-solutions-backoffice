import { Body, Controller, Get, Param, ParseUUIDPipe, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { ReplaceProductSupplyRulesDto } from './dto';
import { ProductSupplyRulesService } from './product-supply-rules.service';

@ApiTags('products')
@ApiBearerAuth('JWT-auth')
@Controller('products/:productId/supply-rules')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProductSupplyRulesController {
  constructor(private readonly service: ProductSupplyRulesService) {}

  @Get()
  @RequirePermissions('read_products')
  @ApiOperation({ summary: 'Receta del producto: insumos con rollos que descuenta cada venta' })
  @ApiParam({ name: 'productId', description: 'ID del producto' })
  findAll(@Param('productId', ParseUUIDPipe) productId: string) {
    return this.service.findByProduct(productId);
  }

  @Put()
  @RequirePermissions('update_products')
  @ApiOperation({
    summary: 'Reemplazar la receta del producto (lo que no venga se desactiva; aplica a ítems nuevos)',
  })
  @ApiParam({ name: 'productId', description: 'ID del producto' })
  replace(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: ReplaceProductSupplyRulesDto,
  ) {
    return this.service.replace(productId, dto.rules);
  }
}
