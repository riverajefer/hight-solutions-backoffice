import React, { useMemo } from 'react';
import {
  Box,
  Button,
  Chip,
  Typography,
  Tooltip,
} from '@mui/material';
import BuildIcon from '@mui/icons-material/Build';
import TuneIcon from '@mui/icons-material/Tune';
import { GridRenderCellParams } from '@mui/x-data-grid';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../../components/common/PageHeader';
import { DataTable } from '../../../components/common/DataTable';
import { useStepDefinitions } from '../hooks/useProduction';
import { useAuthStore } from '../../../store/authStore';
import { PERMISSIONS, ROUTES } from '../../../utils/constants';
import type { StepDefinition } from '../../../types/production.types';
import type { ResponsiveGridColDef } from '../../../hooks';

const STEP_TYPE_LABELS: Record<string, string> = {
  PAPEL: 'Papel',
  PLANCHAS: 'Planchas',
  CARTON: 'Cartón',
  MUESTRA_COLOR: 'Muestra de color',
  PLASTIFICADO: 'Plastificado',
  CORTE: 'Corte',
  TROQUEL: 'Troquel',
  REVISION: 'Revisión',
  ARMADO: 'Armado',
  EMPAQUE: 'Empaque',
};

const StepDefinitionsListPage: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuthStore();
  const canEdit = hasPermission(PERMISSIONS.UPDATE_STEP_DEFINITIONS);

  const stepDefsQuery = useStepDefinitions();
  const stepDefs: StepDefinition[] = stepDefsQuery.data || [];

  const columns: ResponsiveGridColDef[] = useMemo(
    () => [
      {
        field: 'name',
        headerName: 'Nombre',
        flex: 1,
        minWidth: 160,
      },
      {
        field: 'type',
        headerName: 'Tipo',
        width: 160,
        renderCell: (params: GridRenderCellParams) => (
          <Chip
            label={STEP_TYPE_LABELS[params.value] ?? params.value}
            size="small"
            variant="outlined"
          />
        ),
      },
      {
        field: 'fieldCount',
        headerName: 'Campos',
        width: 100,
        valueGetter: (_: any, row: StepDefinition) =>
          (row.fieldSchema?.fields ?? []).length,
        renderCell: (params: GridRenderCellParams) => {
          const count = params.value as number;
          const specCount = (params.row as StepDefinition).fieldSchema?.fields?.filter(
            (f) => f.stage === 'specification',
          ).length ?? 0;
          const execCount = (params.row as StepDefinition).fieldSchema?.fields?.filter(
            (f) => f.stage === 'execution',
          ).length ?? 0;
          return (
            <Tooltip title={`${specCount} especificación / ${execCount} ejecución`}>
              <Chip
                label={count}
                size="small"
                color={count > 0 ? 'primary' : 'default'}
                variant="filled"
              />
            </Tooltip>
          );
        },
      },
      {
        field: 'description',
        headerName: 'Descripción',
        flex: 1.5,
        minWidth: 200,
        renderCell: (params: GridRenderCellParams) => (
          <Typography variant="body2" color="text.secondary" noWrap>
            {params.value || '—'}
          </Typography>
        ),
      },
      {
        field: 'actions',
        headerName: 'Acciones',
        width: 100,
        sortable: false,
        renderCell: (params: GridRenderCellParams) => (
          <>
            {canEdit && (
              <Button
                size="small"
                startIcon={<BuildIcon sx={{ fontSize: 14 }} />}
                onClick={() =>
                  navigate(
                    ROUTES.STEP_DEFINITIONS_BUILDER.replace(':id', (params.row as StepDefinition).id),
                  )
                }
              >
                Editar
              </Button>
            )}
          </>
        ),
      },
    ],
    [canEdit, navigate],
  );

  return (
    <Box>
      <PageHeader
        title="Definiciones de Pasos"
        subtitle="Gestiona los campos de cada tipo de paso de producción"
        icon={<TuneIcon />}
      />

      <DataTable
        rows={stepDefs}
        columns={columns}
        loading={stepDefsQuery.isLoading}
        getRowId={(row) => row.id}
      />
    </Box>
  );
};

export default StepDefinitionsListPage;
