import React, { useMemo, useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useSnackbar } from 'notistack';
import { useQueryClient } from '@tanstack/react-query';
import { prospectsApi } from '../../../../api/prospects.api';
import {
  ALLOWED_PROSPECT_TRANSITIONS,
  FilterProspectsDto,
  PROSPECT_STATUS_LABELS,
  Prospect,
  ProspectStatus,
} from '../../../../types/prospect.types';
import { PROSPECTS_QUERY_KEY, useProspects } from '../../hooks/useProspects';
import { ProspectKanbanColumn } from './ProspectKanbanColumn';
import { ProspectKanbanCard } from './ProspectKanbanCard';

/**
 * El tablero carga los prospectos de una sola vez y los agrupa en memoria por
 * estado. Un pipeline comercial maneja cientos de registros, no millones, así
 * que no hace falta la query paginada por columna del tablero de cotizaciones.
 */
const BOARD_LIMIT = 500;

const COLUMN_ORDER: ProspectStatus[] = [
  ProspectStatus.NUEVO,
  ProspectStatus.EN_SEGUIMIENTO,
  ProspectStatus.COTIZADO,
  ProspectStatus.CONVERTIDO,
  ProspectStatus.PERDIDO,
  ProspectStatus.NO_INTERESADO,
];

interface ProspectKanbanBoardProps {
  filters: FilterProspectsDto;
  canUpdate?: boolean;
  canConvert?: boolean;
  onViewProspect: (prospect: Prospect) => void;
  onAddContact: (prospect: Prospect) => void;
  onConvert: (prospect: Prospect) => void;
}

export const ProspectKanbanBoard: React.FC<ProspectKanbanBoardProps> = ({
  filters,
  canUpdate,
  canConvert,
  onViewProspect,
  onAddContact,
  onConvert,
}) => {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const [dragging, setDragging] = useState<Prospect | null>(null);

  // El tablero muestra todas las columnas, así que ignora el filtro de estado.
  const boardFilters = useMemo<FilterProspectsDto>(
    () => ({ ...filters, status: undefined, page: 1, limit: BOARD_LIMIT }),
    [filters],
  );

  const { prospectsQuery } = useProspects(boardFilters);
  const prospects = prospectsQuery.data?.data ?? [];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const byStatus = useMemo(() => {
    const map = new Map<ProspectStatus, Prospect[]>();
    COLUMN_ORDER.forEach((s) => map.set(s, []));
    prospects.forEach((p) => map.get(p.status)?.push(p));
    return map;
  }, [prospects]);

  const handleDragStart = (event: DragStartEvent) => {
    setDragging((event.active.data.current?.prospect as Prospect) ?? null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setDragging(null);
    const { active, over } = event;
    if (!over) return;

    const prospect = active.data.current?.prospect as Prospect | undefined;
    // Al soltar sobre otra tarjeta, el estado destino sale de esa tarjeta.
    const targetStatus = (over.data.current?.columnStatus ??
      (over.data.current?.prospect as Prospect | undefined)?.status) as
      | ProspectStatus
      | undefined;

    if (!prospect || !targetStatus || prospect.status === targetStatus) return;

    if (!ALLOWED_PROSPECT_TRANSITIONS[prospect.status]?.includes(targetStatus)) {
      enqueueSnackbar(
        `No se puede mover de "${PROSPECT_STATUS_LABELS[prospect.status]}" a "${PROSPECT_STATUS_LABELS[targetStatus]}"`,
        { variant: 'warning' },
      );
      return;
    }

    try {
      await prospectsApi.update(prospect.id, { status: targetStatus });
      queryClient.invalidateQueries({ queryKey: [PROSPECTS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['prospect-metrics'] });
    } catch (error: any) {
      enqueueSnackbar(
        error?.response?.data?.message || 'No se pudo cambiar el estado',
        { variant: 'error' },
      );
    }
  };

  if (prospectsQuery.isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (prospects.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <Typography color="text.secondary">
          No hay prospectos que coincidan con los filtros.
        </Typography>
      </Box>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setDragging(null)}
    >
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          overflowX: 'auto',
          pb: 2,
          height: 'calc(100vh - 340px)',
          minHeight: 400,
          alignItems: 'stretch',
        }}
      >
        {COLUMN_ORDER.map((status) => (
          <ProspectKanbanColumn
            key={status}
            status={status}
            prospects={byStatus.get(status) ?? []}
            canUpdate={canUpdate}
            canConvert={canConvert}
            onView={onViewProspect}
            onAddContact={onAddContact}
            onConvert={onConvert}
          />
        ))}
      </Box>

      <DragOverlay>
        {dragging && <ProspectKanbanCard prospect={dragging} isOverlay />}
      </DragOverlay>
    </DndContext>
  );
};
