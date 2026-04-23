import React, { useState, useMemo } from 'react';
import { Box, Button, Chip, TextField, MenuItem, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
/* import UploadFileIcon from '@mui/icons-material/UploadFile';
 */import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { GridRenderCellParams } from '@mui/x-data-grid';
import { PageHeader } from '../../../components/common/PageHeader';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { DataTable, ActionsCell } from '../../../components/common/DataTable';
import { useClients } from '../hooks/useClients';
import { UploadCsvModal } from '../components/UploadCsvModal';
import { Client } from '../../../types';
import { useAuthStore } from '../../../store/authStore';
import { PERMISSIONS } from '../../../utils/constants';
import { formatCurrency } from '../../../utils/formatters';
import { useResponsiveColumns } from '../../../hooks';
import type { ResponsiveGridColDef } from '../../../hooks';

const ClientsListPage: React.FC = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { hasPermission } = useAuthStore();
  const [confirmDelete, setConfirmDelete] = useState<Client | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [filterSaldoAFavor, setFilterSaldoAFavor] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const { clientsQuery, deleteClientMutation, uploadCsvMutation } =
    useClients();
  const clients = clientsQuery.data || [];

  const filteredClients = useMemo(() => {
    let result = clients;

    if (filterSaldoAFavor === 'con_saldo') {
      result = result.filter((client) => (client.saldoAFavor || 0) > 0);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((client) => {
        return (
          client.name?.toLowerCase().includes(q) ||
          client.phone?.toLowerCase().includes(q) ||
          client.email?.toLowerCase().includes(q) ||
          client.nit?.toLowerCase().includes(q) ||
          client.cedula?.toLowerCase().includes(q)
        );
      });
    }

    return result;
  }, [clients, filterSaldoAFavor, searchQuery]);

  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return;

    try {
      await deleteClientMutation.mutateAsync(confirmDelete.id);
      enqueueSnackbar('Cliente eliminado correctamente', {
        variant: 'success',
      });
      setConfirmDelete(null);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Error al eliminar cliente';
      enqueueSnackbar(message, { variant: 'error' });
    }
  };

  const rawColumns: ResponsiveGridColDef[] = useMemo(
    () => [
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
        responsive: 'md',
      },
      {
        field: 'phone',
        headerName: 'Teléfono',
        width: 140,
        responsive: 'md',
      },
      {
        field: 'personType',
        headerName: 'Tipo',
        width: 120,
        align: 'center',
        headerAlign: 'center',
        responsive: 'sm',
        renderCell: (params: GridRenderCellParams) => (
          <Chip
            label={params.value === 'EMPRESA' ? 'Empresa' : 'Natural'}
            size='small'
            color={params.value === 'EMPRESA' ? 'primary' : 'default'}
            variant='outlined'
          />
        ),
      },
      {
        field: 'city',
        headerName: 'Ciudad',
        width: 150,
        responsive: 'md',
        valueGetter: (value: { name: string } | undefined) =>
          value?.name || '-',
      },
      {
        field: 'department',
        headerName: 'Departamento',
        width: 150,
        responsive: 'md',
        valueGetter: (value: { name: string } | undefined) =>
          value?.name || '-',
      },
      {
        field: 'advisor',
        headerName: 'Creado por',
        width: 180,
        responsive: 'md',
        valueGetter: (_: any, row: Client) => {
          if (!row.advisor) return '-';
          const firstName = row.advisor.firstName || '';
          const lastName = row.advisor.lastName || '';
          if (firstName || lastName) return `${firstName} ${lastName}`.trim();
          return row.advisor.email || '-';
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
            size='small'
            color={params.value ? 'success' : 'default'}
          />
        ),
      },
      {
        field: 'saldoAFavor',
        headerName: 'Saldo a favor',
        width: 140,
        align: 'right',
        headerAlign: 'right',
        responsive: 'md',
        renderCell: (params: GridRenderCellParams) => {
          if (!params.value) return '-';
          return (
            <Chip
              label={formatCurrency(params.value)}
              size='small'
              color='success'
              variant='outlined'
              sx={{ fontWeight: 'bold' }}
            />
          );
        },
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
    ],
    [navigate, hasPermission],
  );

  const columns = useResponsiveColumns(rawColumns);

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      <PageHeader
        title='Clientes'
        subtitle='Gestiona los clientes de la organización'
        action={
          hasPermission(PERMISSIONS.CREATE_CLIENTS) ? (
            <>
{/*               <Button
                variant='outlined'
                color='primary'
                startIcon={<UploadFileIcon />}
                onClick={() => setUploadModalOpen(true)}
              >
                Subida Masiva
              </Button> */}
            </>
          ) : undefined
        }
      />

      {hasPermission(PERMISSIONS.BROWSE_CLIENTS) && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: '1fr 1fr',
              md: 'repeat(4, 1fr)',
            },
            gap: 2,
            mb: 3,
            mt: 2,
          }}
        >
          {hasPermission(PERMISSIONS.SEARCH_CLIENTS) && (
            <TextField
              label='Buscar cliente'
              placeholder='Nombre, celular, NIT/cédula, correo...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              fullWidth
              size='small'
              sx={{ gridColumn: { xs: '1', sm: '1 / -1', md: '1 / 3' } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position='start'>
                    <SearchIcon fontSize='small' />
                  </InputAdornment>
                ),
              }}
            />
          )}
          <TextField
            select
            label='Saldo a favor'
            value={filterSaldoAFavor}
            onChange={(e) => setFilterSaldoAFavor(e.target.value)}
            fullWidth
            size='small'
          >
            <MenuItem value=''>Todos</MenuItem>
            <MenuItem value='con_saldo'>Con saldo a favor</MenuItem>
          </TextField>
        </Box>
      )}

      {hasPermission(PERMISSIONS.BROWSE_CLIENTS) ? (
        <DataTable
          rows={filteredClients}
          columns={columns}
          loading={clientsQuery.isLoading}
          onAdd={
            hasPermission(PERMISSIONS.CREATE_CLIENTS)
              ? () => navigate('/clients/new')
              : undefined
          }
          addButtonText='Nuevo Cliente'
          searchPlaceholder='Buscar clientes...'
        />
      ) : (
        <Box
          sx={{
            mt: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Button
            variant='contained'
            color='primary'
            size='large'
            onClick={() => navigate('/clients/new')}
          >
            Crear Nuevo Cliente
          </Button>
        </Box>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title='Eliminar Cliente'
        message={`¿Estás seguro de que deseas eliminar el cliente "${confirmDelete?.name}"?`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmDelete(null)}
        isLoading={deleteClientMutation.isPending}
        confirmText='Eliminar'
        severity='error'
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
