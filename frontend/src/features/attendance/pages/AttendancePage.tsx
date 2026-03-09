import React, { useMemo, useState } from 'react';
import {
  Box,
  Chip,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Paper,
  Grid,
  alpha,
  useTheme,
  CircularProgress,
} from '@mui/material';
import { GridRenderCellParams } from '@mui/x-data-grid';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import EditIcon from '@mui/icons-material/Edit';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import { PageHeader } from '../../../components/common/PageHeader';
import { DataTable } from '../../../components/common/DataTable';
import { useAttendance } from '../hooks/useAttendance';
import { useAuthStore } from '../../../store/authStore';
import { PERMISSIONS } from '../../../utils/constants';
import {
  AttendanceRecord,
  AttendanceSource,
  AdjustAttendanceDto,
} from '../../../types';
import { useResponsiveColumns, type ResponsiveGridColDef } from '../../../hooks';

/**
 * Formatea una fecha ISO a localización colombiana
 */
const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

/**
 * Formatea minutos en "Xh Ym"
 */
const formatMinutes = (mins?: number | null): string => {
  if (!mins && mins !== 0) return '—';
  if (mins < 1) return '< 1m';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};

/**
 * Color del badge según source
 */
const sourceBadgeColor = (source: AttendanceSource) => {
  switch (source) {
    case 'BUTTON': return 'success';
    case 'INACTIVITY': return 'warning';
    case 'LOGOUT': return 'info';
    case 'SYSTEM': return 'error';
    default: return 'default';
  }
};

/**
 * Etiqueta del source en español
 */
const sourceLabel = (source: AttendanceSource, type: string) => {
  switch (source) {
    case 'BUTTON': return type === 'MANUAL' ? 'Manual' : 'Manual';
    case 'INACTIVITY': return 'Inactividad';
    case 'LOGOUT': return 'Logout';
    case 'SYSTEM': return 'Sistema';
    default: return source;
  }
};

const AttendancePage: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { hasPermission } = useAuthStore();
  const canManage = hasPermission(PERMISSIONS.MANAGE_ATTENDANCE);

  const { recordsQuery, adjustMutation } = useAttendance();
  const records: AttendanceRecord[] = recordsQuery.data?.data || [];

  // ── Estado para el diálogo de ajuste ──
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [adjustForm, setAdjustForm] = useState<AdjustAttendanceDto>({ reason: '' });

  const handleOpenAdjust = (record: AttendanceRecord) => {
    setSelectedRecord(record);
    setAdjustForm({
      clockIn: record.clockIn,
      clockOut: record.clockOut,
      notes: record.notes || '',
      reason: '',
    });
    setAdjustOpen(true);
  };

  const handleConfirmAdjust = () => {
    if (!selectedRecord) return;
    adjustMutation.mutate(
      { id: selectedRecord.id, dto: adjustForm },
      { onSuccess: () => setAdjustOpen(false) }
    );
  };

  // ── Resumen: total horas del día y semana ──
  const summary = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    let todayMins = 0;
    let weekMins = 0;

    for (const r of records) {
      const clockInDate = new Date(r.clockIn);
      const mins = r.totalMinutes || 0;
      if (clockInDate >= today) todayMins += mins;
      if (clockInDate >= weekAgo) weekMins += mins;
    }

    return { todayMins, weekMins };
  }, [records]);

  // ── Columnas ──
  const rawColumns: ResponsiveGridColDef[] = useMemo(() => [
    {
      field: 'user',
      headerName: 'Usuario',
      flex: 1,
      minWidth: 160,
      renderCell: (params: GridRenderCellParams<AttendanceRecord>) => {
        const u = params.row.user;
        const name = u?.firstName && u?.lastName
          ? `${u.firstName} ${u.lastName}`
          : (u?.email || '—');
        return (
          <Typography variant="body2" fontWeight={500}>
            {name}
          </Typography>
        );
      },
    },
    {
      field: 'email',
      headerName: 'Email',
      flex: 1,
      minWidth: 180,
      responsive: 'md',
      valueGetter: (_v: any, row: AttendanceRecord) => row.user?.email || '—',
    },
    {
      field: 'area',
      headerName: 'Área',
      width: 130,
      responsive: 'md',
      valueGetter: (_v: any, row: AttendanceRecord) => row.user?.cargo?.area?.name || '—',
    },
    {
      field: 'cargo',
      headerName: 'Cargo',
      width: 130,
      responsive: 'md',
      valueGetter: (_v: any, row: AttendanceRecord) => row.user?.cargo?.name || '—',
    },
    {
      field: 'clockIn',
      headerName: 'Entrada',
      width: 175,
      responsive: 'sm',
      renderCell: (params: GridRenderCellParams<AttendanceRecord>) => (
        <Chip
          icon={<LoginIcon />}
          label={formatDate(params.row.clockIn)}
          color="success"
          variant="outlined"
          size="small"
        />
      ),
    },
    {
      field: 'clockOut',
      headerName: 'Salida',
      width: 175,
      responsive: 'sm',
      renderCell: (params: GridRenderCellParams<AttendanceRecord>) => {
        if (!params.row.clockOut) {
          return <Chip label="Activo" color="success" size="small" />;
        }
        return (
          <Chip
            icon={<LogoutIcon />}
            label={formatDate(params.row.clockOut)}
            color="error"
            variant="outlined"
            size="small"
          />
        );
      },
    },
    {
      field: 'totalMinutes',
      headerName: 'Tiempo',
      width: 110,
      align: 'center',
      headerAlign: 'center',
      responsive: 'sm',
      renderCell: (params: GridRenderCellParams<AttendanceRecord>) => (
        <Chip
          icon={<AccessTimeIcon sx={{ fontSize: 14 }} />}
          label={formatMinutes(params.row.totalMinutes)}
          size="small"
          color={params.row.clockOut ? 'default' : 'info'}
          variant="outlined"
        />
      ),
    },
    {
      field: 'source',
      headerName: 'Tipo',
      width: 110,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<AttendanceRecord>) => (
        <Chip
          label={sourceLabel(params.row.source, params.row.type)}
          color={sourceBadgeColor(params.row.source) as any}
          size="small"
        />
      ),
    },
    ...(canManage
      ? [{
          field: 'actions',
          headerName: 'Ajustar',
          width: 90,
          align: 'center' as const,
          headerAlign: 'center' as const,
          sortable: false,
          renderCell: (params: GridRenderCellParams<AttendanceRecord>) => (
            <Button
              size="small"
              startIcon={<EditIcon sx={{ fontSize: 14 }} />}
              onClick={() => handleOpenAdjust(params.row)}
              sx={{ fontSize: '0.7rem', minWidth: 0, px: 1 }}
            >
              Ajustar
            </Button>
          ),
        }]
      : []),
  ], [canManage]);

  const columns = useResponsiveColumns(rawColumns);

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      <PageHeader
        title="Control de Asistencia"
        subtitle="Registros de entrada y salida de los usuarios"
      />

      {/* Resumen de horas */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Paper
            sx={{
              p: 2,
              borderRadius: 2,
              background: isDark
                ? alpha('#00e5ff', 0.07)
                : alpha(theme.palette.success.main, 0.06),
              border: `1px solid ${isDark
                ? alpha('#00e5ff', 0.2)
                : alpha(theme.palette.success.main, 0.2)}`,
            }}
          >
            <Typography variant="caption" color="text.secondary">
              Hoy (total registros)
            </Typography>
            <Typography variant="h6" fontWeight={700} color={isDark ? '#00e5ff' : 'success.main'}>
              {formatMinutes(summary.todayMins)}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper
            sx={{
              p: 2,
              borderRadius: 2,
              background: isDark
                ? alpha('#7c4dff', 0.07)
                : alpha(theme.palette.primary.main, 0.06),
              border: `1px solid ${isDark
                ? alpha('#7c4dff', 0.2)
                : alpha(theme.palette.primary.main, 0.2)}`,
            }}
          >
            <Typography variant="caption" color="text.secondary">
              Últimos 7 días
            </Typography>
            <Typography variant="h6" fontWeight={700} color={isDark ? '#7c4dff' : 'primary.main'}>
              {formatMinutes(summary.weekMins)}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <DataTable
        rows={records}
        columns={columns}
        loading={recordsQuery.isLoading}
        searchPlaceholder="Buscar registros de asistencia..."
        emptyMessage="No se encontraron registros de asistencia"
      />

      {/* Dialog de ajuste */}
      <Dialog
        open={adjustOpen}
        onClose={() => !adjustMutation.isPending && setAdjustOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '16px',
            background: isDark
              ? 'linear-gradient(135deg, #0d1b2a 0%, #1a1040 100%)'
              : undefined,
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>Ajustar Registro de Asistencia</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Ajusta los horarios del registro. La justificación es obligatoria.
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Hora de Entrada"
              type="datetime-local"
              value={adjustForm.clockIn ? adjustForm.clockIn.slice(0, 16) : ''}
              onChange={(e) =>
                setAdjustForm((f) => ({
                  ...f,
                  clockIn: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                }))
              }
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="Hora de Salida (opcional)"
              type="datetime-local"
              value={adjustForm.clockOut ? adjustForm.clockOut.slice(0, 16) : ''}
              onChange={(e) =>
                setAdjustForm((f) => ({
                  ...f,
                  clockOut: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                }))
              }
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="Notas"
              multiline
              rows={2}
              value={adjustForm.notes || ''}
              onChange={(e) => setAdjustForm((f) => ({ ...f, notes: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Justificación del ajuste *"
              multiline
              rows={2}
              required
              value={adjustForm.reason}
              onChange={(e) => setAdjustForm((f) => ({ ...f, reason: e.target.value }))}
              fullWidth
              helperText="Describe el motivo del ajuste"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setAdjustOpen(false)}
            disabled={adjustMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirmAdjust}
            disabled={adjustMutation.isPending || !adjustForm.reason.trim()}
            startIcon={
              adjustMutation.isPending
                ? <CircularProgress size={14} color="inherit" />
                : undefined
            }
          >
            Guardar Ajuste
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AttendancePage;
