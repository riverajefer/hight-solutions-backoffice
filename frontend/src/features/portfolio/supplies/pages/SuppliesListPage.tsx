import React, { useState } from 'react';
import { Box, Chip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { PageHeader } from '../../../../components/common/PageHeader';
import { ConfirmDialog } from '../../../../components/common/ConfirmDialog';
import { DataTable, ActionsCell } from '../../../../components/common/DataTable';
import { useSupplies } from '../hooks/useSupplies';
import { Supply } from '../../../../types/supply.types';
import { ROUTES } from '../../../../utils/constants';

const SuppliesListPage: React.FC = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [confirmDelete, setConfirmDelete] = useState<Supply | null>(null);

  const { suppliesQuery, deleteSupplyMutation } = useSupplies();
  const supplies = suppliesQuery.data || [];

  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return;
    try {
      await deleteSupplyMutation.mutateAsync(confirmDelete.id);
      enqueueSnackbar('Insumo eliminado correctamente', {
        variant: 'success',
      });
      setConfirmDelete(null);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Error al eliminar insumo';
      enqueueSnackbar(message, { variant: 'error' });
    }
  };

  // Define columns for DataTable
  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Nombre',
      flex: 1,
      minWidth: 180,
    },
    {
      field: 'sku',
      headerName: 'SKU',
      width: 120,
    },
    {
      field: 'category',
      headerName: 'Categoría',
      flex: 1,
      minWidth: 150,
      valueGetter: (_value, row) => row.category?.name || 'N/A',
    },
    {
      field: 'purchasePrice',
      headerName: 'Precio Compra',
      width: 130,
      align: 'right',
      headerAlign: 'right',
      valueFormatter: (value) => {
        if (value == null) return 'N/A';
        return new Intl.NumberFormat('es-CO', {
          style: 'currency',
          currency: 'COP',
          minimumFractionDigits: 0,
        }).format(value);
      },
    },
    {
      field: 'purchaseUnit',
      headerName: 'Unidad Compra',
      width: 120,
      valueGetter: (_value, row) => row.purchaseUnit?.abbreviation || 'N/A',
    },
    {
      field: 'currentStock',
      headerName: 'Stock Actual',
      width: 110,
      align: 'right',
      headerAlign: 'right',
      valueFormatter: (value) => {
        if (value == null) return '0';
        return new Intl.NumberFormat('es-CO').format(value);
      },
    },
    {
      field: 'minimumStock',
      headerName: 'Stock Mínimo',
      width: 120,
      align: 'right',
      headerAlign: 'right',
      valueFormatter: (value) => {
        if (value == null) return '0';
        return new Intl.NumberFormat('es-CO').format(value);
      },
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
      renderCell: (params: GridRenderCellParams<Supply>) => (
        <ActionsCell
          onEdit={() => navigate(`${ROUTES.SUPPLIES}/${params.row.id}/edit`)}
          onDelete={() => setConfirmDelete(params.row)}
        />
      ),
    },
  ];

  return (
    <Box>
      <PageHeader
        title="Insumos"
        subtitle="Gestiona los insumos del sistema"
      />

      <DataTable
        rows={supplies}
        columns={columns}
        loading={suppliesQuery.isLoading}
        onAdd={() => navigate(`${ROUTES.SUPPLIES}/new`)}
        addButtonText="Nuevo Insumo"
        searchPlaceholder="Buscar insumos..."
      />

      <ConfirmDialog
        open={!!confirmDelete}
        title="Eliminar Insumo"
        message={`¿Estás seguro de que deseas eliminar el insumo "${confirmDelete?.name}"?`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmDelete(null)}
        isLoading={deleteSupplyMutation.isPending}
        confirmText="Eliminar"
        severity="error"
      />
    </Box>
  );
};

export default SuppliesListPage;
