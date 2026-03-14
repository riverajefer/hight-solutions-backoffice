import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Prisma } from '../../../generated/prisma';

const itemSelect = {
  id: true,
  periodId: true,
  employeeId: true,
  daysWorked: true,
  baseSalary: true,
  overtimeDaytimeHours: true,
  overtimeNighttimeHours: true,
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
  updatedAt: true,
  employee: {
    select: {
      id: true,
      employeeType: true,
      monthlySalary: true,
      dailyRate: true,
      cargo: { select: { name: true } },
      user: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
  },
};

@Injectable()
export class PayrollItemsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByPeriod(periodId: string) {
    return this.prisma.payrollItem.findMany({
      where: { periodId },
      select: itemSelect,
      orderBy: { employee: { user: { firstName: 'asc' } } },
    });
  }

  async findById(id: string) {
    return this.prisma.payrollItem.findUnique({
      where: { id },
      select: itemSelect,
    });
  }

  async findByPeriodAndEmployee(periodId: string, employeeId: string) {
    return this.prisma.payrollItem.findUnique({
      where: { periodId_employeeId: { periodId, employeeId } },
      select: itemSelect,
    });
  }

  async create(data: Prisma.PayrollItemCreateInput) {
    return this.prisma.payrollItem.create({
      data,
      select: itemSelect,
    });
  }

  async update(id: string, data: Prisma.PayrollItemUpdateInput) {
    return this.prisma.payrollItem.update({
      where: { id },
      data,
      select: itemSelect,
    });
  }

  async delete(id: string) {
    return this.prisma.payrollItem.delete({ where: { id } });
  }

  async createMany(items: Prisma.PayrollItemCreateManyInput[]) {
    return this.prisma.payrollItem.createMany({ data: items, skipDuplicates: true });
  }
}
