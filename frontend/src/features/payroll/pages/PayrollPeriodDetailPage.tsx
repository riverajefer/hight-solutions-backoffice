import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Typography,
  Stack,
  Divider,
  Alert,
  Menu,
  MenuItem,
} from '@mui/material';
import { AutoAwesome, Edit, KeyboardArrowDown } from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { PageHeader } from '../../../components/common/PageHeader';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { DataTable } from '../../../components/common/DataTable';
import { usePayrollPeriods } from '../hooks/usePayrollPeriods';
import { usePayrollItems } from '../hooks/usePayrollItems';
import { getItemColumns } from '../config/columns';
import type { PayrollItem } from '../../../types/payroll-item.types';
import { PATHS } from '../../../router/paths';
import { PERMISSIONS } from '../../../utils/constants';
import { useAuthStore } from '../../../store/authStore';

const formatCOP = (value: number | string | null | undefined) => {
  if (value === null || value === undefined) return '$0';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value));
};

const periodStatusColor: Record<string, 'default' | 'warning' | 'info' | 'success'> = {
  DRAFT: 'default',
  CALCULATED: 'info',
  PAID: 'success',
};

const periodStatusLabel: Record<string, string> = {
  DRAFT: 'Borrador',
  CALCULATED: 'Calculado',
  PAID: 'Pagado',
};

const PayrollPeriodDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { hasPermission } = useAuthStore();
  const canEdit = hasPermission(PERMISSIONS.UPDATE_PAYROLL_PERIODS);

  const { getPeriodQuery, getSummaryQuery, generateItemsMutation, updateMutation } = usePayrollPeriods();
  const periodQuery = getPeriodQuery(id!);
  const summaryQuery = getSummaryQuery(id!);
  const { itemsQuery, deleteMutation } = usePayrollItems(id!);

  const [toDelete, setToDelete] = useState<PayrollItem | null>(null);
  const [statusAnchorEl, setStatusAnchorEl] = useState<null | HTMLElement>(null);

  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateMutation.mutateAsync({
        id: id!,
        data: { status: newStatus as any },
      });
      enqueueSnackbar('Estado actualizado', { variant: 'success' });
    } catch {
      enqueueSnackbar('Error al actualizar el estado', { variant: 'error' });
    } finally {
      setStatusAnchorEl(null);
    }
  };

  const handleGenerate = async () => {
    try {
      const result = await generateItemsMutation.mutateAsync(id!);
      enqueueSnackbar(result.message, { variant: 'success' });
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Error al generar registros';
      enqueueSnackbar(msg, { variant: 'error' });
    }
  };

  const handleDeleteItem = async () => {
    if (!toDelete) return;
    try {
      await deleteMutation.mutateAsync(toDelete.id);
      enqueueSnackbar('Registro eliminado', { variant: 'success' });
      setToDelete(null);
    } catch {
      enqueueSnackbar('Error al eliminar registro', { variant: 'error' });
    }
  };

  if (periodQuery.isLoading) return <LoadingSpinner />;

  const period = periodQuery.data;
  if (!period) return <Alert severity="error">Periodo no encontrado</Alert>;

  const items = itemsQuery.data ?? [];
  const summary = summaryQuery.data;

  const columns = getItemColumns(
    (item) =>
      navigate(
        PATHS.PAYROLL_ITEM_EDIT.replace(':periodId', id!).replace(':itemId', item.id),
      ),
    (item) => setToDelete(item),
  );

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      <PageHeader
        title={period.name}
        subtitle={`${new Date(period.startDate).toLocaleDateString('es-CO')} — ${new Date(period.endDate).toLocaleDateString('es-CO')}`}
        breadcrumbs={[
          { label: 'Periodos', path: PATHS.PAYROLL_PERIODS },
          { label: period.name },
        ]}
      />

      {/* Summary cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="body2" color="text.secondary">Estado</Typography>
              <Chip
                label={periodStatusLabel[period.status] ?? period.status}
                color={periodStatusColor[period.status] ?? 'default'}
                sx={{ mt: 0.5, cursor: canEdit ? 'pointer' : 'default' }}
                onClick={canEdit ? (e) => setStatusAnchorEl(e.currentTarget) : undefined}
                onDelete={canEdit ? (e) => setStatusAnchorEl(e.currentTarget) : undefined}
                deleteIcon={canEdit ? <KeyboardArrowDown /> : undefined}
              />
              <Menu
                anchorEl={statusAnchorEl}
                open={Boolean(statusAnchorEl)}
                onClose={() => setStatusAnchorEl(null)}
              >
                <MenuItem onClick={() => handleStatusChange('DRAFT')} disabled={period.status === 'DRAFT' || updateMutation.isPending}>
                  Borrador
                </MenuItem>
                <MenuItem onClick={() => handleStatusChange('CALCULATED')} disabled={period.status === 'CALCULATED' || updateMutation.isPending}>
                  Calculado
                </MenuItem>
                <MenuItem onClick={() => handleStatusChange('PAID')} disabled={period.status === 'PAID' || updateMutation.isPending}>
                  Pagado
                </MenuItem>
              </Menu>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="body2" color="text.secondary">Empleados</Typography>
              <Typography variant="h5" fontWeight="bold">{summary?.employeeCount ?? '—'}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="body2" color="text.secondary">Total a Pagar</Typography>
              <Typography variant="h5" fontWeight="bold" color="success.main">
                {summary ? formatCOP(summary.totalPayment) : '—'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="body2" color="text.secondary">Costo Total (incl. SS)</Typography>
              <Typography variant="h5" fontWeight="bold" color="primary.main">
                {summary ? formatCOP(summary.totalPayrollCost) : '—'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Overtime rates info */}
      {(period.overtimeDaytimeRate || period.overtimeNighttimeRate) && (
        <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Hora extra diurna: <strong>{formatCOP(period.overtimeDaytimeRate)}/h</strong>
          </Typography>
          <Divider orientation="vertical" flexItem />
          <Typography variant="body2" color="text.secondary">
            Hora extra nocturna: <strong>{formatCOP(period.overtimeNighttimeRate)}/h</strong>
          </Typography>
        </Stack>
      )}

      {/* Actions */}
      {canEdit && (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
          <Button
            variant="outlined"
            startIcon={<AutoAwesome />}
            onClick={handleGenerate}
            disabled={generateItemsMutation.isPending}
          >
            {generateItemsMutation.isPending ? 'Generando...' : 'Generar para todos los activos'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<Edit />}
            onClick={() => navigate(PATHS.PAYROLL_PERIODS_EDIT.replace(':id', id!))}
          >
            Editar Periodo
          </Button>
        </Stack>
      )}

      {/* Items table */}
      <DataTable
        rows={items}
        columns={columns}
        loading={itemsQuery.isLoading}
        onAdd={canEdit ? () => navigate(PATHS.PAYROLL_ITEM_EDIT.replace(':periodId', id!).replace(':itemId', 'new')) : undefined}
        addButtonText="Agregar Registro"
        searchPlaceholder="Buscar empleado..."
        emptyMessage="No hay registros de nómina. Usa 'Generar para todos los activos' para crearlos automáticamente."
      />

      <ConfirmDialog
        open={!!toDelete}
        title="Eliminar registro de nómina"
        message={`¿Eliminar el registro de ${toDelete?.employee?.user?.firstName} ${toDelete?.employee?.user?.lastName}?`}
        onConfirm={handleDeleteItem}
        onCancel={() => setToDelete(null)}
        isLoading={deleteMutation.isPending}
        confirmText="Eliminar"
        severity="error"
      />
    </Box>
  );
};

export default PayrollPeriodDetailPage;
