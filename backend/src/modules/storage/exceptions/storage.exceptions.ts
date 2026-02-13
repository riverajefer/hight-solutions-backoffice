import {
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  ForbiddenException,
} from '@nestjs/common';

export class FileNotFoundStorageException extends NotFoundException {
  constructor(fileId: string) {
    super(`Archivo con ID ${fileId} no encontrado`);
  }
}

export class InvalidFileTypeException extends BadRequestException {
  constructor(mimeType: string) {
    super(`Tipo de archivo ${mimeType} no permitido`);
  }
}

export class FileSizeLimitException extends BadRequestException {
  constructor(size: number, limit: number) {
    super(`El archivo (${size} bytes) excede el límite de ${limit} bytes`);
  }
}

export class FileUploadFailedException extends InternalServerErrorException {
  constructor(reason: string) {
    super(`Error al subir archivo: ${reason}`);
  }
}

export class FileDeleteForbiddenException extends ForbiddenException {
  constructor() {
    super('No tiene permisos para eliminar este archivo');
  }
}
