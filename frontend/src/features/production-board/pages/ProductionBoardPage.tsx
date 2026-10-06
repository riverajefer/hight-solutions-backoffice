import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Skeleton, Typography } from '@mui/material';
import { ViewKanban as BoardIcon } from '@mui/icons-material';
import { PageHeader } from '../../../components/common/PageHeader';
import type { FilterOrdersDto } from '../../../types/order.types';
import { ROUTES } from '../../../utils/constants';
import { BOARD_DAYS, BOARD_OPEN_STATUSES } from '../boardConfig';
import { BoardColumn } from '../components/BoardColumn';
import { BoardFiltersBar } from '../components/BoardFiltersBar';
import { BoardSummaryBar } from '../components/BoardSummaryBar';
import { useBoardFilters } from '../hooks/useBoardFilters';
import { useProductionBoard } from '../hooks/useProductionBoard';
import {
  applyBaseFilters,
  applySemaphoreFilter,
  getAdvisorOptions,
  getAreaOptions,
  groupByAdvisor,
  groupByStatus,
  summarize,
} from '../utils/boardGrouping';

const ProductionBoardPage: React.FC = () => {
  const navigate = useNavigate();
  const boardQuery = useProductionBoard();
  const { filters, updateFilters, clearFilters, activeFiltersCount } = useBoardFilters();

  const cards = useMemo(() => boardQuery.data?.cards ?? [], [boardQuery.data]);

  const advisorOptions = useMemo(() => getAdvisorOptions(cards), [cards]);
  const areaOptions = useMemo(() => getAreaOptions(cards), [cards]);

  const baseCards = useMemo(() => applyBaseFilters(cards, filters), [cards, filters]);
  const summary = useMemo(() => summarize(baseCards), [baseCards]);
  const columns = useMemo(() => {
    const visible = applySemaphoreFilter(baseCards, filters);
    return filters.view === 'status'
      ? groupByStatus(visible, filters.showDrafts)
      : groupByAdvisor(visible);
  }, [baseCards, filters]);

  const staleOpenCount = boardQuery.data?.staleOpenCount ?? 0;

  const handleViewStaleOrders = () => {
    const orderFilters: FilterOrdersDto = {
      statuses: BOARD_OPEN_STATUSES,
      orderDateTo: boardQuery.data?.cutoffDate,
    };
    navigate(ROUTES.ORDERS, { state: { orderFilters } });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: { md: 'calc(100vh - 112px)' } }}>
      <PageHeader
        title="Tablero de Producción"
        subtitle={`Órdenes de pedido abiertas de los últimos ${BOARD_DAYS} días`}
        icon={<BoardIcon />}
      />

      {boardQuery.isError ? (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => boardQuery.refetch()}>
              Reintentar
            </Button>
          }
        >
          No se pudo cargar el tablero.
        </Alert>
      ) : boardQuery.isLoading ? (
        <Box sx={{ display: 'flex', gap: 2 }}>
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} variant="rounded" width={300} height={420} />
          ))}
        </Box>
      ) : (
        <>
          {staleOpenCount > 0 && (
            <Alert
              severity="info"
              sx={{ mb: 2 }}
              action={
                <Button color="inherit" size="small" onClick={handleViewStaleOrders}>
                  Ver órdenes
                </Button>
              }
            >
              Hay {staleOpenCount} {staleOpenCount === 1 ? 'orden antigua' : 'órdenes antiguas'} sin
              cerrar (más de {BOARD_DAYS} días) que no se muestran en el tablero.
            </Alert>
          )}

          <BoardSummaryBar
            summary={summary}
            selected={filters.semaphore}
            onSelect={(semaphore) => updateFilters({ semaphore })}
            generatedAt={boardQuery.data?.generatedAt}
            isFetching={boardQuery.isFetching}
          />

          <BoardFiltersBar
            filters={filters}
            advisorOptions={advisorOptions}
            areaOptions={areaOptions}
            activeFiltersCount={activeFiltersCount}
            onChange={updateFilters}
            onClear={clearFilters}
          />

          {columns.length === 0 ? (
            <Box sx={{ py: 8, textAlign: 'center', color: 'text.secondary' }}>
              <Typography>No hay órdenes que coincidan con los filtros.</Typography>
            </Box>
          ) : (
            <Box
              sx={{
                display: 'flex',
                gap: 2,
                overflowX: 'auto',
                flex: 1,
                minHeight: { xs: 480, md: 0 },
                height: { xs: '75vh', md: 'auto' },
                pb: 1,
                scrollSnapType: { xs: 'x mandatory', sm: 'none' },
              }}
            >
              {columns.map((column) => (
                <BoardColumn key={column.id} column={column} view={filters.view} />
              ))}
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

export default ProductionBoardPage;
