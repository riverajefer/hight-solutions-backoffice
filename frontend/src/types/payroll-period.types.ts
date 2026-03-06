import type { PayrollItem } from './payroll-item.types';

export type PayrollPeriodType = 'BIWEEKLY' | 'MONTHLY';
export type PayrollPeriodStatus = 'DRAFT' | 'CALCULATED' | 'PAID';

export interface PayrollPeriod {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  periodType: PayrollPeriodType;
  status: PayrollPeriodStatus;
  overtimeDaytimeRate: string | null;
  overtimeNighttimeRate: string | null;
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
  notes?: string;
}

export interface PayrollPeriodSummary {
  employeeCount: number;
  totalBaseSalary: number;
  totalPayment: number;
  totalEpsAndPension: number;
  totalPayrollCost: number;
}
