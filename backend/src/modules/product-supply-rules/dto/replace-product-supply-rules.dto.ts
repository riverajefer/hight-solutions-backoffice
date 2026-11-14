import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsNumber, IsUUID, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ProductSupplyRuleInputDto {
  @ApiProperty({ description: 'Insumo con rollos/lotes que consume el producto' })
  @IsUUID()
  supplyId: string;

  @ApiProperty({
    description: 'Cantidad del insumo (en su unidad de consumo) por cada unidad vendida del producto',
    example: 0.9,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  factor: number;
}

export class ReplaceProductSupplyRulesDto {
  @ApiProperty({
    type: [ProductSupplyRuleInputDto],
    description: 'Receta completa del producto. Lo que no venga se desactiva (nunca se borra)',
  })
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ProductSupplyRuleInputDto)
  rules: ProductSupplyRuleInputDto[];
}
