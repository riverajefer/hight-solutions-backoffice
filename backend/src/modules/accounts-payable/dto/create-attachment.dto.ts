import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, IsNotEmpty } from 'class-validator';

export class CreateAttachmentDto {
  @ApiProperty({ description: 'ID del archivo subido via /storage/upload' })
  @IsUUID()
  @IsNotEmpty()
  storageFileId: string;

  @ApiProperty({ description: 'Nombre visible del archivo' })
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @ApiProperty({ description: 'URL del archivo (signed URL)' })
  @IsString()
  @IsNotEmpty()
  fileUrl: string;

  @ApiProperty({ description: 'Tipo MIME del archivo', required: false })
  @IsString()
  fileType?: string;
}
