import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ProductionRepository } from './production.repository';
import { UpdateFieldSchemaDto } from './dto';

@Injectable()
export class StepDefinitionsService {
  constructor(private readonly repo: ProductionRepository) {}

  findAll() {
    return this.repo.findAllStepDefinitions();
  }

  async findOne(id: string) {
    const stepDef = await this.repo.findStepDefinitionById(id);
    if (!stepDef) throw new NotFoundException(`StepDefinition con id ${id} no encontrada`);
    return stepDef;
  }

  async updateFieldSchema(id: string, dto: UpdateFieldSchemaDto) {
    // 1. Verify step definition exists
    const existing = await this.repo.findStepDefinitionById(id);
    if (!existing) throw new NotFoundException(`StepDefinition con id ${id} no encontrada`);

    // 2. Validate no duplicate keys
    const keys = dto.fieldSchema.fields.map((f) => f.key);
    const seen = new Set<string>();
    const duplicates = keys.filter((k) => {
      if (seen.has(k)) return true;
      seen.add(k);
      return false;
    });
    if (duplicates.length > 0) {
      throw new BadRequestException(
        `El fieldSchema contiene claves duplicadas: ${[...new Set(duplicates)].join(', ')}`,
      );
    }

    // 3. Normalize: assign order based on position if missing
    const normalizedFields = dto.fieldSchema.fields.map((f, i) => ({
      ...f,
      order: f.order ?? i,
    }));

    // 4. Persist
    const updated = await this.repo.updateStepDefinitionFieldSchema(id, {
      fields: normalizedFields,
    });

    // 5. Soft warning: check if any production order steps have existing data
    const withSteps = await this.repo.findStepDefinitionWithOrderSteps(id);
    const hasExistingData = (withSteps?.productionOrderSteps?.length ?? 0) > 0;

    return {
      ...updated,
      ...(hasExistingData && {
        warning:
          'Esta definición de paso tiene órdenes de producción con datos ya ingresados. Los campos modificados pueden afectar registros existentes.',
      }),
    };
  }
}
