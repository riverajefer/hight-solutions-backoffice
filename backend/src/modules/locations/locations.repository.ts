import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class LocationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find all departments ordered by name
   */
  async findAllDepartments() {
    return this.prisma.department.findMany({
      select: {
        id: true,
        name: true,
        code: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            cities: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Find department by ID with its cities
   */
  async findDepartmentById(id: string) {
    return this.prisma.department.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        code: true,
        createdAt: true,
        updatedAt: true,
        cities: {
          select: {
            id: true,
            name: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { name: 'asc' },
        },
      },
    });
  }

  /**
   * Find cities by department ID
   */
  async findCitiesByDepartment(departmentId: string) {
    return this.prisma.city.findMany({
      where: { departmentId },
      select: {
        id: true,
        name: true,
        departmentId: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Find city by ID
   */
  async findCityById(id: string) {
    return this.prisma.city.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        departmentId: true,
        createdAt: true,
        updatedAt: true,
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });
  }

  /**
   * Check if city belongs to department
   */
  async cityBelongsToDepartment(cityId: string, departmentId: string): Promise<boolean> {
    const city = await this.prisma.city.findFirst({
      where: {
        id: cityId,
        departmentId: departmentId,
      },
    });
    return !!city;
  }

  /**
   * Find department by name (case-insensitive)
   */
  async findDepartmentByName(name: string) {
    return this.prisma.department.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
      select: { id: true, name: true },
    });
  }

  /**
   * Find city by name within a specific department (case-insensitive)
   */
  async findCityByNameAndDepartment(cityName: string, departmentId: string) {
    return this.prisma.city.findFirst({
      where: {
        name: { equals: cityName, mode: 'insensitive' },
        departmentId,
      },
      select: { id: true, name: true },
    });
  }
}
