import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, Matches } from 'class-validator';

export class RegisterElectronicInvoiceDto {
  @ApiProperty({
    description: 'Número de factura electrónica (alfanumérico, máximo 30 caracteres)',
    example: 'FE-2026-00123',
    maxLength: 30,
  })
  @IsNotEmpty({ message: 'El número de factura electrónica es requerido' })
  @IsString({ message: 'El número de factura debe ser un texto válido' })
  @MaxLength(30, { message: 'El número de factura no puede superar los 30 caracteres' })
  @Matches(/^[a-zA-Z0-9\-_./]+$/, {
    message: 'El número de factura solo puede contener caracteres alfanuméricos y los símbolos - _ . /',
  })
  electronicInvoiceNumber: string;
}
