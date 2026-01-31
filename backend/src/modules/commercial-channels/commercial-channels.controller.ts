import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CommercialChannelsService } from './commercial-channels.service';
import {
  CreateCommercialChannelDto,
  UpdateCommercialChannelDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';

@ApiTags('Commercial Channels')
@ApiBearerAuth()
@Controller('commercial-channels')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CommercialChannelsController {
  constructor(
    private readonly commercialChannelsService: CommercialChannelsService,
  ) {}

  @Post()
  @RequirePermissions('create_commercial_channels')
  @ApiOperation({ summary: 'Create a new commercial channel' })
  @ApiResponse({
    status: 201,
    description: 'Commercial channel created successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  create(@Body() dto: CreateCommercialChannelDto) {
    return this.commercialChannelsService.create(dto);
  }

  @Get()
  @RequirePermissions('read_commercial_channels')
  @ApiOperation({ summary: 'Get all commercial channels' })
  @ApiResponse({
    status: 200,
    description: 'List of commercial channels retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  findAll() {
    return this.commercialChannelsService.findAll();
  }

  @Get(':id')
  @RequirePermissions('read_commercial_channels')
  @ApiOperation({ summary: 'Get a commercial channel by ID' })
  @ApiResponse({
    status: 200,
    description: 'Commercial channel retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Commercial channel not found' })
  findOne(@Param('id') id: string) {
    return this.commercialChannelsService.findOne(id);
  }

  @Put(':id')
  @RequirePermissions('update_commercial_channels')
  @ApiOperation({ summary: 'Update a commercial channel' })
  @ApiResponse({
    status: 200,
    description: 'Commercial channel updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Commercial channel not found' })
  update(@Param('id') id: string, @Body() dto: UpdateCommercialChannelDto) {
    return this.commercialChannelsService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('delete_commercial_channels')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a commercial channel' })
  @ApiResponse({
    status: 200,
    description: 'Commercial channel deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Commercial channel not found' })
  remove(@Param('id') id: string) {
    return this.commercialChannelsService.remove(id);
  }
}
