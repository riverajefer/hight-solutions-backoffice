import React, { useState, useMemo } from 'react';
import { Box, Chip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { GridRenderCellParams } from '@mui/x-data-grid';
import { PageHeader } from '../../../components/common/PageHeader';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { DataTable, ActionsCell } from '../../../components/common/DataTable';
import { useCargos } from '../hooks/useCargos';
import { Cargo } from '../../../types';
import { useResponsiveColumns, type ResponsiveGridColDef } from '../../../hooks';

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

  const rawColumns: ResponsiveGridColDef[] = useMemo(() => [
    {
      field: 'name',
      headerName: 'Nombre',
      flex: 1,
      minWidth: 150,
    },
    {
      field: 'productionArea',
      headerName: 'Área de Producción',
      flex: 1,
      minWidth: 150,
      responsive: 'md',
      valueGetter: (value: Cargo['productionArea']) => value?.name || '',
      renderCell: (params: GridRenderCellParams<Cargo>) => (
        <Chip
          label={params.row.productionArea?.name || 'Sin área de producción'}
          size="small"
          color="secondary"
          variant="outlined"
          onClick={(e) => {
            e.stopPropagation();
            if (params.row.productionArea?.id) {
              navigate(`/production-areas/${params.row.productionArea.id}`);
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
      responsive: 'md',
    },
    {
      field: 'usersCount',
      headerName: 'Usuarios',
      width: 100,
      align: 'center',
      headerAlign: 'center',
      responsive: 'sm',
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
  ], [navigate]);

  const columns = useResponsiveColumns(rawColumns);

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
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
