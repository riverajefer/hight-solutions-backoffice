import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePermissionDto {
  @ApiProperty({
    example: 'CREATE_USER',
    description: 'Permission name'
  })
  @IsString()
  @IsNotEmpty({ message: 'Permission name is required' })
  name: string;

  @ApiPropertyOptional({
    example: 'Permission to create new users',
    description: 'Permission description'
  })
  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdatePermissionDto {
  @ApiPropertyOptional({
    example: 'CREATE_USER',
    description: 'Permission name'
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    example: 'Permission to create new users',
    description: 'Permission description'
  })
  @IsString()
  @IsOptional()
  description?: string;
}
