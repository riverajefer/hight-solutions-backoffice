import { useState } from 'react';
import { useParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import SearchIcon from '@mui/icons-material/Search';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import { PageHeader } from '../../../components/common';
import OrderFlowDiagram from '../components/OrderFlowDiagram';
import OrderSearchDialog from '../components/OrderSearchDialog';
import { useOrderTree } from '../hooks/useOrderTree';
import type { EntityType } from '../types/order-timeline.types';

const VALID_TYPES = ['quote', 'order', 'work-order', 'expense-order'];

export default function OrderFlowPage() {
  const { type, id } = useParams<{ type: string; id: string }>();
  const [searchOpen, setSearchOpen] = useState(!type || !id);

  const entityType = (type as EntityType) || 'order';
  const entityId = id || '';
  const isValidType = VALID_TYPES.includes(entityType);

  const { data, isLoading, isError, error } = useOrderTree(
    entityType,
    isValidType ? entityId : '',
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)' }}>
      <PageHeader
        title="Trazabilidad de Órdenes"
        subtitle="Visualiza el flujo completo de documentos relacionados"
        icon={<AccountTreeIcon />}
        breadcrumbs={[
          { label: 'Comercial' },
          { label: 'Trazabilidad de Órdenes' },
        ]}
        action={
          <Button
            variant="outlined"
            startIcon={<SearchIcon />}
            onClick={() => setSearchOpen(true)}
          >
            Buscar Orden
          </Button>
        }
      />

      <Box sx={{ flex: 1, minHeight: 0 }}>
        {!type || !id ? (
          <Box
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
            }}
          >
            <AccountTreeIcon sx={{ fontSize: 64, color: 'text.secondary', opacity: 0.3 }} />
            <Typography color="text.secondary" variant="h6">
              Selecciona una orden para ver su trazabilidad
            </Typography>
            <Button
              variant="contained"
              startIcon={<SearchIcon />}
              onClick={() => setSearchOpen(true)}
            >
              Buscar Orden
            </Button>
          </Box>
        ) : !isValidType ? (
          <Alert severity="error" sx={{ m: 2 }}>
            Tipo de entidad no válido: "{type}". Los tipos válidos son: quote,
            order, work-order, expense-order.
          </Alert>
        ) : isLoading ? (
          <Box
            sx={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CircularProgress />
          </Box>
        ) : isError ? (
          <Alert severity="error" sx={{ m: 2 }}>
            {(error as Error)?.message || 'Error al cargar la trazabilidad'}
          </Alert>
        ) : data ? (
          <OrderFlowDiagram data={data} />
        ) : null}
      </Box>

      <OrderSearchDialog
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
      />
    </Box>
  );
}
