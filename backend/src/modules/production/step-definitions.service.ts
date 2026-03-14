import { Injectable, NotFoundException } from '@nestjs/common';
import { ProductionRepository } from './production.repository';

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
}
