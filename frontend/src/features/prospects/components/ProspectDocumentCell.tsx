import React from 'react';
import { Box, Chip, Stack, Tooltip } from '@mui/material';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import ReceiptIcon from '@mui/icons-material/Receipt';
import { useNavigate } from 'react-router-dom';
import { Prospect } from '../../../types/prospect.types';

interface ProspectDocumentCellProps {
  prospect: Prospect;
  /** En el kanban las tarjetas son más angostas: solo muestra el documento final. */
  compact?: boolean;
}

/**
 * Muestra a qué documento llegó el prospecto: su cotización y, si la venta se
 * cerró, la orden resultante.
 *
 * La orden puede venir por dos caminos: convertida directamente desde el
 * prospecto (`prospect.order`), o derivada de su cotización cuando esa
 * cotización se convirtió después (`prospect.quote.orderId`). Este componente
 * unifica ambos para que la lista no mienta según el camino que se haya usado.
 */
export const ProspectDocumentCell: React.FC<ProspectDocumentCellProps> = ({
  prospect,
  compact = false,
}) => {
  const navigate = useNavigate();

  const quote = prospect.quote;
  const orderFromQuote = quote?.orderId ?? null;
  const orderId = prospect.order?.id ?? orderFromQuote;
  const orderNumber = prospect.order?.orderNumber ?? null;

  if (!quote && !orderId) {
    return (
      <Box component="span" sx={{ color: 'text.disabled', fontSize: 14 }}>
        —
      </Box>
    );
  }

  const go = (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    navigate(path);
  };

  const orderChip = orderId ? (
    <Tooltip title="Ver orden de pedido">
      <Chip
        size="small"
        color="success"
        variant="filled"
        icon={<ReceiptIcon />}
        // Si la orden vino derivada de la cotización no tenemos su número
        // consecutivo cargado; se muestra una etiqueta genérica en su lugar.
        label={orderNumber ?? 'Orden'}
        onClick={(e) => go(e, `/orders/${orderId}`)}
        sx={{ cursor: 'pointer' }}
      />
    </Tooltip>
  ) : null;

  const quoteChip = quote ? (
    <Tooltip title="Ver cotización">
      <Chip
        size="small"
        color="info"
        variant="outlined"
        icon={<RequestQuoteIcon />}
        label={quote.quoteNumber}
        onClick={(e) => go(e, `/quotes/${quote.id}`)}
        sx={{ cursor: 'pointer' }}
      />
    </Tooltip>
  ) : null;

  // En modo compacto prima la orden: es el desenlace que interesa ver de un vistazo.
  if (compact) {
    return orderChip ?? quoteChip;
  }

  return (
    <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap>
      {quoteChip}
      {orderChip}
    </Stack>
  );
};
