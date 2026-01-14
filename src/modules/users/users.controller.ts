import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { PermissionsGuard } from '../../common/guards';
import { RequirePermissions } from '../../common/decorators';

@ApiTags('users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * GET /api/v1/users
   * Lista todos los usuarios
   * Requiere permiso: read_users
   */
  @Get()
  @RequirePermissions('read_users')
  findAll() {
    return this.usersService.findAll();
  }

  /**
   * GET /api/v1/users/:id
   * Obtiene un usuario por ID
   * Requiere permiso: read_users
   */
  @Get(':id')
  @RequirePermissions('read_users')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  /**
   * POST /api/v1/users
   * Crea un nuevo usuario
   * Requiere permiso: create_users
   */
  @Post()
  @RequirePermissions('create_users')
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  /**
   * PUT /api/v1/users/:id
   * Actualiza un usuario
   * Requiere permiso: update_users
   */
  @Put(':id')
  @RequirePermissions('update_users')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  /**
   * DELETE /api/v1/users/:id
   * Elimina un usuario
   * Requiere permiso: delete_users
   */
  @Delete(':id')
  @RequirePermissions('delete_users')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
