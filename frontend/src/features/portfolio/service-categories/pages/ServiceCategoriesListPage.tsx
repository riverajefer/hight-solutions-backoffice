import React, { useState } from 'react';
import { Box, Chip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { PageHeader } from '../../../../components/common/PageHeader';
import { ConfirmDialog } from '../../../../components/common/ConfirmDialog';
import { DataTable, ActionsCell } from '../../../../components/common/DataTable';
import { useServiceCategories } from '../hooks/useServiceCategories';
import { ServiceCategory } from '../../../../types/service-category.types';
import { ROUTES } from '../../../../utils/constants';

const ServiceCategoriesListPage: React.FC = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [confirmDelete, setConfirmDelete] = useState<ServiceCategory | null>(null);

  const { serviceCategoriesQuery, deleteServiceCategoryMutation } = useServiceCategories();
  const serviceCategories = serviceCategoriesQuery.data || [];

  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return;
    try {
      await deleteServiceCategoryMutation.mutateAsync(confirmDelete.id);
      enqueueSnackbar('Categoría de servicio eliminada correctamente', {
        variant: 'success',
      });
      setConfirmDelete(null);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Error al eliminar categoría de servicio';
      enqueueSnackbar(message, { variant: 'error' });
    }
  };

  // Define columns for DataTable
  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Nombre',
      flex: 1,
      minWidth: 150,
    },
    {
      field: 'slug',
      headerName: 'Slug',
      width: 150,
    },
    {
      field: 'description',
      headerName: 'Descripción',
      flex: 2,
      minWidth: 200,
    },
    {
      field: 'sortOrder',
      headerName: 'Orden',
      width: 100,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'servicesCount',
      headerName: 'Servicios',
      width: 100,
      align: 'center',
      headerAlign: 'center',
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
      renderCell: (params: GridRenderCellParams<ServiceCategory>) => (
        <ActionsCell
          onEdit={() => navigate(`${ROUTES.SERVICE_CATEGORIES}/${params.row.id}/edit`)}
          onDelete={() => setConfirmDelete(params.row)}
        />
      ),
    },
  ];

  return (
    <Box>
      <PageHeader
        title="Categorías de Servicios"
        subtitle="Gestiona las categorías de servicios del sistema"
      />

      <DataTable
        rows={serviceCategories}
        columns={columns}
        loading={serviceCategoriesQuery.isLoading}
        onAdd={() => navigate(`${ROUTES.SERVICE_CATEGORIES}/new`)}
        addButtonText="Nueva Categoría"
        searchPlaceholder="Buscar categorías..."
      />

      <ConfirmDialog
        open={!!confirmDelete}
        title="Eliminar Categoría de Servicio"
        message={`¿Estás seguro de que deseas eliminar la categoría "${confirmDelete?.name}"?`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmDelete(null)}
        isLoading={deleteServiceCategoryMutation.isPending}
        confirmText="Eliminar"
        severity="error"
      />
    </Box>
  );
};

export default ServiceCategoriesListPage;
