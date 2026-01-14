import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address'
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({
    example: 'password123',
    description: 'User password',
    minLength: 6
  })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password: string;

  @ApiProperty({
    example: 'clm1234567890',
    description: 'Role ID'
  })
  @IsString()
  @IsNotEmpty({ message: 'Role ID is required' })
  roleId: string;
}

export class UpdateUserDto {
  @ApiPropertyOptional({
    example: 'user@example.com',
    description: 'User email address'
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    example: 'password123',
    description: 'User password',
    minLength: 6
  })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  @IsOptional()
  password?: string;

  @ApiPropertyOptional({
    example: 'clm1234567890',
    description: 'Role ID'
  })
  @IsString()
  @IsOptional()
  roleId?: string;
}
