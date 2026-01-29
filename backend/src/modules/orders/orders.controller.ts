import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import {
  CreateOrderDto,
  UpdateOrderDto,
  FilterOrdersDto,
  AddOrderItemDto,
  UpdateOrderItemDto,
  CreatePaymentDto,
  UpdateOrderStatusDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OrderStatus } from '../../generated/prisma';

@ApiTags('orders')
@ApiBearerAuth('JWT-auth')
@Controller('orders')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @RequirePermissions('read_orders')
  @ApiOperation({ summary: 'Get all orders with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Orders retrieved successfully' })
  findAll(@Query() filters: FilterOrdersDto) {
    return this.ordersService.findAll(filters);
  }

  @Get(':id')
  @RequirePermissions('read_orders')
  @ApiOperation({ summary: 'Get order by ID' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Order found' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Post()
  @RequirePermissions('create_orders')
  @ApiOperation({ summary: 'Create new order' })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  create(
    @Body() createOrderDto: CreateOrderDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.ordersService.create(createOrderDto, userId);
  }

  @Put(':id')
  @RequirePermissions('update_orders')
  @ApiOperation({ summary: 'Update order (only DRAFT)' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Order updated successfully' })
  @ApiResponse({ status: 400, description: 'Cannot update non-DRAFT order' })
  update(@Param('id') id: string, @Body() updateOrderDto: UpdateOrderDto) {
    return this.ordersService.update(id, updateOrderDto);
  }

  @Put(':id/status')
  @RequirePermissions('approve_orders')
  @ApiOperation({ summary: 'Change order status' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Status updated successfully' })
  updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(id, updateStatusDto.status);
  }

  @Delete(':id')
  @RequirePermissions('delete_orders')
  @ApiOperation({ summary: 'Delete order (only DRAFT/CANCELLED)' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Order deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete this order' })
  remove(@Param('id') id: string) {
    return this.ordersService.remove(id);
  }

  // ========== ITEM MANAGEMENT ENDPOINTS ==========

  @Post(':id/items')
  @RequirePermissions('update_orders')
  @ApiOperation({ summary: 'Add item to order (only DRAFT)' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 201, description: 'Item added successfully' })
  @ApiResponse({ status: 400, description: 'Cannot add items to non-DRAFT order' })
  addItem(@Param('id') orderId: string, @Body() addItemDto: AddOrderItemDto) {
    return this.ordersService.addItem(orderId, addItemDto);
  }

  @Patch(':id/items/:itemId')
  @RequirePermissions('update_orders')
  @ApiOperation({ summary: 'Update order item (only DRAFT)' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiParam({ name: 'itemId', description: 'Item ID' })
  @ApiResponse({ status: 200, description: 'Item updated successfully' })
  @ApiResponse({ status: 400, description: 'Cannot update items in non-DRAFT order' })
  updateItem(
    @Param('id') orderId: string,
    @Param('itemId') itemId: string,
    @Body() updateItemDto: UpdateOrderItemDto,
  ) {
    return this.ordersService.updateItem(orderId, itemId, updateItemDto);
  }

  @Delete(':id/items/:itemId')
  @RequirePermissions('update_orders')
  @ApiOperation({ summary: 'Remove item from order (only DRAFT)' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiParam({ name: 'itemId', description: 'Item ID' })
  @ApiResponse({ status: 200, description: 'Item removed successfully' })
  @ApiResponse({ status: 400, description: 'Cannot remove items from non-DRAFT order' })
  removeItem(
    @Param('id') orderId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.ordersService.removeItem(orderId, itemId);
  }

  // ========== PAYMENT MANAGEMENT ENDPOINTS ==========

  @Post(':id/payments')
  @RequirePermissions('approve_orders')
  @ApiOperation({ summary: 'Add payment to order (only CONFIRMED+)' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 201, description: 'Payment added successfully' })
  @ApiResponse({
    status: 400,
    description: 'Cannot add payment to DRAFT order or payment exceeds balance',
  })
  addPayment(
    @Param('id') orderId: string,
    @Body() createPaymentDto: CreatePaymentDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.ordersService.addPayment(orderId, createPaymentDto, userId);
  }

  @Get(':id/payments')
  @RequirePermissions('read_orders')
  @ApiOperation({ summary: 'Get all payments for an order' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Payments retrieved successfully' })
  getPayments(@Param('id') orderId: string) {
    return this.ordersService.getPayments(orderId);
  }
}
