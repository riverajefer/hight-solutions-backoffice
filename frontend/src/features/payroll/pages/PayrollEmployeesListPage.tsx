import React, { useState } from 'react';
import { Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { PageHeader } from '../../../components/common/PageHeader';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { DataTable } from '../../../components/common/DataTable';
import { usePayrollEmployees } from '../hooks/usePayrollEmployees';
import { getEmployeeColumns } from '../config/columns';
import type { PayrollEmployee } from '../../../types/payroll-employee.types';
import { PATHS } from '../../../router/paths';
import { PERMISSIONS } from '../../../utils/constants';
import { useAuthStore } from '../../../store/authStore';
import { useResponsiveColumns } from '../../../hooks';

const PayrollEmployeesListPage: React.FC = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { hasPermission } = useAuthStore();

  const [toDelete, setToDelete] = useState<PayrollEmployee | null>(null);
  const { employeesQuery, deleteMutation } = usePayrollEmployees();
  const employees = employeesQuery.data ?? [];

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteMutation.mutateAsync(toDelete.id);
      enqueueSnackbar('Empleado eliminado de nómina', { variant: 'success' });
      setToDelete(null);
    } catch {
      enqueueSnackbar('Error al eliminar empleado', { variant: 'error' });
    }
  };

  const rawColumns = getEmployeeColumns(
    (e) => navigate(PATHS.PAYROLL_EMPLOYEES_EDIT.replace(':id', e.id)),
    (e) => setToDelete(e),
    (e) => navigate(PATHS.PAYROLL_EMPLOYEES_HISTORY.replace(':id', e.id)),
  );

  const columns = useResponsiveColumns(rawColumns);

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      <PageHeader
        title="Empleados de Nómina"
        subtitle="Usuarios vinculados al sistema de nómina"
      />

      <DataTable
        rows={employees}
        columns={columns}
        loading={employeesQuery.isLoading}
        onAdd={hasPermission(PERMISSIONS.CREATE_PAYROLL_EMPLOYEES) ? () => navigate(PATHS.PAYROLL_EMPLOYEES_CREATE) : undefined}
        addButtonText="Agregar Empleado"
        searchPlaceholder="Buscar empleado..."
        emptyMessage="No hay empleados registrados en nómina"
      />

      <ConfirmDialog
        open={!!toDelete}
        title="Eliminar de nómina"
        message={`¿Eliminar a ${toDelete?.user?.firstName} ${toDelete?.user?.lastName} de la nómina?`}
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
        isLoading={deleteMutation.isPending}
        confirmText="Eliminar"
        severity="error"
      />
    </Box>
  );
};

export default PayrollEmployeesListPage;
