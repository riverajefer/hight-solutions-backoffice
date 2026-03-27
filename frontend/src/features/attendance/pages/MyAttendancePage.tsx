import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Chip,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Skeleton,
  Alert,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  AccessTime as AccessTimeIcon,
  CalendarMonth as CalendarIcon,
  TrendingUp as TrendingUpIcon,
  WorkHistory as WorkHistoryIcon,
  FreeBreakfast as BreakIcon,
  PlayArrow as SessionIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers';
import { PageHeader } from '../../../components/common/PageHeader';
import { useMyAttendance } from '../hooks/useMyAttendance';
import {
  formatDuration,
  formatTime,
  formatDayLabel,
} from '../utils/attendance.utils';
import type { DayStatus, DayGroup } from '../../../types';

// ─── Status config ──────────────────────────────────────────
const STATUS_CONFIG: Record<DayStatus, { label: string; color: 'success' | 'warning' | 'error' }> = {
  complete: { label: 'Completo', color: 'success' },
  in_progress: { label: 'En curso', color: 'warning' },
  incomplete: { label: 'Incompleto', color: 'error' },
};

// ─── Quick filter presets ───────────────────────────────────
type QuickFilter = 'today' | 'week' | 'month';

function getQuickFilterDates(preset: QuickFilter): { startDate: string; endDate: string } {
  const now = new Date();
  const endDate = new Date(now);
  endDate.setHours(23, 59, 59, 999);

  let startDate: Date;

  switch (preset) {
    case 'today':
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'week': {
      const dayOfWeek = now.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      startDate = new Date(now);
      startDate.setDate(now.getDate() + mondayOffset);
      startDate.setHours(0, 0, 0, 0);
      break;
    }
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
  }

  return {
    startDate: startDate!.toISOString(),
    endDate: endDate.toISOString(),
  };
}

// ─── Summary Card ───────────────────────────────────────────
interface SummaryCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  loading?: boolean;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ title, value, icon, loading }) => (
  <Paper
    elevation={0}
    sx={{
      p: 2.5,
      border: '1px solid',
      borderColor: 'divider',
      borderRadius: 2,
      display: 'flex',
      alignItems: 'center',
      gap: 2,
    }}
  >
    <Box
      sx={{
        bgcolor: 'primary.main',
        color: 'white',
        borderRadius: 1.5,
        p: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {icon}
    </Box>
    <Box>
      <Typography variant="body2" color="text.secondary">
        {title}
      </Typography>
      {loading ? (
        <Skeleton width={60} height={32} />
      ) : (
        <Typography variant="h5" fontWeight={700}>
          {value}
        </Typography>
      )}
    </Box>
  </Paper>
);

// ─── Day Timeline Card ────────────────────────────────────────
interface DayTimelineCardProps {
  group: DayGroup;
}

const DayTimelineCard: React.FC<DayTimelineCardProps> = ({ group }) => {
  const config = STATUS_CONFIG[group.status];

  // Interleave sessions and breaks
  const timelineEvents: any[] = [];
  group.records.forEach((record, idx) => {
    if (idx > 0 && group.breaks[idx - 1] && group.breaks[idx - 1].minutes > 0) {
      timelineEvents.push({
        id: `break-${idx}`,
        type: 'break',
        title: `Pausa`,
        start: group.breaks[idx - 1].start,
        end: group.breaks[idx - 1].end,
        duration: group.breaks[idx - 1].minutes,
      });
    }

    const durationMins = record.totalMinutes != null
      ? record.totalMinutes
      : Math.floor((Date.now() - new Date(record.clockIn).getTime()) / 60000);

    timelineEvents.push({
      id: `session-${record.id}`,
      type: 'session',
      title: `Sesión ${idx + 1}`,
      start: record.clockIn,
      end: record.clockOut,
      duration: durationMins,
      notes: record.notes,
      isActive: !record.clockOut
    });
  });

  return (
    <Paper
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        mb: 2,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: { xs: 2, sm: 3 },
          py: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          flexWrap: 'wrap',
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.default'
        }}
      >
        <Chip
          label={config.label}
          color={config.color}
          size="small"
          variant={group.status === 'in_progress' ? 'filled' : 'outlined'}
          sx={{ fontWeight: 600, minWidth: 90 }}
        />
        <Typography variant="subtitle1" fontWeight={600} sx={{ textTransform: 'capitalize' }}>
          {formatDayLabel(group.date)}
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Typography variant="body2" color="text.secondary">
          {formatDuration(group.totalMinutes)} trabajado
          {group.breakMinutes > 0 && ` | ${formatDuration(group.breakMinutes)} pausa`}
        </Typography>
        {group.status === 'in_progress' && (
          <ExpandMoreIcon sx={{ transform: 'rotate(180deg)', visibility: 'hidden', width: 0 }} /> // Spacer to align like before if needed
        )}
      </Box>

      {/* Timeline items */}
      <Box sx={{ p: { xs: 2, sm: 3 }, bgcolor: 'background.paper' }}>
        {timelineEvents.map((event) => (
          <Box
            key={event.id}
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              gap: { xs: 1, sm: 2 },
              mb: 1.5,
              py: 1,
              px: { xs: 1, sm: 2 },
              borderRadius: 1,
              bgcolor: 'action.hover',
              '&:last-child': { mb: 0 },
            }}
          >
            {/* Icon */}
            <Box
              sx={{
                mt: 0.25,
                color: event.type === 'session' ? (event.isActive ? 'warning.main' : 'info.main') : 'warning.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {event.type === 'session' ? <SessionIcon fontSize="small" /> : <BreakIcon fontSize="small" />}
            </Box>

            {/* Content */}
            <Box sx={{ flexGrow: 1, display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
              <Typography variant="body2" sx={{ color: 'text.primary', minWidth: 100 }}>
                 {event.title}:
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 1 }}>
                {formatTime(event.start)} &rarr; {event.end ? formatTime(event.end) : (
                  <Chip label="Activo" color="warning" size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
                )}
              </Typography>
            </Box>

            {/* Duration */}
            <Typography
              variant="body2"
              fontWeight={event.type === 'session' && !event.isActive ? 500 : 700}
              color={event.type === 'break' ? 'warning.main' : event.isActive ? 'warning.main' : 'info.main'}
              sx={{ minWidth: 50, textAlign: 'right' }}
            >
              {formatDuration(event.duration)}
            </Typography>

            {/* Notes if applicable - on a new row */}
            {event.notes && (
              <Box sx={{ width: '100%', mt: 0.5, pl: { xs: 3, sm: 4.5 } }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontStyle: 'italic' }}>
                  Nota: {event.notes}
                </Typography>
              </Box>
            )}
          </Box>
        ))}

        {/* Footer Totals */}
        <Divider sx={{ my: 2 }} />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 1 }}>
          <Typography variant="subtitle2" fontWeight={600} color="text.primary">
            Total trabajado: {formatDuration(group.totalMinutes)}
          </Typography>
          {group.breakMinutes > 0 && (
            <Typography variant="subtitle2" color="text.secondary">
              Total pausas: {formatDuration(group.breakMinutes)}
            </Typography>
          )}
        </Box>
      </Box>
    </Paper>
  );
};

// ─── Main Page ──────────────────────────────────────────────
export const MyAttendancePage: React.FC = () => {
  const { summaryQuery, recordsQuery, dayGroups, filters, updateFilters } = useMyAttendance();
  const [activeQuickFilter, setActiveQuickFilter] = useState<QuickFilter>('week');

  const summary = summaryQuery.data;
  const summaryLoading = summaryQuery.isLoading;

  const handleQuickFilter = (preset: QuickFilter) => {
    setActiveQuickFilter(preset);
    const dates = getQuickFilterDates(preset);
    updateFilters({ startDate: dates.startDate, endDate: dates.endDate });
  };

  const handleStartDateChange = (date: Date | null) => {
    setActiveQuickFilter(undefined as any);
    updateFilters({ startDate: date?.toISOString() });
  };

  const handleEndDateChange = (date: Date | null) => {
    setActiveQuickFilter(undefined as any);
    updateFilters({ endDate: date?.toISOString() });
  };

  return (
    <Box>
      <PageHeader
        title="Mi Asistencia"
        subtitle="Consulta tu historial de asistencia, sesiones de trabajo y pausas"
        icon={<WorkHistoryIcon />}
      />

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          <SummaryCard
            title="Horas hoy"
            value={summary ? `${summary.hoursToday}h` : '—'}
            icon={<AccessTimeIcon />}
            loading={summaryLoading}
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <SummaryCard
            title="Horas esta semana"
            value={summary ? `${summary.hoursThisWeek}h` : '—'}
            icon={<CalendarIcon />}
            loading={summaryLoading}
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <SummaryCard
            title="Dias trabajados"
            value={summary ? `${summary.daysWorkedThisWeek}` : '—'}
            icon={<WorkHistoryIcon />}
            loading={summaryLoading}
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <SummaryCard
            title="Promedio diario"
            value={summary ? `${summary.dailyAverage}h` : '—'}
            icon={<TrendingUpIcon />}
            loading={summaryLoading}
          />
        </Grid>
      </Grid>

      {/* Filters */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
        }}
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
          {/* Quick filter chips */}
          <Stack direction="row" spacing={1}>
            <Chip
              label="Hoy"
              variant={activeQuickFilter === 'today' ? 'filled' : 'outlined'}
              color={activeQuickFilter === 'today' ? 'primary' : 'default'}
              onClick={() => handleQuickFilter('today')}
            />
            <Chip
              label="Esta Semana"
              variant={activeQuickFilter === 'week' ? 'filled' : 'outlined'}
              color={activeQuickFilter === 'week' ? 'primary' : 'default'}
              onClick={() => handleQuickFilter('week')}
            />
            <Chip
              label="Este Mes"
              variant={activeQuickFilter === 'month' ? 'filled' : 'outlined'}
              color={activeQuickFilter === 'month' ? 'primary' : 'default'}
              onClick={() => handleQuickFilter('month')}
            />
          </Stack>

          <Box sx={{ flexGrow: 1 }} />

          {/* Date pickers */}
          <Stack direction="row" spacing={1.5}>
            <DatePicker
              label="Desde"
              value={filters.startDate ? new Date(filters.startDate) : null}
              onChange={handleStartDateChange}
              slotProps={{ textField: { size: 'small', sx: { maxWidth: 170 } } }}
            />
            <DatePicker
              label="Hasta"
              value={filters.endDate ? new Date(filters.endDate) : null}
              onChange={handleEndDateChange}
              slotProps={{ textField: { size: 'small', sx: { maxWidth: 170 } } }}
            />
          </Stack>
        </Stack>
      </Paper>

      {/* Day list */}
      {recordsQuery.isLoading ? (
        <Stack spacing={1.5}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rounded" height={64} />
          ))}
        </Stack>
      ) : dayGroups.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          No se encontraron registros de asistencia para el periodo seleccionado.
        </Alert>
      ) : (
        dayGroups.map((group) => <DayTimelineCard key={group.date} group={group} />)
      )}
    </Box>
  );
};

export default MyAttendancePage;
