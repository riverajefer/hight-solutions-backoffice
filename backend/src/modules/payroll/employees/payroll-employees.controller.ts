import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PayrollEmployeesService } from './payroll-employees.service';
import { CreatePayrollEmployeeDto } from './dto/create-payroll-employee.dto';
import { UpdatePayrollEmployeeDto } from './dto/update-payroll-employee.dto';
import { JwtAuthGuard } from '../../auth/guards';
import { PermissionsGuard } from '../../../common/guards';
import { RequirePermissions } from '../../../common/decorators';

@ApiTags('payroll-employees')
@ApiBearerAuth('JWT-auth')
@Controller('payroll/employees')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PayrollEmployeesController {
  constructor(private readonly service: PayrollEmployeesService) {}

  @Get()
  @RequirePermissions('read_payroll_employees')
  @ApiOperation({ summary: 'Listar todos los empleados de nómina' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @RequirePermissions('read_payroll_employees')
  @ApiOperation({ summary: 'Obtener un empleado de nómina por ID' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Get(':id/history')
  @RequirePermissions('read_payroll_employees')
  @ApiOperation({ summary: 'Obtener historial de nómina de un empleado' })
  getHistory(@Param('id') id: string) {
    return this.service.getHistory(id);
  }

  @Post()
  @RequirePermissions('create_payroll_employees')
  @ApiOperation({ summary: 'Agregar un usuario a nómina' })
  create(@Body() dto: CreatePayrollEmployeeDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @RequirePermissions('update_payroll_employees')
  @ApiOperation({ summary: 'Actualizar datos de un empleado de nómina' })
  update(@Param('id') id: string, @Body() dto: UpdatePayrollEmployeeDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('delete_payroll_employees')
  @ApiOperation({ summary: 'Eliminar un empleado de nómina' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
