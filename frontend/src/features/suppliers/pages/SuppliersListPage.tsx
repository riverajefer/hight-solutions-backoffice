import React, { useState } from 'react';
import { Box, Chip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { PageHeader } from '../../../components/common/PageHeader';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { DataTable, ActionsCell } from '../../../components/common/DataTable';
import { useSuppliers } from '../hooks/useSuppliers';
import { Supplier } from '../../../types';
import { useAuthStore } from '../../../store/authStore';
import { PERMISSIONS } from '../../../utils/constants';

const SuppliersListPage: React.FC = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { hasPermission } = useAuthStore();
  const [confirmDelete, setConfirmDelete] = useState<Supplier | null>(null);

  const { suppliersQuery, deleteSupplierMutation } = useSuppliers();
  const suppliers = suppliersQuery.data || [];

  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return;

    try {
      await deleteSupplierMutation.mutateAsync(confirmDelete.id);
      enqueueSnackbar('Proveedor eliminado correctamente', { variant: 'success' });
      setConfirmDelete(null);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Error al eliminar proveedor';
      enqueueSnackbar(message, { variant: 'error' });
    }
  };

  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Nombre',
      flex: 1,
      minWidth: 180,
    },
    {
      field: 'email',
      headerName: 'Email',
      flex: 1,
      minWidth: 200,
    },
    {
      field: 'phone',
      headerName: 'Teléfono',
      width: 140,
    },
    {
      field: 'personType',
      headerName: 'Tipo',
      width: 120,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={params.value === 'EMPRESA' ? 'Empresa' : 'Natural'}
          size="small"
          color={params.value === 'EMPRESA' ? 'primary' : 'default'}
          variant="outlined"
        />
      ),
    },
    {
      field: 'city',
      headerName: 'Ciudad',
      width: 150,
      valueGetter: (value: { name: string } | undefined) => value?.name || '-',
    },
    {
      field: 'department',
      headerName: 'Departamento',
      width: 150,
      valueGetter: (value: { name: string } | undefined) => value?.name || '-',
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
      renderCell: (params: GridRenderCellParams<Supplier>) => (
        <ActionsCell
          onView={
            hasPermission(PERMISSIONS.READ_SUPPLIERS)
              ? () => navigate(`/suppliers/${params.row.id}`)
              : undefined
          }
          onEdit={
            hasPermission(PERMISSIONS.UPDATE_SUPPLIERS)
              ? () => navigate(`/suppliers/${params.row.id}/edit`)
              : undefined
          }
          onDelete={
            hasPermission(PERMISSIONS.DELETE_SUPPLIERS)
              ? () => setConfirmDelete(params.row)
              : undefined
          }
        />
      ),
    },
  ];

  return (
    <Box>
      <PageHeader
        title="Proveedores"
        subtitle="Gestiona los proveedores de la organización"
      />

      <DataTable
        rows={suppliers}
        columns={columns}
        loading={suppliersQuery.isLoading}
        onAdd={
          hasPermission(PERMISSIONS.CREATE_SUPPLIERS)
            ? () => navigate('/suppliers/new')
            : undefined
        }
        addButtonText="Nuevo Proveedor"
        searchPlaceholder="Buscar proveedores..."
      />

      <ConfirmDialog
        open={!!confirmDelete}
        title="Eliminar Proveedor"
        message={`¿Estás seguro de que deseas eliminar el proveedor "${confirmDelete?.name}"?`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmDelete(null)}
        isLoading={deleteSupplierMutation.isPending}
        confirmText="Eliminar"
        severity="error"
      />
    </Box>
  );
};

export default SuppliersListPage;
