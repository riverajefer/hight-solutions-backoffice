import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { OrderTimelineService } from './order-timeline.service';
import { EntityType } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';

@ApiTags('order-timeline')
@ApiBearerAuth('JWT-auth')
@Controller('order-timeline')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OrderTimelineController {
  constructor(private readonly service: OrderTimelineService) {}

  @Get('search')
  @RequirePermissions('read_orders')
  @ApiOperation({ summary: 'Search orders across all document types' })
  @ApiQuery({
    name: 'q',
    required: true,
    description: 'Search term (order number or client name)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Max results per type (default: 20)',
  })
  @ApiResponse({
    status: 200,
    description: 'Search results grouped by document type',
  })
  async search(
    @Query('q') query: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    return this.service.searchOrders(query || '', parsedLimit);
  }

  @Get(':entityType/:entityId')
  @RequirePermissions('read_orders')
  @ApiOperation({
    summary: 'Get the complete order relationship tree',
  })
  @ApiParam({
    name: 'entityType',
    enum: EntityType,
    description: 'Type of the starting entity',
  })
  @ApiParam({
    name: 'entityId',
    description: 'UUID of the starting entity',
  })
  @ApiResponse({
    status: 200,
    description: 'Order tree with nodes and edges',
  })
  @ApiResponse({ status: 404, description: 'Entity not found' })
  async getOrderTree(
    @Param('entityType') entityType: EntityType,
    @Param('entityId') entityId: string,
  ) {
    try {
      return await this.service.getOrderTree(entityId, entityType);
    } catch (error) {
      // Handle special cases for orphan documents
      if (error.name === 'QuoteWithoutOrderException') {
        return this.service.getQuoteOnlyTree(error.quoteId);
      }
      if (error.name === 'ExpenseOrderWithoutWorkOrderException') {
        return this.service.getExpenseOrderOnlyTree(error.expenseOrderId);
      }
      throw error;
    }
  }
}
