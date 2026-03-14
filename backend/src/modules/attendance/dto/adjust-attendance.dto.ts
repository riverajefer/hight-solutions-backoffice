import { IsOptional, IsDateString, IsString, MaxLength, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdjustAttendanceDto {
  @ApiPropertyOptional({ description: 'Nueva hora de entrada (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  clockIn?: string;

  @ApiPropertyOptional({ description: 'Nueva hora de salida (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  clockOut?: string;

  @ApiPropertyOptional({ description: 'Notas adicionales' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiProperty({ description: 'Justificación del ajuste (obligatorio)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}
