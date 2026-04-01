import React from 'react';
import { Box, Paper, Skeleton } from '@mui/material';

export const QuoteKanbanCardSkeleton: React.FC = () => (
  <Paper
    elevation={1}
    sx={{
      p: 1.5,
      borderRadius: 2,
      mb: 1,
    }}
  >
    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
      <Skeleton variant="text" width={100} height={20} />
      <Skeleton variant="rounded" width={70} height={22} />
    </Box>
    <Skeleton variant="text" width="80%" height={18} />
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
      <Skeleton variant="circular" width={24} height={24} />
      <Skeleton variant="text" width={90} height={16} />
    </Box>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
      <Skeleton variant="text" width={80} height={18} />
      <Skeleton variant="text" width={60} height={16} />
    </Box>
  </Paper>
);
