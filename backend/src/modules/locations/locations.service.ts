import { Injectable, NotFoundException } from '@nestjs/common';
import { LocationsRepository } from './locations.repository';

@Injectable()
export class LocationsService {
  constructor(private readonly locationsRepository: LocationsRepository) {}

  /**
   * Get all departments with cities count
   */
  async findAllDepartments() {
    const departments = await this.locationsRepository.findAllDepartments();

    return departments.map((dept: any) => ({
      ...dept,
      citiesCount: dept._count.cities,
      _count: undefined,
    }));
  }

  /**
   * Get department by ID with its cities
   */
  async findDepartmentById(id: string) {
    const department = await this.locationsRepository.findDepartmentById(id);

    if (!department) {
      throw new NotFoundException(`Departamento con ID ${id} no encontrado`);
    }

    return department;
  }

  /**
   * Get cities by department ID
   */
  async findCitiesByDepartment(departmentId: string) {
    // Validate department exists
    await this.findDepartmentById(departmentId);

    return this.locationsRepository.findCitiesByDepartment(departmentId);
  }

  /**
   * Validate that a city belongs to a department
   * Used by Clients and Suppliers modules
   */
  async validateCityBelongsToDepartment(cityId: string, departmentId: string): Promise<boolean> {
    return this.locationsRepository.cityBelongsToDepartment(cityId, departmentId);
  }

  /**
   * Get city by ID
   */
  async findCityById(id: string) {
    const city = await this.locationsRepository.findCityById(id);

    if (!city) {
      throw new NotFoundException(`Ciudad con ID ${id} no encontrada`);
    }

    return city;
  }

  /**
   * Find department by name. Returns null if not found (does NOT throw).
   * Used by bulk upload to collect per-row errors.
   */
  async findDepartmentByName(name: string) {
    return this.locationsRepository.findDepartmentByName(name);
  }

  /**
   * Find city by name within a department. Returns null if not found.
   * Used by bulk upload to collect per-row errors.
   */
  async findCityByNameAndDepartment(cityName: string, departmentId: string) {
    return this.locationsRepository.findCityByNameAndDepartment(cityName, departmentId);
  }
}
