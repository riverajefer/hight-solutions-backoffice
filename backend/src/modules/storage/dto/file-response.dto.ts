import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FileResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  originalName: string;

  @ApiProperty()
  fileName: string;

  @ApiProperty()
  mimeType: string;

  @ApiProperty()
  size: number;

  @ApiProperty()
  s3Key: string;

  @ApiPropertyOptional()
  url?: string;

  @ApiPropertyOptional()
  entityType?: string;

  @ApiPropertyOptional()
  entityId?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
