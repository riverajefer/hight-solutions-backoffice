import { Injectable, NotFoundException } from '@nestjs/common';
import { ProductionRepository } from './production.repository';
import { CreateProductTemplateDto, UpdateProductTemplateDto } from './dto';

@Injectable()
export class ProductTemplatesService {
  constructor(private readonly repo: ProductionRepository) {}

  findAll(filters: { category?: string; isActive?: boolean }) {
    return this.repo.findAllTemplates(filters);
  }

  async findOne(id: string) {
    const template = await this.repo.findTemplateById(id);
    if (!template) throw new NotFoundException(`Plantilla con id ${id} no encontrada`);
    return template;
  }

  async create(dto: CreateProductTemplateDto) {
    const template = await this.repo.createTemplate({
      name: dto.name,
      category: dto.category,
      description: dto.description,
    });

    for (const compDto of dto.components) {
      const component = await this.repo.createComponent({
        templateId: template.id,
        name: compDto.name,
        order: compDto.order,
        phase: compDto.phase,
        isRequired: compDto.isRequired,
      });

      for (const stepDto of compDto.steps) {
        await this.repo.createComponentStep({
          componentId: component.id,
          stepDefinitionId: stepDto.stepDefinitionId,
          order: stepDto.order,
          isRequired: stepDto.isRequired,
          fieldOverrides: stepDto.fieldOverrides ?? null,
        });
      }
    }

    return this.repo.findTemplateById(template.id);
  }

  async update(id: string, dto: UpdateProductTemplateDto) {
    await this.findOne(id);
    return this.repo.updateTemplate(id, dto);
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.repo.softDeleteTemplate(id);
  }
}
