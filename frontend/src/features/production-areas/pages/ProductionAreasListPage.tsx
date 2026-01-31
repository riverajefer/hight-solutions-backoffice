import React, { useState } from 'react';
import { Box, Chip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { PageHeader } from '../../../components/common/PageHeader';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { DataTable, ActionsCell } from '../../../components/common/DataTable';
import { useProductionAreas } from '../hooks/useProductionAreas';
import { ProductionArea } from '../../../types';

const ProductionAreasListPage: React.FC = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [confirmDelete, setConfirmDelete] = useState<ProductionArea | null>(null);

  const { productionAreasQuery, deleteProductionAreaMutation } = useProductionAreas();
  const productionAreas = productionAreasQuery.data || [];

  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return;

    try {
      await deleteProductionAreaMutation.mutateAsync(confirmDelete.id);
      enqueueSnackbar('Área de producción eliminada correctamente', { variant: 'success' });
      setConfirmDelete(null);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al eliminar área de producción';
      enqueueSnackbar(message, { variant: 'error' });
    }
  };

  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Nombre',
      flex: 1,
      minWidth: 200,
    },
    {
      field: 'description',
      headerName: 'Descripción',
      flex: 2,
      minWidth: 300,
    },
    {
      field: 'isActive',
      headerName: 'Estado',
      width: 120,
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
      renderCell: (params: GridRenderCellParams<ProductionArea>) => (
        <ActionsCell
          onView={() => navigate(`/production-areas/${params.row.id}`)}
          onEdit={() => navigate(`/production-areas/${params.row.id}/edit`)}
          onDelete={() => setConfirmDelete(params.row)}
        />
      ),
    },
  ];

  return (
    <Box>
      <PageHeader
        title="Áreas de Producción"
        subtitle="Gestiona las áreas de producción de la empresa"
      />

      <DataTable
        rows={productionAreas}
        columns={columns}
        loading={productionAreasQuery.isLoading}
        onAdd={() => navigate('/production-areas/new')}
        addButtonText="Nueva Área de Producción"
        searchPlaceholder="Buscar áreas de producción..."
      />

      <ConfirmDialog
        open={!!confirmDelete}
        title="Eliminar Área de Producción"
        message={`¿Estás seguro de que deseas eliminar el área de producción "${confirmDelete?.name}"? Esta acción desactivará el área.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmDelete(null)}
        isLoading={deleteProductionAreaMutation.isPending}
        confirmText="Eliminar"
        severity="error"
      />
    </Box>
  );
};

export default ProductionAreasListPage;
