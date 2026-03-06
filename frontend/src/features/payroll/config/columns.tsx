import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { Chip, IconButton, Box, Tooltip } from '@mui/material';
import { Edit, Delete, History, Visibility } from '@mui/icons-material';
import type { PayrollEmployee } from '../../../types/payroll-employee.types';
import type { PayrollPeriod } from '../../../types/payroll-period.types';
import type { PayrollItem } from '../../../types/payroll-item.types';

const formatCOP = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value));
};

const employeeTypeLabel: Record<string, string> = {
  REGULAR: 'Regular',
  TEMPORARY: 'Temporal',
};

const statusLabel: Record<string, { label: string; color: 'success' | 'default' }> = {
  ACTIVE: { label: 'Activo', color: 'success' },
  INACTIVE: { label: 'Inactivo', color: 'default' },
};

const periodStatusLabel: Record<string, { label: string; color: 'default' | 'warning' | 'info' | 'success' }> = {
  DRAFT: { label: 'Borrador', color: 'default' },
  CALCULATED: { label: 'Calculado', color: 'info' },
  PAID: { label: 'Pagado', color: 'success' },
};

const periodTypeLabel: Record<string, string> = {
  BIWEEKLY: 'Quincenal',
  MONTHLY: 'Mensual',
};

export const getEmployeeColumns = (
  onEdit: (e: PayrollEmployee) => void,
  onDelete: (e: PayrollEmployee) => void,
  onHistory: (e: PayrollEmployee) => void,
): GridColDef[] => [
  {
    field: 'fullName',
    headerName: 'Empleado',
    flex: 1.5,
    minWidth: 160,
    valueGetter: (_value: unknown, row: PayrollEmployee) =>
      `${row.user?.firstName ?? ''} ${row.user?.lastName ?? ''}`.trim(),
  },
  {
    field: 'cargo',
    headerName: 'Cargo',
    flex: 1,
    minWidth: 120,
    valueGetter: (_value: unknown, row: PayrollEmployee) => row.cargo?.name ?? '—',
  },
  {
    field: 'employeeType',
    headerName: 'Tipo',
    width: 110,
    renderCell: (params: GridRenderCellParams<PayrollEmployee>) => (
      <Chip
        label={employeeTypeLabel[params.row.employeeType] ?? params.row.employeeType}
        size="small"
        color={params.row.employeeType === 'REGULAR' ? 'primary' : 'secondary'}
        variant="outlined"
      />
    ),
  },
  {
    field: 'salary',
    headerName: 'Salario / Tarifa',
    flex: 1,
    minWidth: 130,
    valueGetter: (_value: unknown, row: PayrollEmployee) =>
      row.employeeType === 'REGULAR'
        ? formatCOP(row.monthlySalary)
        : `${formatCOP(row.dailyRate)}/día`,
  },
  {
    field: 'status',
    headerName: 'Estado',
    width: 100,
    renderCell: (params: GridRenderCellParams<PayrollEmployee>) => {
      const s = statusLabel[params.row.status] ?? { label: params.row.status, color: 'default' as const };
      return <Chip label={s.label} size="small" color={s.color} />;
    },
  },
  {
    field: 'startDate',
    headerName: 'Fecha Ingreso',
    width: 130,
    valueGetter: (_value: unknown, row: PayrollEmployee) =>
      new Date(row.startDate).toLocaleDateString('es-CO'),
  },
  {
    field: 'actions',
    headerName: 'Acciones',
    width: 130,
    sortable: false,
    renderCell: (params: GridRenderCellParams<PayrollEmployee>) => (
      <Box>
        <Tooltip title="Editar">
          <IconButton size="small" onClick={() => onEdit(params.row)}>
            <Edit fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Historial de nómina">
          <IconButton size="small" onClick={() => onHistory(params.row)}>
            <History fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Eliminar">
          <IconButton size="small" color="error" onClick={() => onDelete(params.row)}>
            <Delete fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    ),
  },
];

export const getPeriodColumns = (
  onView: (p: PayrollPeriod) => void,
  onEdit: (p: PayrollPeriod) => void,
  onDelete: (p: PayrollPeriod) => void,
): GridColDef[] => [
  { field: 'name', headerName: 'Periodo', flex: 1.5, minWidth: 160 },
  {
    field: 'periodType',
    headerName: 'Tipo',
    width: 110,
    valueGetter: (_value: unknown, row: PayrollPeriod) =>
      periodTypeLabel[row.periodType] ?? row.periodType,
  },
  {
    field: 'startDate',
    headerName: 'Inicio',
    width: 110,
    valueGetter: (_value: unknown, row: PayrollPeriod) =>
      new Date(row.startDate).toLocaleDateString('es-CO'),
  },
  {
    field: 'endDate',
    headerName: 'Fin',
    width: 110,
    valueGetter: (_value: unknown, row: PayrollPeriod) =>
      new Date(row.endDate).toLocaleDateString('es-CO'),
  },
  {
    field: 'status',
    headerName: 'Estado',
    width: 120,
    renderCell: (params: GridRenderCellParams<PayrollPeriod>) => {
      const s = periodStatusLabel[params.row.status] ?? { label: params.row.status, color: 'default' as const };
      return <Chip label={s.label} size="small" color={s.color} />;
    },
  },
  {
    field: 'actions',
    headerName: 'Acciones',
    width: 130,
    sortable: false,
    renderCell: (params: GridRenderCellParams<PayrollPeriod>) => (
      <Box>
        <Tooltip title="Ver detalle">
          <IconButton size="small" onClick={() => onView(params.row)}>
            <Visibility fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Editar">
          <IconButton size="small" onClick={() => onEdit(params.row)}>
            <Edit fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Eliminar">
          <IconButton size="small" color="error" onClick={() => onDelete(params.row)}>
            <Delete fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    ),
  },
];

export const getItemColumns = (
  onEdit: (item: PayrollItem) => void,
  onDelete: (item: PayrollItem) => void,
): GridColDef[] => [
  {
    field: 'employeeName',
    headerName: 'Empleado',
    flex: 1.5,
    minWidth: 160,
    valueGetter: (_value: unknown, row: PayrollItem) =>
      `${row.employee?.user?.firstName ?? ''} ${row.employee?.user?.lastName ?? ''}`.trim(),
  },
  {
    field: 'daysWorked',
    headerName: 'Días',
    width: 70,
    type: 'number',
    valueGetter: (_value: unknown, row: PayrollItem) => Number(row.daysWorked ?? 0),
  },
  {
    field: 'baseSalary',
    headerName: 'Salario Base',
    width: 140,
    valueGetter: (_value: unknown, row: PayrollItem) => formatCOP(row.baseSalary),
  },
  {
    field: 'overtimeTotal',
    headerName: 'Extras',
    width: 120,
    valueGetter: (_value: unknown, row: PayrollItem) =>
      formatCOP(
        Number(row.overtimeDaytimeValue ?? 0) + Number(row.overtimeNighttimeValue ?? 0),
      ),
  },
  {
    field: 'discounts',
    headerName: 'Descuentos',
    width: 130,
    valueGetter: (_value: unknown, row: PayrollItem) =>
      formatCOP(
        Number(row.workdayDiscount ?? 0) +
          Number(row.loans ?? 0) +
          Number(row.advances ?? 0) +
          Number(row.nonPaidDays ?? 0) +
          Number(row.epsAndPensionDiscount ?? 0),
      ),
  },
  {
    field: 'totalPayment',
    headerName: 'Total a Pagar',
    width: 140,
    valueGetter: (_value: unknown, row: PayrollItem) => formatCOP(row.totalPayment),
  },
  {
    field: 'observations',
    headerName: 'Observaciones',
    flex: 1,
    minWidth: 120,
    valueGetter: (_value: unknown, row: PayrollItem) => row.observations ?? '—',
  },
  {
    field: 'actions',
    headerName: 'Acciones',
    width: 100,
    sortable: false,
    renderCell: (params: GridRenderCellParams<PayrollItem>) => (
      <Box>
        <Tooltip title="Editar registro">
          <IconButton size="small" onClick={() => onEdit(params.row)}>
            <Edit fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Eliminar">
          <IconButton size="small" color="error" onClick={() => onDelete(params.row)}>
            <Delete fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    ),
  },
];
