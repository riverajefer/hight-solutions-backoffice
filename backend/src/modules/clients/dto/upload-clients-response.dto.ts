import { ApiProperty } from '@nestjs/swagger';

export class UploadClientRowErrorDto {
  @ApiProperty({ example: 3 })
  row: number;

  @ApiProperty({ example: 'Email ya existe en la base de datos' })
  error: string;
}

export class UploadClientsResponseDto {
  @ApiProperty({ example: 10 })
  total: number;

  @ApiProperty({ example: 8 })
  successful: number;

  @ApiProperty({ example: 2 })
  failed: number;

  @ApiProperty({ type: [UploadClientRowErrorDto] })
  errors: UploadClientRowErrorDto[];
}
