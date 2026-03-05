export type EmployeeType = 'REGULAR' | 'TEMPORARY';
export type EmployeeStatus = 'ACTIVE' | 'INACTIVE';
export type ContractType = 'FIXED_TERM' | 'INDEFINITE' | 'SERVICE_CONTRACT' | 'INTERNSHIP';

export interface PayrollEmployee {
  id: string;
  userId: string;
  employeeType: EmployeeType;
  monthlySalary: string | null;
  dailyRate: string | null;
  jobTitle: string | null;
  startDate: string;
  contractType: ContractType | null;
  status: EmployeeStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    isActive: boolean;
    cargo: { id: string; name: string } | null;
  };
}

export interface CreatePayrollEmployeeDto {
  userId: string;
  employeeType?: EmployeeType;
  monthlySalary?: number;
  dailyRate?: number;
  jobTitle?: string;
  startDate: string;
  contractType?: ContractType;
  notes?: string;
}

export interface UpdatePayrollEmployeeDto {
  employeeType?: EmployeeType;
  monthlySalary?: number;
  dailyRate?: number;
  jobTitle?: string;
  startDate?: string;
  contractType?: ContractType;
  status?: EmployeeStatus;
  notes?: string;
}
