import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PayrollPeriodsRepository } from './payroll-periods.repository';
import { PayrollItemsRepository } from '../items/payroll-items.repository';
import { PayrollEmployeesRepository } from '../employees/payroll-employees.repository';
import { CreatePayrollPeriodDto } from './dto/create-payroll-period.dto';
import { UpdatePayrollPeriodDto } from './dto/update-payroll-period.dto';

@Injectable()
export class PayrollPeriodsService {
  constructor(
    private readonly periodsRepository: PayrollPeriodsRepository,
    private readonly itemsRepository: PayrollItemsRepository,
    private readonly employeesRepository: PayrollEmployeesRepository,
  ) {}

  async findAll() {
    return this.periodsRepository.findAll();
  }

  async findOne(id: string) {
    const period = await this.periodsRepository.findById(id);
    if (!period) {
      throw new NotFoundException(`Periodo de nómina con ID ${id} no encontrado`);
    }
    return period;
  }

  async create(dto: CreatePayrollPeriodDto) {
    if (new Date(dto.startDate) >= new Date(dto.endDate)) {
      throw new BadRequestException('La fecha de inicio debe ser anterior a la fecha de fin');
    }

    return this.periodsRepository.create({
      name: dto.name,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      periodType: dto.periodType,
      overtimeDaytimeRate: dto.overtimeDaytimeRate,
      overtimeNighttimeRate: dto.overtimeNighttimeRate,
      notes: dto.notes,
    });
  }

  async update(id: string, dto: UpdatePayrollPeriodDto) {
    await this.findOne(id);

    if (dto.startDate && dto.endDate && new Date(dto.startDate) >= new Date(dto.endDate)) {
      throw new BadRequestException('La fecha de inicio debe ser anterior a la fecha de fin');
    }

    return this.periodsRepository.update(id, {
      ...dto,
      ...(dto.startDate && { startDate: new Date(dto.startDate) }),
      ...(dto.endDate && { endDate: new Date(dto.endDate) }),
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.periodsRepository.delete(id);
    return { message: `Periodo de nómina con ID ${id} eliminado` };
  }

  async getSummary(id: string) {
    await this.findOne(id);
    return this.periodsRepository.getSummary(id);
  }

  /**
   * Genera automáticamente registros de nómina para todos los empleados activos
   * que no tengan ya un registro en el periodo. Precarga baseSalary = 0 para
   * que el usuario ingrese los días trabajados.
   */
  async generateItems(periodId: string) {
    await this.findOne(periodId);

    const activeEmployees = await this.employeesRepository.findAll().then(
      (employees) => employees.filter((e) => e.status === 'ACTIVE'),
    );

    const itemsToCreate = activeEmployees.map((employee) => ({
      periodId,
      employeeId: employee.id,
      baseSalary: 0,
      totalPayment: 0,
    }));

    const result = await this.itemsRepository.createMany(itemsToCreate);
    return {
      message: `Se generaron registros para ${result.count} empleado(s) activo(s)`,
      count: result.count,
    };
  }
}
