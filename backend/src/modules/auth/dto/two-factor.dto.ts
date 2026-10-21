import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Código de 6 dígitos de la app o código de respaldo (`ABCD-EFGH`). */
class CodeField {
  @ApiProperty({ example: '123456', description: 'Código de la app o de respaldo' })
  @IsString()
  @IsNotEmpty({ message: 'El código es obligatorio' })
  @MinLength(6)
  @MaxLength(20)
  code: string;
}

export class TwoFactorCodeDto extends CodeField {}

export class VerifyTwoFactorLoginDto extends CodeField {
  @ApiProperty({ description: 'Token temporal que devolvió POST /auth/login' })
  @IsString()
  @IsNotEmpty()
  challengeToken: string;

  @ApiPropertyOptional({ description: 'No volver a pedir el código en este navegador' })
  @IsBoolean()
  @IsOptional()
  rememberDevice?: boolean;
}

export class StartTwoFactorEnrollmentDto {
  @ApiProperty({ description: 'Token temporal que devolvió POST /auth/login' })
  @IsString()
  @IsNotEmpty()
  setupToken: string;
}

export class ConfirmTwoFactorEnrollmentDto extends CodeField {
  @ApiProperty({ description: 'Token temporal que devolvió POST /auth/login' })
  @IsString()
  @IsNotEmpty()
  setupToken: string;

  @ApiPropertyOptional({ description: 'No volver a pedir el código en este navegador' })
  @IsBoolean()
  @IsOptional()
  rememberDevice?: boolean;
}

export class DisableTwoFactorDto extends CodeField {
  @ApiProperty({ description: 'Contraseña actual' })
  @IsString()
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  password: string;
}
