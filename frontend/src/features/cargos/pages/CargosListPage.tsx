import React, { useState } from 'react';
import { Box, Chip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { PageHeader } from '../../../components/common/PageHeader';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { DataTable, ActionsCell } from '../../../components/common/DataTable';
import { useCargos } from '../hooks/useCargos';
import { Cargo } from '../../../types';

const CargosListPage: React.FC = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [confirmDelete, setConfirmDelete] = useState<Cargo | null>(null);

  const { cargosQuery, deleteCargoMutation } = useCargos();
  const cargos = cargosQuery.data || [];

  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return;

    try {
      await deleteCargoMutation.mutateAsync(confirmDelete.id);
      enqueueSnackbar('Cargo eliminado correctamente', { variant: 'success' });
      setConfirmDelete(null);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al eliminar cargo';
      enqueueSnackbar(message, { variant: 'error' });
    }
  };

  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Nombre',
      flex: 1,
      minWidth: 150,
    },
    {
      field: 'area',
      headerName: 'Área',
      flex: 1,
      minWidth: 150,
      valueGetter: (value: Cargo['area']) => value?.name || '',
      renderCell: (params: GridRenderCellParams<Cargo>) => (
        <Chip
          label={params.row.area?.name || 'Sin área'}
          size="small"
          color="secondary"
          variant="outlined"
          onClick={(e) => {
            e.stopPropagation();
            if (params.row.area?.id) {
              navigate(`/areas/${params.row.area.id}`);
            }
          }}
          sx={{ cursor: 'pointer' }}
        />
      ),
    },
    {
      field: 'description',
      headerName: 'Descripción',
      flex: 2,
      minWidth: 200,
    },
    {
      field: 'usersCount',
      headerName: 'Usuarios',
      width: 100,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={params.value || 0}
          size="small"
          color="primary"
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
      renderCell: (params: GridRenderCellParams<Cargo>) => (
        <ActionsCell
          onView={() => navigate(`/cargos/${params.row.id}`)}
          onEdit={() => navigate(`/cargos/${params.row.id}/edit`)}
          onDelete={() => setConfirmDelete(params.row)}
        />
      ),
    },
  ];

  return (
    <Box>
      <PageHeader
        title="Cargos"
        subtitle="Gestiona los cargos de la organización"
      />

      <DataTable
        rows={cargos}
        columns={columns}
        loading={cargosQuery.isLoading}
        onAdd={() => navigate('/cargos/new')}
        addButtonText="Nuevo Cargo"
        searchPlaceholder="Buscar cargos..."
      />

      <ConfirmDialog
        open={!!confirmDelete}
        title="Eliminar Cargo"
        message={`¿Estás seguro de que deseas eliminar el cargo "${confirmDelete?.name}"? Esta acción desactivará el cargo.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmDelete(null)}
        isLoading={deleteCargoMutation.isPending}
        confirmText="Eliminar"
        severity="error"
      />
    </Box>
  );
};

export default CargosListPage;
