import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateExpenseOrderVoidRequestDto {
  @IsString()
  @IsNotEmpty({ message: 'Escribe el motivo de la anulación' })
  @MinLength(10, { message: 'El motivo debe tener al menos 10 caracteres' })
  @MaxLength(500, { message: 'El motivo no puede pasar de 500 caracteres' })
  @ApiProperty({ description: 'Por qué se anula la OG', minLength: 10, maxLength: 500 })
  reason: string;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({
    description:
      '¿El dinero sigue en la empresa (efectivo en el cajón, o la transferencia nunca se hizo o se devolvió)? ' +
      'Obligatorio y en true si la OG tiene egresos vivos: si salió, la anulación crearía un faltante.',
  })
  cashStayedInDrawer?: boolean;
}
