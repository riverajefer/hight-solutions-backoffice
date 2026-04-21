import React from 'react';
import { Box, Card, CardContent, Grid, Skeleton, Typography } from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ScheduleIcon from '@mui/icons-material/Schedule';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { formatCurrency } from '../../../utils/formatters';
import { useAccountPayableSummary } from '../hooks/useAccountsPayable';

interface SummaryCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  loading?: boolean;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ title, value, icon, color, loading }) => (
  <Card
    sx={{
      height: '100%',
      borderRadius: 3,
      border: '1px solid',
      borderColor: (theme) =>
        theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
      background: (theme) =>
        theme.palette.mode === 'dark'
          ? 'linear-gradient(145deg, rgba(26,26,46,0.8) 0%, rgba(22,33,62,0.9) 100%)'
          : 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(241,245,249,0.9) 100%)',
      transition: 'all 0.3s ease',
      '&:hover': {
        transform: 'translateY(-4px)',
        borderColor: color,
        boxShadow: `0 0 12px ${color}30`,
      },
    }}
  >
    <CardContent sx={{ p: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 40,
            height: 40,
            borderRadius: 2,
            backgroundColor: `${color}20`,
            color,
          }}
        >
          {icon}
        </Box>
        <Typography variant="body2" color="text.secondary" fontWeight={500}>
          {title}
        </Typography>
      </Box>
      {loading ? (
        <Skeleton width="80%" height={32} />
      ) : (
        <Typography variant="h6" fontWeight={700} color={color}>
          {value}
        </Typography>
      )}
    </CardContent>
  </Card>
);

export const AccountPayableSummaryCards: React.FC = () => {
  const { data: summary, isLoading } = useAccountPayableSummary();

  const cards = [
    {
      title: 'Total Pendiente',
      value: summary ? formatCurrency(summary.totalAmountPending) : '$0',
      icon: <AccountBalanceWalletIcon fontSize="small" />,
      color: '#F97316',
    },
    {
      title: 'Total Vencido',
      value: summary ? formatCurrency(summary.totalAmountOverdue) : '$0',
      icon: <WarningAmberIcon fontSize="small" />,
      color: '#FF2D95',
    },
    {
      title: 'Próx. a Vencer (7 días)',
      value: summary ? `${summary.upcomingCount} cuenta(s)` : '0',
      icon: <ScheduleIcon fontSize="small" />,
      color: '#F97316',
    },
    {
      title: 'Cuentas Pagadas',
      value: summary ? `${summary.totalPaid} cuenta(s)` : '0',
      icon: <CheckCircleOutlineIcon fontSize="small" />,
      color: '#22D3EE',
    },
  ];

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {cards.map((card) => (
        <Grid item xs={12} sm={6} md={3} key={card.title}>
          <SummaryCard {...card} loading={isLoading} />
        </Grid>
      ))}
    </Grid>
  );
};
