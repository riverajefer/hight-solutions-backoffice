export type EmployeeType = 'REGULAR' | 'TEMPORARY';
export type EmployeeStatus = 'ACTIVE' | 'INACTIVE';
export type ContractType = 'FIXED_TERM' | 'INDEFINITE' | 'SERVICE_CONTRACT' | 'INTERNSHIP';
export type IdentificationType = 'CC' | 'CE' | 'TI' | 'PA' | 'NIT';
export type Sex = 'MALE' | 'FEMALE' | 'OTHER';

/** Campos de datos personales/RRHH compartidos por el empleado y sus DTOs. */
export interface EmployeePersonalData {
  identificationType: IdentificationType | null;
  identificationNumber: string | null;
  documentIssueDate: string | null;
  firstName: string | null;
  middleName: string | null;
  firstLastName: string | null;
  secondLastName: string | null;
  sex: Sex | null;
  birthDate: string | null;
  address: string | null;
  neighborhood: string | null;
  phone: string | null;
  email: string | null;
  eps: string | null;
  pensionFund: string | null;
  emergencyContactName: string | null;
  emergencyContactRelationship: string | null;
  emergencyContactPhone: string | null;
}

export interface PayrollEmployee extends EmployeePersonalData {
  id: string;
  userId: string;
  cargoId: string | null;
  employeeType: EmployeeType;
  monthlySalary: string | null;
  dailyRate: string | null;
  startDate: string;
  contractEndDate: string | null;
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

export interface CreatePayrollEmployeeDto extends Partial<EmployeePersonalData> {
  /** Usuario existente a vincular. Si se omite, se crea un usuario nuevo con `password`. */
  userId?: string;
  /** Contraseña del nuevo usuario del sistema (requerida cuando no hay `userId`). */
  password?: string;
  cargoId?: string;
  employeeType?: EmployeeType;
  monthlySalary?: number;
  dailyRate?: number;
  startDate: string;
  contractEndDate?: string | null;
  contractType?: ContractType;
  status?: EmployeeStatus;
  notes?: string;
}

export interface UpdatePayrollEmployeeDto extends Partial<EmployeePersonalData> {
  cargoId?: string;
  employeeType?: EmployeeType;
  monthlySalary?: number;
  dailyRate?: number;
  startDate?: string;
  contractEndDate?: string | null;
  contractType?: ContractType;
  status?: EmployeeStatus;
  notes?: string;
}
