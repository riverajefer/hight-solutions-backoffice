import React, { useState } from 'react';
import { Box, Button, Chip } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { PageHeader } from '../../../components/common/PageHeader';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { DataTable, ActionsCell } from '../../../components/common/DataTable';
import { useClients } from '../hooks/useClients';
import { UploadCsvModal } from '../components/UploadCsvModal';
import { Client } from '../../../types';
import { useAuthStore } from '../../../store/authStore';
import { PERMISSIONS } from '../../../utils/constants';

const ClientsListPage: React.FC = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { hasPermission } = useAuthStore();
  const [confirmDelete, setConfirmDelete] = useState<Client | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  const { clientsQuery, deleteClientMutation, uploadCsvMutation } = useClients();
  const clients = clientsQuery.data || [];

  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return;

    try {
      await deleteClientMutation.mutateAsync(confirmDelete.id);
      enqueueSnackbar('Cliente eliminado correctamente', { variant: 'success' });
      setConfirmDelete(null);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Error al eliminar cliente';
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
      renderCell: (params: GridRenderCellParams<Client>) => (
        <ActionsCell
          onView={
            hasPermission(PERMISSIONS.READ_CLIENTS)
              ? () => navigate(`/clients/${params.row.id}`)
              : undefined
          }
          onEdit={
            hasPermission(PERMISSIONS.UPDATE_CLIENTS)
              ? () => navigate(`/clients/${params.row.id}/edit`)
              : undefined
          }
          onDelete={
            hasPermission(PERMISSIONS.DELETE_CLIENTS)
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
        title="Clientes"
        subtitle="Gestiona los clientes de la organización"
        action={
          hasPermission(PERMISSIONS.CREATE_CLIENTS) ? (
            <Button
              variant="outlined"
              color="primary"
              startIcon={<UploadFileIcon />}
              onClick={() => setUploadModalOpen(true)}
            >
              Subida Masiva
            </Button>
          ) : undefined
        }
      />

      <DataTable
        rows={clients}
        columns={columns}
        loading={clientsQuery.isLoading}
        onAdd={
          hasPermission(PERMISSIONS.CREATE_CLIENTS)
            ? () => navigate('/clients/new')
            : undefined
        }
        addButtonText="Nuevo Cliente"
        searchPlaceholder="Buscar clientes..."
      />

      <ConfirmDialog
        open={!!confirmDelete}
        title="Eliminar Cliente"
        message={`¿Estás seguro de que deseas eliminar el cliente "${confirmDelete?.name}"?`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmDelete(null)}
        isLoading={deleteClientMutation.isPending}
        confirmText="Eliminar"
        severity="error"
      />

      <UploadCsvModal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUpload={async (file) => {
          const result = await uploadCsvMutation.mutateAsync(file);
          if (result.successful > 0) {
            enqueueSnackbar(
              `${result.successful} cliente${result.successful !== 1 ? 's' : ''} importado${result.successful !== 1 ? 's' : ''} correctamente`,
              { variant: 'success' },
            );
          }
          return result;
        }}
      />
    </Box>
  );
};

export default ClientsListPage;
