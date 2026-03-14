import React, { useState, useMemo } from 'react';
import { Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { GridRenderCellParams } from '@mui/x-data-grid';
import { PageHeader } from '../../../components/common/PageHeader';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { DataTable, ActionsCell } from '../../../components/common/DataTable';
import { useCommercialChannels } from '../hooks/useCommercialChannels';
import { CommercialChannel } from '../../../types/commercialChannel.types';
import { useResponsiveColumns, type ResponsiveGridColDef } from '../../../hooks';

const CommercialChannelsListPage: React.FC = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [confirmDelete, setConfirmDelete] = useState<CommercialChannel | null>(null);

  const { commercialChannelsQuery, deleteMutation } = useCommercialChannels();
  const commercialChannels = commercialChannelsQuery.data || [];

  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return;

    try {
      await deleteMutation.mutateAsync(confirmDelete.id);
      setConfirmDelete(null);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al eliminar canal de venta';
      enqueueSnackbar(message, { variant: 'error' });
    }
  };

  const rawColumns: ResponsiveGridColDef[] = useMemo(() => [
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
      responsive: 'md',
    },
    {
      field: 'actions',
      headerName: 'Acciones',
      width: 120,
      sortable: false,
      filterable: false,
      renderCell: (params: GridRenderCellParams<CommercialChannel>) => (
        <ActionsCell
          onView={() => navigate(`/commercial-channels/${params.row.id}`)}
          onEdit={() => navigate(`/commercial-channels/${params.row.id}/edit`)}
          onDelete={() => setConfirmDelete(params.row)}
        />
      ),
    },
  ], [navigate]);

  const columns = useResponsiveColumns(rawColumns);

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      <PageHeader
        title="Canales de Venta"
        subtitle="Gestiona los canales de venta de la empresa"
      />

      <DataTable
        rows={commercialChannels}
        columns={columns}
        loading={commercialChannelsQuery.isLoading}
        onAdd={() => navigate('/commercial-channels/new')}
        addButtonText="Nuevo Canal de Venta"
        searchPlaceholder="Buscar canales de venta..."
      />

      <ConfirmDialog
        open={!!confirmDelete}
        title="Eliminar Canal de Venta"
        message={`¿Estás seguro de que deseas eliminar el canal de venta "${confirmDelete?.name}"?`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmDelete(null)}
        isLoading={deleteMutation.isPending}
        confirmText="Eliminar"
        severity="error"
      />
    </Box>
  );
};

export default CommercialChannelsListPage;
