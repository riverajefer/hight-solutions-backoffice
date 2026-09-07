import { IsOptional, IsBoolean, IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

export class FilterNotificationsDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @ApiPropertyOptional({ description: 'Número de página', default: 1 })
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  @ApiPropertyOptional({
    description: 'Cantidad de registros por página',
    default: 20,
  })
  limit?: number = 20;

  // Filtro de tres estados: sin enviar = todas, `true` = leídas, `false` = sin
  // leer. `@Type(() => Boolean)` no sirve para eso, porque `Boolean('false')`
  // es `true` y `?isRead=false` terminaba devolviendo justo las leídas.
  //
  // El `@Transform` solo tampoco alcanza: el ValidationPipe corre con
  // `enableImplicitConversion`, que convierte la cadena según el tipo declarado
  // (`boolean`) ANTES de que corra el `@Transform`, que entonces recibe `true`
  // y ya no puede distinguir nada. `@Type(() => String)` es lo que hace que la
  // conversión implícita deje pasar la cadena intacta.
  //
  // El `undefined` explícito conserva el tercer estado: el servicio solo filtra
  // cuando el valor no es `undefined`.
  @IsOptional()
  @Type(() => String)
  @Transform(({ value }) => {
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    return undefined;
  })
  @IsBoolean()
  @ApiPropertyOptional({
    description:
      'Filtrar por estado de lectura. Omitir para traer todas; `true` solo leídas; `false` solo sin leer.',
  })
  isRead?: boolean;
}
