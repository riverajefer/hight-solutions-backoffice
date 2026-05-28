import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Typography,
  Divider,
  Box,
  CircularProgress,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import { useNavigate } from 'react-router-dom';
import { useDtfDetail, useDtfStatusHistory, useDtfMutations } from '../hooks/useDtf';
import { DtfStatusChip } from './DtfStatusChip';
import { DtfStatusStepper } from './DtfStatusStepper';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import { PATHS } from '../../../router/paths';
import { useAuthStore } from '../../../store/authStore';
import { PERMISSIONS } from '../../../utils/constants';
import type { DtfStatus } from '../../../types/dtf.types';

const NEXT_STATUSES: Record<DtfStatus, DtfStatus[]> = {
  BORRADOR: ['ENVIADA'],
  ENVIADA: ['EN_IMPRESION', 'BORRADOR'],
  EN_IMPRESION: ['COMPLETADA'],
  COMPLETADA: [],
  CONVERTIDA_EN_OP: [],
};

const STATUS_ACTION_LABELS: Record<DtfStatus, string> = {
  BORRADOR: 'Devolver a borrador',
  ENVIADA: 'Marcar como enviada',
  EN_IMPRESION: 'Pasar a impresión',
  COMPLETADA: 'Marcar como completada',
  CONVERTIDA_EN_OP: 'Convertir en OP',
};

const STATUS_ACTION_COLORS: Record<DtfStatus, 'inherit' | 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning'> = {
  BORRADOR: 'error',
  ENVIADA: 'primary',
  EN_IMPRESION: 'warning',
  COMPLETADA: 'success',
  CONVERTIDA_EN_OP: 'secondary',
};

interface RowProps {
  label: string;
  value: React.ReactNode;
}

function Row({ label, value }: RowProps) {
  return (
    <Stack direction="row" spacing={2} alignItems="flex-start">
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 130, flexShrink: 0 }}>
        {label}:
      </Typography>
      <Typography variant="body2" component="div">
        {value}
      </Typography>
    </Stack>
  );
}

interface DtfQuickPreviewModalProps {
  id: string | null;
  onClose: () => void;
}

export function DtfQuickPreviewModal({ id, onClose }: DtfQuickPreviewModalProps) {
  const navigate = useNavigate();
  const { hasPermission } = useAuthStore();
  const { changeStatus } = useDtfMutations();
  const detailQuery = useDtfDetail(id ?? '');
  const historyQuery = useDtfStatusHistory(id ?? undefined);
  const record = detailQuery.data;

  const handleGoToDetail = () => {
    if (id) {
      onClose();
      navigate(PATHS.DTF_DETAIL.replace(':id', id));
    }
  };

  const handleChangeStatus = async (status: DtfStatus) => {
    if (!id) return;
    await changeStatus.mutateAsync({ id, dto: { status } });
  };

  const canChangeStatus = hasPermission(PERMISSIONS.CHANGE_DTF_STATUS);
  const nextStatuses = record ? (NEXT_STATUSES[record.status] ?? []) : [];
  const actionableStatuses = nextStatuses.filter((s) => s !== 'CONVERTIDA_EN_OP');

  return (
    <Dialog
      open={!!id}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 2 } }}
    >
      <DialogTitle sx={{ pr: 6 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="h6" fontWeight={600}>
            {record?.consecutive ?? '—'}
          </Typography>
          {record && <DtfStatusChip status={record.status} />}
        </Stack>
        <IconButton
          size="small"
          onClick={onClose}
          sx={{ position: 'absolute', right: 12, top: 12 }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {detailQuery.isLoading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress size={32} />
          </Box>
        ) : !record ? (
          <Typography color="error" variant="body2">
            No se pudo cargar el registro.
          </Typography>
        ) : (
          <Stack spacing={2.5}>
            {/* Stepper */}
            <Box>
              <DtfStatusStepper
                currentStatus={record.status}
                history={historyQuery.data ?? []}
                isLoading={historyQuery.isLoading}
              />
            </Box>

            {/* Acciones de estado */}
            {canChangeStatus && actionableStatuses.length > 0 && (
              <>
                <Divider />
                <Stack spacing={1}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Cambiar estado
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {actionableStatuses.map((s) => (
                      <Button
                        key={s}
                        size="small"
                        variant={s === 'BORRADOR' ? 'outlined' : 'contained'}
                        color={s === 'COMPLETADA' ? undefined : STATUS_ACTION_COLORS[s]}
                        sx={s === 'COMPLETADA' ? {
                          background: 'linear-gradient(135deg, #00C853, #1B5E20)',
                          boxShadow: '0 0 10px rgba(0, 200, 83, 0.5)',
                          color: '#fff',
                          fontWeight: 700,
                          '&:hover': {
                            background: 'linear-gradient(135deg, #69F0AE, #00C853)',
                          },
                        } : undefined}
                        startIcon={
                          changeStatus.isPending
                            ? <CircularProgress size={14} color="inherit" />
                            : <SwapHorizIcon fontSize="small" />
                        }
                        disabled={changeStatus.isPending}
                        onClick={() => handleChangeStatus(s)}
                      >
                        {STATUS_ACTION_LABELS[s]}
                      </Button>
                    ))}
                  </Stack>
                </Stack>
              </>
            )}

            <Divider />

            {/* Info general */}
            <Stack spacing={1}>
              <Typography variant="subtitle2" color="text.secondary">
                Información General
              </Typography>
              <Stack spacing={1}>
                <Row label="Producto" value={record.product?.name} />
                <Row label="Cliente" value={record.client?.name} />
                <Row label="Fecha" value={formatDate(record.createdAt)} />
                {record.notes && <Row label="Notas" value={record.notes} />}
              </Stack>
            </Stack>

            <Divider />

            {/* Valores */}
            <Stack spacing={1}>
              <Typography variant="subtitle2" color="text.secondary">
                Valores
              </Typography>
              <Stack spacing={1}>
                <Row
                  label="Cantidad"
                  value={`${Number(record.quantity).toLocaleString('es-CO')} cm`}
                />
                <Row
                  label="Precio unitario"
                  value={formatCurrency(Number(record.unitPrice))}
                />
                <Row
                  label="Valor total"
                  value={
                    <Typography variant="body2" fontWeight={600}>
                      {formatCurrency(Number(record.value))}
                    </Typography>
                  }
                />
              </Stack>
            </Stack>
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={onClose} size="small">
          Cerrar
        </Button>
        <Button
          variant="contained"
          size="small"
          endIcon={<OpenInNewIcon fontSize="small" />}
          onClick={handleGoToDetail}
        >
          Ver detalle completo
        </Button>
      </DialogActions>
    </Dialog>
  );
}
