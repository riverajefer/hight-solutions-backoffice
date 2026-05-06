export interface ExpenseSubcategory {
  id: string;
  name: string;
  description?: string | null;
  expenseTypeId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseType {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  subcategories?: ExpenseSubcategory[];
}

export type ExpenseTypeListResponse = ExpenseType[];
export type ExpenseSubcategoryListResponse = ExpenseSubcategory[];

export interface CreateExpenseTypeDto {
  name: string;
  description?: string;
}

export interface UpdateExpenseTypeDto {
  name?: string;
  description?: string;
  isActive?: boolean;
}

export interface CreateExpenseSubcategoryDto {
  name: string;
  description?: string;
  expenseTypeId: string;
}

export interface UpdateExpenseSubcategoryDto {
  name?: string;
  description?: string;
  expenseTypeId?: string;
  isActive?: boolean;
}
