import type { PayrollItem } from './payroll-item.types';

export type PayrollPeriodType = 'BIWEEKLY' | 'MONTHLY';
export type PayrollPeriodStatus = 'DRAFT' | 'IN_PROGRESS' | 'CALCULATED' | 'PAID';

export interface PayrollPeriod {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  periodType: PayrollPeriodType;
  status: PayrollPeriodStatus;
  overtimeDaytimeRate: string | null;
  overtimeNighttimeRate: string | null;
  overtimeDaytimeFestiveRate: string | null;
  overtimeNighttimeFestiveRate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  payrollItems?: PayrollItem[];
}

export interface CreatePayrollPeriodDto {
  name: string;
  startDate: string;
  endDate: string;
  periodType: PayrollPeriodType;
  overtimeDaytimeRate?: number;
  overtimeNighttimeRate?: number;
  overtimeDaytimeFestiveRate?: number;
  overtimeNighttimeFestiveRate?: number;
  notes?: string;
}

export interface UpdatePayrollPeriodDto {
  name?: string;
  startDate?: string;
  endDate?: string;
  periodType?: PayrollPeriodType;
  status?: PayrollPeriodStatus;
  overtimeDaytimeRate?: number;
  overtimeNighttimeRate?: number;
  overtimeDaytimeFestiveRate?: number;
  overtimeNighttimeFestiveRate?: number;
  notes?: string;
}

/**
 * Datos del periodo destino al clonar. El tipo de periodo, las tarifas de horas
 * extra y las notas se heredan del periodo origen.
 */
export interface ClonePayrollPeriodDto {
  name: string;
  startDate: string;
  endDate: string;
}

/** Periodo creado por la clonación + cuántos empleados se copiaron. */
export interface ClonePayrollPeriodResult extends PayrollPeriod {
  clonedItemsCount: number;
}

export interface PayrollPeriodSummary {
  employeeCount: number;
  totalBaseSalary: number;
  totalPayment: number;
  totalEpsAndPension: number;
  totalEmployeeFundSavings: number;
  totalPayrollCost: number;
}

/**
 * Anticipo (Cuenta por Pagar tipo Personal/Anticipos) vinculado a un periodo de
 * nómina. `beneficiaryUser.id` es el userId del empleado; se agrupan por ese id.
 */
export interface PayrollAdvance {
  id: string;
  apNumber: string;
  description: string;
  totalAmount: string;
  paidAmount: string;
  balance: string;
  status: string;
  dueDate: string;
  createdAt: string;
  beneficiaryUser: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  } | null;
}
