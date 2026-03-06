import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Prisma } from '../../../generated/prisma';

const periodSelect = {
  id: true,
  name: true,
  startDate: true,
  endDate: true,
  periodType: true,
  status: true,
  overtimeDaytimeRate: true,
  overtimeNighttimeRate: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class PayrollPeriodsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.payrollPeriod.findMany({
      select: periodSelect,
      orderBy: { startDate: 'desc' },
    });
  }

  async findById(id: string) {
    return this.prisma.payrollPeriod.findUnique({
      where: { id },
      select: {
        ...periodSelect,
        payrollItems: {
          select: {
            id: true,
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
                cargo: { select: { id: true, name: true } },
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
              },
            },
          },
          orderBy: { employee: { user: { firstName: 'asc' } } },
        },
      },
    });
  }

  async create(data: Prisma.PayrollPeriodCreateInput) {
    return this.prisma.payrollPeriod.create({
      data,
      select: periodSelect,
    });
  }

  async update(id: string, data: Prisma.PayrollPeriodUpdateInput) {
    return this.prisma.payrollPeriod.update({
      where: { id },
      data,
      select: periodSelect,
    });
  }

  async delete(id: string) {
    return this.prisma.payrollPeriod.delete({ where: { id } });
  }

  async getSummary(id: string) {
    const items = await this.prisma.payrollItem.findMany({
      where: { periodId: id },
      select: { totalPayment: true, baseSalary: true, epsAndPensionDiscount: true },
    });

    const totalPayment = items.reduce(
      (acc, item) => acc + Number(item.totalPayment),
      0,
    );
    const totalBaseSalary = items.reduce(
      (acc, item) => acc + Number(item.baseSalary),
      0,
    );
    const totalEpsAndPension = items.reduce(
      (acc, item) => acc + Number(item.epsAndPensionDiscount ?? 0),
      0,
    );

    return {
      employeeCount: items.length,
      totalBaseSalary,
      totalPayment,
      totalEpsAndPension,
      totalPayrollCost: totalPayment + totalEpsAndPension,
    };
  }
}
