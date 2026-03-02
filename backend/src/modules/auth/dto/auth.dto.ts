import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: 'adminsistema',
    description: 'Username'
  })
  @IsString()
  @IsNotEmpty({ message: 'Username is required' })
  username: string;

  @ApiProperty({
    example: 'admin123',
    description: 'User password',
    minLength: 6
  })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password: string;
}

export class RefreshTokenDto {
  @ApiProperty({
    example: 'clm1234567890',
    description: 'User ID'
  })
  @IsString()
  @IsNotEmpty({ message: 'User ID is required' })
  userId: string;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Refresh token'
  })
  @IsString()
  @IsNotEmpty({ message: 'Refresh token is required' })
  refreshToken: string;
}

export class RegisterDto {
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

export class UpdateProfilePhotoDto {
  @ApiProperty({
    example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    description: 'Profile photo as base64 encoded string or URL',
    required: false,
  })
  @IsString()
  @IsOptional()
  profilePhoto?: string;
}
