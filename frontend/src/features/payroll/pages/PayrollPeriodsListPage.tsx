import React, { useState } from 'react';
import { Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { PageHeader } from '../../../components/common/PageHeader';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { DataTable } from '../../../components/common/DataTable';
import { usePayrollPeriods } from '../hooks/usePayrollPeriods';
import { getPeriodColumns } from '../config/columns';
import type { PayrollPeriod } from '../../../types/payroll-period.types';
import { PATHS } from '../../../router/paths';
import { PERMISSIONS } from '../../../utils/constants';
import { useAuthStore } from '../../../store/authStore';
import { useResponsiveColumns } from '../../../hooks';

const PayrollPeriodsListPage: React.FC = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { hasPermission } = useAuthStore();
  const [toDelete, setToDelete] = useState<PayrollPeriod | null>(null);
  const { periodsQuery, deleteMutation } = usePayrollPeriods();
  const periods = periodsQuery.data ?? [];

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteMutation.mutateAsync(toDelete.id);
      enqueueSnackbar('Periodo eliminado', { variant: 'success' });
      setToDelete(null);
    } catch {
      enqueueSnackbar('Error al eliminar periodo', { variant: 'error' });
    }
  };

  const rawColumns = getPeriodColumns(
    (p) => navigate(PATHS.PAYROLL_PERIODS_DETAIL.replace(':id', p.id)),
    (p) => navigate(PATHS.PAYROLL_PERIODS_EDIT.replace(':id', p.id)),
    (p) => setToDelete(p),
  );

  const columns = useResponsiveColumns(rawColumns);

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      <PageHeader
        title="Periodos de Nómina"
        subtitle="Gestiona los periodos quincenales y mensuales"
      />

      <DataTable
        rows={periods}
        columns={columns}
        loading={periodsQuery.isLoading}
        onAdd={hasPermission(PERMISSIONS.CREATE_PAYROLL_PERIODS) ? () => navigate(PATHS.PAYROLL_PERIODS_CREATE) : undefined}
        addButtonText="Crear Periodo"
        searchPlaceholder="Buscar periodo..."
        emptyMessage="No hay periodos de nómina registrados"
      />

      <ConfirmDialog
        open={!!toDelete}
        title="Eliminar Periodo"
        message={`¿Eliminar el periodo "${toDelete?.name}"? Esta acción eliminará todos los registros de nómina del periodo.`}
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
        isLoading={deleteMutation.isPending}
        confirmText="Eliminar"
        severity="error"
      />
    </Box>
  );
};

export default PayrollPeriodsListPage;
