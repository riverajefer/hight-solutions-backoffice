export type EmployeeType = 'REGULAR' | 'TEMPORARY';
export type EmployeeStatus = 'ACTIVE' | 'INACTIVE';
export type ContractType = 'FIXED_TERM' | 'INDEFINITE' | 'SERVICE_CONTRACT' | 'INTERNSHIP';

export interface PayrollEmployee {
  id: string;
  userId: string;
  cargoId: string | null;
  employeeType: EmployeeType;
  monthlySalary: string | null;
  dailyRate: string | null;
  startDate: string;
  contractType: ContractType | null;
  status: EmployeeStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  cargo: { id: string; name: string } | null;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    isActive: boolean;
  };
}

export interface CreatePayrollEmployeeDto {
  userId: string;
  cargoId?: string;
  employeeType?: EmployeeType;
  monthlySalary?: number;
  dailyRate?: number;
  startDate: string;
  contractType?: ContractType;
  notes?: string;
}

export interface UpdatePayrollEmployeeDto {
  cargoId?: string;
  employeeType?: EmployeeType;
  monthlySalary?: number;
  dailyRate?: number;
  startDate?: string;
  contractType?: ContractType;
  status?: EmployeeStatus;
  notes?: string;
}
