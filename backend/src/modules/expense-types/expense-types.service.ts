import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ExpenseTypesRepository } from './expense-types.repository';
import {
  CreateExpenseTypeDto,
  UpdateExpenseTypeDto,
  CreateExpenseSubcategoryDto,
  UpdateExpenseSubcategoryDto,
} from './dto';

@Injectable()
export class ExpenseTypesService {
  constructor(private readonly repository: ExpenseTypesRepository) {}

  // ─── Expense Types ────────────────────────────────────────────────────────

  async findAllTypes() {
    return this.repository.findAllTypes();
  }

  async findOneType(id: string) {
    const type = await this.repository.findTypeById(id);
    if (!type) {
      throw new NotFoundException(`Tipo de gasto con id ${id} no encontrado`);
    }
    return type;
  }

  async createType(dto: CreateExpenseTypeDto) {
    return this.repository.createType(dto);
  }

  async updateType(id: string, dto: UpdateExpenseTypeDto) {
    await this.findOneType(id);
    return this.repository.updateType(id, dto);
  }

  async removeType(id: string) {
    await this.findOneType(id);
    return this.repository.deleteType(id);
  }

  // ─── Expense Subcategories ─────────────────────────────────────────────────

  async findAllSubcategories(expenseTypeId?: string) {
    if (expenseTypeId) {
      await this.findOneType(expenseTypeId);
    }
    return this.repository.findAllSubcategories(expenseTypeId);
  }

  async findOneSubcategory(id: string) {
    const sub = await this.repository.findSubcategoryById(id);
    if (!sub) {
      throw new NotFoundException(`Subcategoría con id ${id} no encontrada`);
    }
    return sub;
  }

  async createSubcategory(dto: CreateExpenseSubcategoryDto) {
    await this.findOneType(dto.expenseTypeId);
    return this.repository.createSubcategory(dto);
  }

  async updateSubcategory(id: string, dto: UpdateExpenseSubcategoryDto) {
    await this.findOneSubcategory(id);
    if (dto.expenseTypeId) {
      await this.findOneType(dto.expenseTypeId);
    }
    return this.repository.updateSubcategory(id, dto);
  }

  async removeSubcategory(id: string) {
    await this.findOneSubcategory(id);
    return this.repository.deleteSubcategory(id);
  }
}
