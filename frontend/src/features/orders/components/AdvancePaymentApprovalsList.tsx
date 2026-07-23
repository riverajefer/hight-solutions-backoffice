import React from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  Chip,
  Box,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import CancelIcon from '@mui/icons-material/Cancel';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  AdvancePaymentApproval,
  PAYMENT_METHOD_LABELS,
} from '../../../types/order.types';

interface AdvancePaymentApprovalsListProps {
  approvals?: AdvancePaymentApproval[];
}

type StatusColor = 'success' | 'warning' | 'error';

const STATUS_CONFIG: Record<
  AdvancePaymentApproval['status'],
  { label: string; color: StatusColor; icon: React.ReactElement }
> = {
  APPROVED: {
    label: 'Aprobada',
    color: 'success',
    icon: <CheckCircleIcon fontSize="small" />,
  },
  PENDING: {
    label: 'Pendiente',
    color: 'warning',
    icon: <HourglassEmptyIcon fontSize="small" />,
  },
  REJECTED: {
    label: 'Rechazada',
    color: 'error',
    icon: <CancelIcon fontSize="small" />,
  },
};

const formatDateLong = (date: string): string =>
  format(new Date(date), "d 'de' MMMM, yyyy HH:mm", { locale: es });

const formatCurrency = (value: string): string =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(parseFloat(value));

const formatUser = (user?: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string;
} | null): string => {
  if (!user) return '-';
  const name = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
  return name || user.email || '-';
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <Box>
    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
      {label}
    </Typography>
    <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
      {children}
    </Typography>
  </Box>
);

export const AdvancePaymentApprovalsList: React.FC<AdvancePaymentApprovalsListProps> = ({
  approvals,
}) => {
  if (!approvals || approvals.length === 0) {
    return null;
  }

  const sorted = [...approvals].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <Card variant="outlined" sx={{ mt: 2 }}>
      <CardHeader
        title="Historial de Autorizaciones de Anticipo"
        titleTypographyProps={{ variant: 'h6', fontSize: '1.1rem' }}
        sx={{ pb: 0 }}
      />
      <CardContent>
        <Stack spacing={2}>
          {sorted.map((approval) => {
            const config = STATUS_CONFIG[approval.status] ?? {
              label: approval.status,
              color: 'warning' as StatusColor,
              icon: <HourglassEmptyIcon fontSize="small" />,
            };
            const isRejected = approval.status === 'REJECTED';

            return (
              <Box
                key={approval.id}
                sx={(theme) => ({
                  border: '1px solid',
                  borderColor: alpha(theme.palette[config.color].main, 0.35),
                  borderLeft: '4px solid',
                  borderLeftColor: `${config.color}.main`,
                  borderRadius: 1.5,
                  p: 2,
                })}
              >
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  flexWrap="wrap"
                  gap={1}
                  mb={1.5}
                >
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ color: `${config.color}.main`, display: 'flex' }}>
                      {config.icon}
                    </Box>
                    <Typography variant="subtitle2" fontWeight={600}>
                      {approval.paymentAmount
                        ? formatCurrency(approval.paymentAmount)
                        : 'Anticipo'}
                      {approval.paymentMethod &&
                        ` · ${PAYMENT_METHOD_LABELS[approval.paymentMethod]}`}
                    </Typography>
                  </Stack>
                  <Chip label={config.label} color={config.color} size="small" />
                </Stack>

                <Stack spacing={1}>
                  <Field label="Fecha de solicitud">
                    {formatDateLong(approval.createdAt)}
                  </Field>
                  <Field label="Solicitante">
                    {formatUser(approval.requestedBy)}
                    {approval.requestedBy?.email && (
                      <Typography
                        component="span"
                        variant="caption"
                        color="text.secondary"
                      >
                        {' '}
                        ({approval.requestedBy.email})
                      </Typography>
                    )}
                  </Field>
                  {approval.reason && (
                    <Field label="Motivo de la solicitud">{approval.reason}</Field>
                  )}

                  {approval.status !== 'PENDING' && (
                    <>
                      <Divider />
                      <Field label={isRejected ? 'Rechazado por' : 'Aprobado por'}>
                        {formatUser(approval.reviewedBy)}
                      </Field>
                      {approval.reviewedAt && (
                        <Field
                          label={isRejected ? 'Fecha de rechazo' : 'Fecha de aprobación'}
                        >
                          {formatDateLong(approval.reviewedAt)}
                        </Field>
                      )}
                      {approval.reviewNotes && (
                        <Field label="Notas de revisión">{approval.reviewNotes}</Field>
                      )}
                    </>
                  )}

                  {isRejected && (
                    <Typography variant="caption" color="text.secondary">
                      El pago fue eliminado del historial de pagos y no se descuenta
                      del saldo.
                    </Typography>
                  )}
                </Stack>
              </Box>
            );
          })}
        </Stack>
      </CardContent>
    </Card>
  );
};
