import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Prisma } from '../../../generated/prisma';

const employeeSelect = {
  id: true,
  userId: true,
  cargoId: true,
  employeeType: true,
  monthlySalary: true,
  dailyRate: true,
  startDate: true,
  contractType: true,
  status: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  cargo: {
    select: { id: true, name: true },
  },
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      isActive: true,
    },
  },
};

@Injectable()
export class PayrollEmployeesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.employee.findMany({
      select: employeeSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    return this.prisma.employee.findUnique({
      where: { id },
      select: employeeSelect,
    });
  }

  async findByUserId(userId: string) {
    return this.prisma.employee.findUnique({
      where: { userId },
      select: employeeSelect,
    });
  }

  async create(data: Prisma.EmployeeCreateInput) {
    return this.prisma.employee.create({
      data,
      select: employeeSelect,
    });
  }

  async update(id: string, data: Prisma.EmployeeUpdateInput) {
    return this.prisma.employee.update({
      where: { id },
      data,
      select: employeeSelect,
    });
  }

  async delete(id: string) {
    return this.prisma.employee.delete({ where: { id } });
  }

  async findHistory(employeeId: string) {
    return this.prisma.payrollItem.findMany({
      where: { employeeId },
      select: {
        id: true,
        daysWorked: true,
        baseSalary: true,
        overtimeDaytimeValue: true,
        overtimeNighttimeValue: true,
        commissions: true,
        restDayValue: true,
        transportAllowance: true,
        workdayDiscount: true,
        loans: true,
        advances: true,
        nonPaidDays: true,
        epsAndPensionDiscount: true,
        totalPayment: true,
        observations: true,
        createdAt: true,
        period: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
            periodType: true,
            status: true,
          },
        },
      },
      orderBy: { period: { startDate: 'desc' } },
    });
  }
}
