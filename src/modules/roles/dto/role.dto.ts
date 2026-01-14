import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  ArrayMinSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRoleDto {
  @ApiProperty({
    example: 'Admin',
    description: 'Role name'
  })
  @IsString()
  @IsNotEmpty({ message: 'Role name is required' })
  name: string;

  @ApiPropertyOptional({
    example: ['clm1234567890', 'clm0987654321'],
    description: 'Array of permission IDs',
    type: [String]
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permissionIds?: string[];
}

export class UpdateRoleDto {
  @ApiPropertyOptional({
    example: 'Admin',
    description: 'Role name'
  })
  @IsString()
  @IsOptional()
  name?: string;
}

export class AssignPermissionsDto {
  @ApiProperty({
    example: ['clm1234567890', 'clm0987654321'],
    description: 'Array of permission IDs',
    type: [String],
    minItems: 1
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one permission ID is required' })
  @IsString({ each: true })
  permissionIds: string[];
}
