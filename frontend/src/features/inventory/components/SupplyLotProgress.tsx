import React from 'react';
import { Box, LinearProgress, Typography } from '@mui/material';
import { SupplyLotDisplayStatus } from '../../../types';

/** Barra de % consumido: verde mientras hay saldo, ámbar en bajo inventario. */
export const SupplyLotProgress: React.FC<{ percent: number; status: SupplyLotDisplayStatus }> = ({
  percent,
  status,
}) => {
  const color = status === 'LOW' ? 'warning' : status === 'AVAILABLE' ? 'primary' : 'inherit';
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
      <LinearProgress
        variant="determinate"
        value={Math.min(100, Math.max(0, percent))}
        color={color}
        sx={{ flex: 1, height: 6, borderRadius: 3 }}
      />
      <Typography variant="caption" sx={{ minWidth: 40, textAlign: 'right' }}>
        {percent.toLocaleString('es-CO', { maximumFractionDigits: 1 })} %
      </Typography>
    </Box>
  );
};
