export interface PayrollItem {
  id: string;
  periodId: string;
  employeeId: string;
  daysWorked: string | null;
  baseSalary: string;
  overtimeDaytimeHours: string | null;
  overtimeNighttimeHours: string | null;
  overtimeDaytimeValue: string | null;
  overtimeNighttimeValue: string | null;
  commissions: string | null;
  restDayValue: string | null;
  transportAllowance: string | null;
  workdayDiscount: string | null;
  loans: string | null;
  advances: string | null;
  nonPaidDays: string | null;
  epsAndPensionDiscount: string | null;
  totalPayment: string;
  observations: string | null;
  createdAt: string;
  updatedAt: string;
  employee: {
    id: string;
    employeeType: 'REGULAR' | 'TEMPORARY';
    monthlySalary: string | null;
    dailyRate: string | null;
    jobTitle: string | null;
    user: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      email: string | null;
    };
  };
  period?: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    periodType: string;
    status: string;
  };
}

export interface CreatePayrollItemDto {
  employeeId: string;
  daysWorked?: number;
  baseSalary: number;
  overtimeDaytimeHours?: number;
  overtimeNighttimeHours?: number;
  overtimeDaytimeValue?: number;
  overtimeNighttimeValue?: number;
  commissions?: number;
  restDayValue?: number;
  transportAllowance?: number;
  workdayDiscount?: number;
  loans?: number;
  advances?: number;
  nonPaidDays?: number;
  epsAndPensionDiscount?: number;
  totalPayment: number;
  observations?: string;
}

export interface UpdatePayrollItemDto {
  daysWorked?: number;
  baseSalary?: number;
  overtimeDaytimeHours?: number;
  overtimeNighttimeHours?: number;
  overtimeDaytimeValue?: number;
  overtimeNighttimeValue?: number;
  commissions?: number;
  restDayValue?: number;
  transportAllowance?: number;
  workdayDiscount?: number;
  loans?: number;
  advances?: number;
  nonPaidDays?: number;
  epsAndPensionDiscount?: number;
  totalPayment?: number;
  observations?: string;
}
