import React, { useState, useMemo } from 'react';
import { Box, Chip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { GridRenderCellParams } from '@mui/x-data-grid';
import { PageHeader } from '../../../components/common/PageHeader';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { DataTable, ActionsCell } from '../../../components/common/DataTable';
import { useExpenseTypes } from '../hooks/useExpenseTypes';
import { ExpenseType } from '../../../types/expense-type.types';
import { ROUTES } from '../../../utils/constants';
import { useResponsiveColumns, type ResponsiveGridColDef } from '../../../hooks';

const ExpenseTypesListPage: React.FC = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [confirmDelete, setConfirmDelete] = useState<ExpenseType | null>(null);

  const { expenseTypesQuery, deleteExpenseTypeMutation } = useExpenseTypes();
  const expenseTypes = expenseTypesQuery.data || [];

  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return;
    try {
      await deleteExpenseTypeMutation.mutateAsync(confirmDelete.id);
      enqueueSnackbar('Tipo de gasto eliminado correctamente', { variant: 'success' });
      setConfirmDelete(null);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Error al eliminar tipo de gasto';
      enqueueSnackbar(message, { variant: 'error' });
    }
  };

  const rawColumns: ResponsiveGridColDef<ExpenseType>[] = useMemo(
    () => [
      {
        field: 'name',
        headerName: 'Nombre',
        flex: 1,
        minWidth: 180,
      },
      {
        field: 'description',
        headerName: 'Descripción',
        flex: 2,
        minWidth: 200,
        responsive: 'md',
      },
      {
        field: 'subcategories',
        headerName: 'Subcategorías',
        width: 130,
        align: 'center',
        headerAlign: 'center',
        responsive: 'sm',
        renderCell: (params: GridRenderCellParams<ExpenseType>) => (
          <Chip
            label={params.row.subcategories?.length ?? 0}
            size="small"
            color="info"
            variant="outlined"
          />
        ),
      },
      {
        field: 'isActive',
        headerName: 'Estado',
        width: 100,
        align: 'center',
        headerAlign: 'center',
        renderCell: (params: GridRenderCellParams) => (
          <Chip
            label={params.value ? 'Activo' : 'Inactivo'}
            size="small"
            color={params.value ? 'success' : 'default'}
          />
        ),
      },
      {
        field: 'actions',
        headerName: 'Acciones',
        width: 120,
        sortable: false,
        filterable: false,
        renderCell: (params: GridRenderCellParams<ExpenseType>) => (
          <ActionsCell
            onEdit={() =>
              navigate(`${ROUTES.EXPENSE_TYPES}/${params.row.id}/edit`)
            }
            onDelete={() => setConfirmDelete(params.row)}
          />
        ),
      },
    ],
    [navigate]
  );

  const columns = useResponsiveColumns(rawColumns);

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      <PageHeader
        title="Tipos de Gasto"
        subtitle="Gestiona los tipos de gasto del sistema"
      />

      <DataTable
        rows={expenseTypes}
        columns={columns}
        loading={expenseTypesQuery.isLoading}
        onAdd={() => navigate(`${ROUTES.EXPENSE_TYPES}/new`)}
        addButtonText="Nuevo Tipo de Gasto"
        searchPlaceholder="Buscar tipos de gasto..."
      />

      <ConfirmDialog
        open={!!confirmDelete}
        title="Eliminar Tipo de Gasto"
        message={`¿Estás seguro de que deseas eliminar el tipo de gasto "${confirmDelete?.name}"? También se desactivarán sus subcategorías.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmDelete(null)}
        isLoading={deleteExpenseTypeMutation.isPending}
        confirmText="Eliminar"
        severity="error"
      />
    </Box>
  );
};

export default ExpenseTypesListPage;
