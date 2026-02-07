import React, { useState } from 'react';
import { Box, Chip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { PageHeader } from '../../../../components/common/PageHeader';
import { ConfirmDialog } from '../../../../components/common/ConfirmDialog';
import { DataTable, ActionsCell } from '../../../../components/common/DataTable';
import { useServices } from '../hooks/useServices';
import { Service } from '../../../../types/service.types';
import { ROUTES } from '../../../../utils/constants';

const ServicesListPage: React.FC = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [confirmDelete, setConfirmDelete] = useState<Service | null>(null);

  const { servicesQuery, deleteServiceMutation } = useServices();
  const services = servicesQuery.data || [];

  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return;
    try {
      await deleteServiceMutation.mutateAsync(confirmDelete.id);
      enqueueSnackbar('Servicio eliminado correctamente', {
        variant: 'success',
      });
      setConfirmDelete(null);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Error al eliminar servicio';
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
      field: 'slug',
      headerName: 'Slug',
      width: 150,
    },
    {
      field: 'category',
      headerName: 'Categoría',
      flex: 1,
      minWidth: 150,
      valueGetter: (_value, row) => row.category?.name || 'N/A',
    },
    {
      field: 'basePrice',
      headerName: 'Precio Base',
      width: 120,
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
      field: 'priceUnit',
      headerName: 'Unidad',
      width: 100,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'description',
      headerName: 'Descripción',
      flex: 2,
      minWidth: 200,
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
      renderCell: (params: GridRenderCellParams<Service>) => (
        <ActionsCell
          onEdit={() => navigate(`${ROUTES.SERVICES}/${params.row.id}/edit`)}
          onDelete={() => setConfirmDelete(params.row)}
        />
      ),
    },
  ];

  return (
    <Box>
      <PageHeader
        title="Servicios"
        subtitle="Gestiona los servicios del sistema"
      />

      <DataTable
        rows={services}
        columns={columns}
        loading={servicesQuery.isLoading}
        onAdd={() => navigate(`${ROUTES.SERVICES}/new`)}
        addButtonText="Nuevo Servicio"
        searchPlaceholder="Buscar servicios..."
      />

      <ConfirmDialog
        open={!!confirmDelete}
        title="Eliminar Servicio"
        message={`¿Estás seguro de que deseas eliminar el servicio "${confirmDelete?.name}"?`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmDelete(null)}
        isLoading={deleteServiceMutation.isPending}
        confirmText="Eliminar"
        severity="error"
      />
    </Box>
  );
};

export default ServicesListPage;
