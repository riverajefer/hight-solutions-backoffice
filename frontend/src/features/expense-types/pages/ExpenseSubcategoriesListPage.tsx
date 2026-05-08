import React, { useState, useMemo } from 'react';
import { Box, Chip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { GridRenderCellParams } from '@mui/x-data-grid';
import { PageHeader } from '../../../components/common/PageHeader';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { DataTable, ActionsCell } from '../../../components/common/DataTable';
import { useExpenseSubcategories } from '../hooks/useExpenseTypes';
import { ExpenseSubcategory } from '../../../types/expense-type.types';
import { ROUTES } from '../../../utils/constants';
import { useResponsiveColumns, type ResponsiveGridColDef } from '../../../hooks';

const ExpenseSubcategoriesListPage: React.FC = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [confirmDelete, setConfirmDelete] = useState<ExpenseSubcategory | null>(null);

  const { expenseSubcategoriesQuery, deleteExpenseSubcategoryMutation } =
    useExpenseSubcategories();
  const subcategories = expenseSubcategoriesQuery.data || [];

  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return;
    try {
      await deleteExpenseSubcategoryMutation.mutateAsync(confirmDelete.id);
      enqueueSnackbar('Subcategoría eliminada correctamente', { variant: 'success' });
      setConfirmDelete(null);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Error al eliminar subcategoría';
      enqueueSnackbar(message, { variant: 'error' });
    }
  };

  const rawColumns: ResponsiveGridColDef<ExpenseSubcategory>[] = useMemo(
    () => [
      {
        field: 'name',
        headerName: 'Nombre',
        flex: 1,
        minWidth: 180,
      },
      {
        field: 'expenseTypeId',
        headerName: 'Tipo de Gasto',
        flex: 1,
        minWidth: 150,
        responsive: 'sm',
        renderCell: (params: GridRenderCellParams<ExpenseSubcategory>) => {
          const sub = params.row as ExpenseSubcategory & { expenseType?: { name: string } };
          return sub.expenseType?.name ?? params.row.expenseTypeId;
        },
      },
      {
        field: 'description',
        headerName: 'Descripción',
        flex: 2,
        minWidth: 200,
        responsive: 'md',
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
        renderCell: (params: GridRenderCellParams<ExpenseSubcategory>) => (
          <ActionsCell
            onEdit={() =>
              navigate(`${ROUTES.EXPENSE_SUBCATEGORIES}/${params.row.id}/edit`)
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
        title="Subcategorías de Gasto"
        subtitle="Gestiona las subcategorías de gasto del sistema"
      />

      <DataTable
        rows={subcategories}
        columns={columns}
        loading={expenseSubcategoriesQuery.isLoading}
        onAdd={() => navigate(`${ROUTES.EXPENSE_SUBCATEGORIES}/new`)}
        addButtonText="Nueva Subcategoría"
        searchPlaceholder="Buscar subcategorías..."
      />

      <ConfirmDialog
        open={!!confirmDelete}
        title="Eliminar Subcategoría"
        message={`¿Estás seguro de que deseas eliminar la subcategoría "${confirmDelete?.name}"?`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmDelete(null)}
        isLoading={deleteExpenseSubcategoryMutation.isPending}
        confirmText="Eliminar"
        severity="error"
      />
    </Box>
  );
};

export default ExpenseSubcategoriesListPage;
