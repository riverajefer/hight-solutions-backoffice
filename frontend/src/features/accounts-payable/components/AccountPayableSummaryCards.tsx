import React from 'react';
import { Box, Card, CardContent, Grid, Skeleton, Typography } from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ScheduleIcon from '@mui/icons-material/Schedule';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import FilterListIcon from '@mui/icons-material/FilterList';
import { formatCurrency } from '../../../utils/formatters';
import { useAccountPayableSummary } from '../hooks/useAccountsPayable';
import type { FilterAccountPayableDto } from '../../../types/accounts-payable.types';

interface SummaryCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  loading?: boolean;
  onClick?: () => void;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ title, value, icon, color, loading, onClick }) => (
  <Card
    onClick={onClick}
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
      cursor: onClick ? 'pointer' : 'default',
      '&:hover': onClick
        ? {
            transform: 'translateY(-4px)',
            borderColor: color,
            boxShadow: `0 0 16px ${color}40`,
          }
        : {},
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
        <Typography variant="body2" color="text.secondary" fontWeight={500} sx={{ flex: 1 }}>
          {title}
        </Typography>
        {onClick && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.4,
              color,
              opacity: 0.7,
              fontSize: '0.7rem',
              fontWeight: 600,
              letterSpacing: '0.03em',
              '&:hover': { opacity: 1 },
            }}
          >
            <FilterListIcon sx={{ fontSize: 13 }} />
            Filtrar
          </Box>
        )}
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

interface AccountPayableSummaryCardsProps {
  onFilterClick?: (filters: Partial<FilterAccountPayableDto>) => void;
}

export const AccountPayableSummaryCards: React.FC<AccountPayableSummaryCardsProps> = ({
  onFilterClick,
}) => {
  const { data: summary, isLoading } = useAccountPayableSummary();

  const today = new Date().toISOString().split('T')[0];
  const in7days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const cards: Array<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
    filterParams: Partial<FilterAccountPayableDto>;
  }> = [
    {
      title: 'Total Pendiente',
      value: summary ? formatCurrency(summary.totalAmountPending) : '$0',
      icon: <AccountBalanceWalletIcon fontSize="small" />,
      color: '#F97316',
      filterParams: { status: 'PENDING' as any },
    },
    {
      title: 'Total Vencido',
      value: summary ? formatCurrency(summary.totalAmountOverdue) : '$0',
      icon: <WarningAmberIcon fontSize="small" />,
      color: '#FF2D95',
      filterParams: { status: 'OVERDUE' as any },
    },
    {
      title: 'Próx. a Vencer (7 días)',
      value: summary ? `${summary.upcomingCount} cuenta(s)` : '0',
      icon: <ScheduleIcon fontSize="small" />,
      color: '#F97316',
      filterParams: { dueDateFrom: today, dueDateTo: in7days },
    },
    {
      title: 'Cuentas Pagadas',
      value: summary ? `${summary.totalPaid} cuenta(s)` : '0',
      icon: <CheckCircleOutlineIcon fontSize="small" />,
      color: '#22D3EE',
      filterParams: { status: 'PAID' as any },
    },
  ];

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {cards.map((card) => (
        <Grid item xs={12} sm={6} md={3} key={card.title}>
          <SummaryCard
            title={card.title}
            value={card.value}
            icon={card.icon}
            color={card.color}
            loading={isLoading}
            onClick={onFilterClick ? () => onFilterClick(card.filterParams) : undefined}
          />
        </Grid>
      ))}
    </Grid>
  );
};
