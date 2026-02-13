import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Query,
  ParseIntPipe,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import fetch from 'node-fetch';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { StorageService } from './storage.service';
import { UploadFileDto, FileResponseDto } from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { PermissionsGuard } from '../../common/guards';
import { RequirePermissions, CurrentUser } from '../../common/decorators';
import { JwtPayload } from '../../common/interfaces';
import { FILE_CONFIG } from './constants/file-config.constants';

@ApiTags('storage')
@ApiBearerAuth('JWT-auth')
@Controller('storage')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  /**
   * POST /api/v1/storage/upload
   * Upload a file
   * Requiere permiso: upload_files
   */
  @Post('upload')
  @RequirePermissions('upload_files')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: FILE_CONFIG.MAX_FILE_SIZE },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Subir un archivo' })
  @ApiBody({
    description: 'Archivo y metadata',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Archivo a subir',
        },
        entityType: {
          type: 'string',
          description: 'Tipo de entidad relacionada (opcional)',
          enum: ['order', 'quote', 'user', 'client', 'supplier'],
        },
        entityId: {
          type: 'string',
          description: 'ID de la entidad relacionada (opcional)',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Archivo subido exitosamente',
    type: FileResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Archivo inválido' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Sin permisos' })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadFileDto,
    @CurrentUser() user: JwtPayload,
  ) {
    if (!file) {
      throw new Error('No file uploaded');
    }

    return this.storageService.uploadFile(file, {
      entityType: dto.entityType,
      entityId: dto.entityId,
      userId: user.sub,
    });
  }

  /**
   * GET /api/v1/storage/:id
   * Get file metadata by ID
   * Requiere permiso: read_files
   */
  @Get(':id')
  @RequirePermissions('read_files')
  @ApiOperation({ summary: 'Obtener metadata de un archivo por ID' })
  @ApiParam({ name: 'id', description: 'ID del archivo' })
  @ApiResponse({
    status: 200,
    description: 'Metadata del archivo',
    type: FileResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Archivo no encontrado' })
  async getFile(@Param('id') id: string) {
    return this.storageService.getFile(id);
  }

  /**
   * GET /api/v1/storage/:id/url
   * Get signed URL for a file
   * Requiere permiso: read_files
   */
  @Get(':id/url')
  @RequirePermissions('read_files')
  @ApiOperation({ summary: 'Obtener URL firmada para acceder al archivo' })
  @ApiParam({ name: 'id', description: 'ID del archivo' })
  @ApiQuery({
    name: 'expiresIn',
    required: false,
    description: 'Tiempo de expiración de la URL en segundos (default: 3600)',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'URL firmada del archivo',
    schema: {
      type: 'object',
      properties: {
        url: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Archivo no encontrado' })
  async getFileUrl(
    @Param('id') id: string,
    @Query('expiresIn', new ParseIntPipe({ optional: true }))
    expiresIn?: number,
  ) {
    const url = await this.storageService.getFileUrl(id, expiresIn);
    return { url };
  }

  /**
   * GET /api/v1/storage/:id/download
   * Download file with proper headers (forces download instead of viewing)
   * Requiere permiso: read_files
   */
  @Get(':id/download')
  @RequirePermissions('read_files')
  @ApiOperation({ summary: 'Descargar archivo' })
  @ApiParam({ name: 'id', description: 'ID del archivo' })
  @ApiResponse({
    status: 200,
    description: 'Archivo descargado',
  })
  @ApiResponse({ status: 404, description: 'Archivo no encontrado' })
  async downloadFile(@Param('id') id: string, @Res() res: Response) {
    const file = await this.storageService.getFile(id);
    const url = await this.storageService.getFileUrl(id);

    // Fetch file from S3
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Failed to fetch file from storage');
    }

    // Set headers to force download
    res.setHeader('Content-Type', file.mimeType);

    // Use RFC 5987 encoding for filename with special characters
    const encodedFilename = encodeURIComponent(file.originalName);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.originalName}"; filename*=UTF-8''${encodedFilename}`,
    );
    res.setHeader('Content-Length', file.size.toString());

    // CORS: Expose Content-Disposition header to frontend
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

    // Stream the file
    const buffer = await response.buffer();
    res.send(buffer);
  }

  /**
   * DELETE /api/v1/storage/:id
   * Delete a file (soft delete)
   * Requiere permiso: delete_files
   */
  @Delete(':id')
  @RequirePermissions('delete_files')
  @ApiOperation({ summary: 'Eliminar un archivo (soft delete)' })
  @ApiParam({ name: 'id', description: 'ID del archivo a eliminar' })
  @ApiResponse({
    status: 200,
    description: 'Archivo eliminado exitosamente',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Archivo no encontrado' })
  @ApiResponse({ status: 403, description: 'Sin permisos para eliminar' })
  async deleteFile(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.storageService.deleteFile(id, user.sub);
    return { message: 'Archivo eliminado exitosamente' };
  }

  /**
   * GET /api/v1/storage/entity/:entityType/:entityId
   * Get all files for an entity
   * Requiere permiso: read_files
   */
  @Get('entity/:entityType/:entityId')
  @RequirePermissions('read_files')
  @ApiOperation({ summary: 'Obtener todos los archivos de una entidad' })
  @ApiParam({ name: 'entityType', description: 'Tipo de entidad' })
  @ApiParam({ name: 'entityId', description: 'ID de la entidad' })
  @ApiResponse({
    status: 200,
    description: 'Lista de archivos de la entidad',
    type: [FileResponseDto],
  })
  async getFilesByEntity(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.storageService.getFilesByEntity(entityType, entityId);
  }

  /**
   * GET /api/v1/storage/user/:userId
   * Get all files uploaded by a user
   * Requiere permiso: read_files
   */
  @Get('user/:userId')
  @RequirePermissions('read_files')
  @ApiOperation({ summary: 'Obtener todos los archivos subidos por un usuario' })
  @ApiParam({ name: 'userId', description: 'ID del usuario' })
  @ApiResponse({
    status: 200,
    description: 'Lista de archivos del usuario',
    type: [FileResponseDto],
  })
  async getFilesByUser(@Param('userId') userId: string) {
    return this.storageService.getFilesByUser(userId);
  }
}
