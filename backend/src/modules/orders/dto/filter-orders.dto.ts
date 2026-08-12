import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsUUID,
  IsDateString,
  IsInt,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { EditRequestStatus, OrderStatus } from '../../../generated/prisma';

export class FilterOrdersDto {
  @ApiPropertyOptional({
    description: 'Filtrar por estado',
    enum: OrderStatus,
  })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({
    description: 'Búsqueda general (número de orden, cliente, etc.)',
    example: 'ORD-001',
  })
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por cliente',
    example: 'uuid-client',
  })
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiPropertyOptional({
    description: 'Fecha de orden desde (ISO 8601)',
    example: '2026-01-01',
  })
  @IsOptional()
  @IsDateString()
  orderDateFrom?: string;

  @ApiPropertyOptional({
    description: 'Fecha de orden hasta (ISO 8601)',
    example: '2026-12-31',
  })
  @IsOptional()
  @IsDateString()
  orderDateTo?: string;

  @ApiPropertyOptional({
    description:
      'Fecha de pago desde (ISO 8601). Trae las órdenes que tengan al menos ' +
      'un abono en el rango, sin importar su fecha de orden. Pensado para la ' +
      'conciliación bancaria: los abonos de una OP vieja también cuentan.',
    example: '2026-01-01',
  })
  @IsOptional()
  @IsDateString()
  paymentDateFrom?: string;

  @ApiPropertyOptional({
    description: 'Fecha de pago hasta (ISO 8601). Ver `paymentDateFrom`.',
    example: '2026-12-31',
  })
  @IsOptional()
  @IsDateString()
  paymentDateTo?: string;

  @ApiPropertyOptional({
    description: 'Número de página',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Elementos por página',
    example: 20,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Si es true, excluye órdenes que ya tienen una OT activa (no cancelada)',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  excludeWithWorkOrder?: boolean;

  @ApiPropertyOptional({
    description: 'Filtrar por Área de Producción (id)',
    example: 'uuid-production-area',
  })
  @IsOptional()
  @IsUUID()
  productionAreaId?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por Asesor / Creador (id)',
    example: 'uuid-user',
  })
  @IsOptional()
  @IsUUID()
  createdById?: string;

  @ApiPropertyOptional({
    description: 'Si es true, solo órdenes con saldo pendiente por cobrar (balance > 0)',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  hasBalance?: boolean;

  @ApiPropertyOptional({
    description: 'Filtrar por estado de autorización del anticipo',
    enum: EditRequestStatus,
  })
  @IsOptional()
  @IsEnum(EditRequestStatus)
  advancePaymentStatus?: EditRequestStatus;

  @ApiPropertyOptional({
    description:
      'Si es true, excluye las órdenes ANULADAS. Lo usan las pantallas de ' +
      'ventas, donde una orden anulada no es una venta. Se ignora cuando se ' +
      'filtra explícitamente por `status`, para poder consultarlas cuando se ' +
      'quiere. Afecta por igual al listado, al resumen y a la exportación.',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  excludeAnulado?: boolean;
}
