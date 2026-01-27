import React, { useState } from 'react';
import { Box, Chip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { PageHeader } from '../../../../components/common/PageHeader';
import { ConfirmDialog } from '../../../../components/common/ConfirmDialog';
import { DataTable, ActionsCell } from '../../../../components/common/DataTable';
import { useUnitsOfMeasure } from '../hooks/useUnitsOfMeasure';
import { UnitOfMeasure } from '../../../../types/unit-of-measure.types';
import { ROUTES } from '../../../../utils/constants';

const UnitsOfMeasureListPage: React.FC = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [confirmDelete, setConfirmDelete] = useState<UnitOfMeasure | null>(null);

  const { unitsOfMeasureQuery, deleteUnitOfMeasureMutation } = useUnitsOfMeasure();
  const unitsOfMeasure = unitsOfMeasureQuery.data || [];

  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return;
    try {
      await deleteUnitOfMeasureMutation.mutateAsync(confirmDelete.id);
      enqueueSnackbar('Unidad de medida eliminada correctamente', {
        variant: 'success',
      });
      setConfirmDelete(null);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Error al eliminar unidad de medida';
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
      field: 'abbreviation',
      headerName: 'Abreviatura',
      width: 120,
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
      renderCell: (params: GridRenderCellParams<UnitOfMeasure>) => (
        <ActionsCell
          onEdit={() => navigate(`${ROUTES.UNITS_OF_MEASURE}/${params.row.id}/edit`)}
          onDelete={() => setConfirmDelete(params.row)}
        />
      ),
    },
  ];

  return (
    <Box>
      <PageHeader
        title="Unidades de Medida"
        subtitle="Gestiona las unidades de medida del sistema"
      />

      <DataTable
        rows={unitsOfMeasure}
        columns={columns}
        loading={unitsOfMeasureQuery.isLoading}
        onAdd={() => navigate(`${ROUTES.UNITS_OF_MEASURE}/new`)}
        addButtonText="Nueva Unidad"
        searchPlaceholder="Buscar unidades..."
      />

      <ConfirmDialog
        open={!!confirmDelete}
        title="Eliminar Unidad de Medida"
        message={`¿Estás seguro de que deseas eliminar la unidad "${confirmDelete?.name}"?`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmDelete(null)}
        isLoading={deleteUnitOfMeasureMutation.isPending}
        confirmText="Eliminar"
        severity="error"
      />
    </Box>
  );
};

export default UnitsOfMeasureListPage;
