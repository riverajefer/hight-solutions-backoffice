import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  ArrayMinSize,
} from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty({ message: 'Role name is required' })
  name: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permissionIds?: string[];
}

export class UpdateRoleDto {
  @IsString()
  @IsOptional()
  name?: string;
}

export class AssignPermissionsDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one permission ID is required' })
  @IsString({ each: true })
  permissionIds: string[];
}
