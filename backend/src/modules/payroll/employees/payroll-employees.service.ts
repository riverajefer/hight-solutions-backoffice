import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PayrollEmployeesRepository } from './payroll-employees.repository';
import { CreatePayrollEmployeeDto, EmployeeType } from './dto/create-payroll-employee.dto';
import { UpdatePayrollEmployeeDto } from './dto/update-payroll-employee.dto';
import { UsersRepository } from '../../users/users.repository';

@Injectable()
export class PayrollEmployeesService {
  constructor(
    private readonly employeesRepository: PayrollEmployeesRepository,
    private readonly usersRepository: UsersRepository,
  ) {}

  async findAll() {
    return this.employeesRepository.findAll();
  }

  async findOne(id: string) {
    const employee = await this.employeesRepository.findById(id);
    if (!employee) {
      throw new NotFoundException(`Empleado de nómina con ID ${id} no encontrado`);
    }
    return employee;
  }

  async create(dto: CreatePayrollEmployeeDto) {
    // Verificar que el usuario existe
    const user = await this.usersRepository.findById(dto.userId);
    if (!user) {
      throw new BadRequestException(`Usuario con ID ${dto.userId} no encontrado`);
    }

    // Verificar que el usuario no está ya en nómina
    const existing = await this.employeesRepository.findByUserId(dto.userId);
    if (existing) {
      throw new BadRequestException('Este usuario ya está registrado en nómina');
    }

    // Validar salario según tipo de empleado
    if (dto.employeeType === EmployeeType.REGULAR && !dto.monthlySalary) {
      throw new BadRequestException('Los empleados regulares requieren salario mensual');
    }
    if (dto.employeeType === EmployeeType.TEMPORARY && !dto.dailyRate) {
      throw new BadRequestException('Los empleados temporales requieren tarifa diaria');
    }

    return this.employeesRepository.create({
      employeeType: dto.employeeType ?? EmployeeType.REGULAR,
      monthlySalary: dto.monthlySalary,
      dailyRate: dto.dailyRate,
      jobTitle: dto.jobTitle,
      startDate: new Date(dto.startDate),
      contractType: dto.contractType,
      notes: dto.notes,
      user: { connect: { id: dto.userId } },
    });
  }

  async update(id: string, dto: UpdatePayrollEmployeeDto) {
    await this.findOne(id);
    return this.employeesRepository.update(id, {
      ...dto,
      ...(dto.startDate && { startDate: new Date(dto.startDate) }),
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.employeesRepository.delete(id);
    return { message: `Empleado de nómina con ID ${id} eliminado` };
  }

  async getHistory(id: string) {
    await this.findOne(id);
    return this.employeesRepository.findHistory(id);
  }
}
