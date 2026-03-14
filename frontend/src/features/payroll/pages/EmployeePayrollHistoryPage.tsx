import React from 'react';
import {
  Alert,
  Box,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useParams } from 'react-router-dom';
import { PageHeader } from '../../../components/common/PageHeader';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';
import { usePayrollEmployees } from '../hooks/usePayrollEmployees';
import { PATHS } from '../../../router/paths';

const formatCOP = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value));
};

const periodStatusLabel: Record<string, string> = {
  DRAFT: 'Borrador',
  CALCULATED: 'Calculado',
  PAID: 'Pagado',
};

const periodStatusColor: Record<string, 'default' | 'warning' | 'info' | 'success'> = {
  DRAFT: 'default',
  CALCULATED: 'info',
  PAID: 'success',
};

const EmployeePayrollHistoryPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { getEmployeeQuery, getHistoryQuery } = usePayrollEmployees();
  const employeeQuery = getEmployeeQuery(id!);
  const historyQuery = getHistoryQuery(id!);

  if (employeeQuery.isLoading || historyQuery.isLoading) return <LoadingSpinner />;

  const employee = employeeQuery.data;
  const history = historyQuery.data ?? [];

  const fullName = employee
    ? `${employee.user?.firstName ?? ''} ${employee.user?.lastName ?? ''}`.trim()
    : '';

  return (
    <Box>
      <PageHeader
        title={`Historial de Nómina — ${fullName}`}
        subtitle={employee?.cargo?.name ?? ''}
        breadcrumbs={[
          { label: 'Empleados de Nómina', path: PATHS.PAYROLL_EMPLOYEES },
          { label: fullName },
          { label: 'Historial' },
        ]}
      />

      {history.length === 0 ? (
        <Alert severity="info">Este empleado no tiene historial de nómina aún.</Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Periodo</TableCell>
                <TableCell>Fechas</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell align="right">Días</TableCell>
                <TableCell align="right">Salario Base</TableCell>
                <TableCell align="right">Extras</TableCell>
                <TableCell align="right">Descuentos</TableCell>
                <TableCell align="right">Total Pagado</TableCell>
                <TableCell>Observaciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {history.map((item: any) => (
                <TableRow key={item.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {item.period?.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(item.period?.startDate).toLocaleDateString('es-CO')} -{' '}
                      {new Date(item.period?.endDate).toLocaleDateString('es-CO')}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={periodStatusLabel[item.period?.status] ?? item.period?.status}
                      color={periodStatusColor[item.period?.status] ?? 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">{Number(item.daysWorked ?? 0)}</TableCell>
                  <TableCell align="right">{formatCOP(item.baseSalary)}</TableCell>
                  <TableCell align="right">
                    {formatCOP(
                      Number(item.overtimeDaytimeValue ?? 0) +
                        Number(item.overtimeNighttimeValue ?? 0),
                    )}
                  </TableCell>
                  <TableCell align="right">
                    {formatCOP(
                      Number(item.workdayDiscount ?? 0) +
                        Number(item.loans ?? 0) +
                        Number(item.advances ?? 0) +
                        Number(item.nonPaidDays ?? 0) +
                        Number(item.epsAndPensionDiscount ?? 0),
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Typography fontWeight="bold" color="success.main">
                      {formatCOP(item.totalPayment)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {item.observations ?? '—'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default EmployeePayrollHistoryPage;
