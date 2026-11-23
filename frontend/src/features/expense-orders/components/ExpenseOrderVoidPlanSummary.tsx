import React from 'react';
import { Alert, Box, Chip, Stack, Typography } from '@mui/material';
import { formatCurrency } from '../../../utils/formatters';
import { formatDateTime, formatSigned } from '../../cash-register/utils/cashTransfer';
import { PAYMENT_METHOD_LABELS, PaymentMethod } from '../../../types/expense-order.types';
import type { ExpenseOrderVoidPlan } from '../../../types/expense-order-void-request.types';

const methodLabel = (method: string) => PAYMENT_METHOD_LABELS[method as PaymentMethod] ?? method;

/**
 * Qué toca anular la OG: egresos, cierres de caja que se corrigen, la cuenta
 * por pagar y los rollos. Se usa al pedir la anulación y al aprobarla.
 */
const ExpenseOrderVoidPlanSummary: React.FC<{ plan: ExpenseOrderVoidPlan }> = ({ plan }) => {
  const openChange = Number(plan.openSessionsCashChange);
  const lotsToVoid = plan.lots.filter((l) => !l.alreadyVoided && !l.used);

  return (
    <Stack spacing={1.5}>
      <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
        <Typography variant="subtitle2" gutterBottom>
          Al aprobarse:
        </Typography>
        <Stack component="ul" spacing={0.5} sx={{ m: 0, pl: 2.5 }}>
          {plan.movements.length === 0 ? (
            <Typography component="li" variant="body2">
              La OG no tiene egresos de caja: no se mueve dinero.
            </Typography>
          ) : (
            plan.movements.map((m) => (
              <Typography component="li" variant="body2" key={m.id}>
                Se anula <strong>{m.receiptNumber}</strong>: {formatCurrency(m.amount)} en {methodLabel(m.paymentMethod).toLowerCase()},{' '}
                {m.session.status === 'OPEN'
                  ? `caja abierta (${m.session.cashRegisterName})`
                  : `caja cerrada el ${formatDateTime(m.session.closedAt)}`}
              </Typography>
            ))
          )}
          {plan.accountPayable && (
            <Typography component="li" variant="body2">
              La cuenta por pagar <strong>{plan.accountPayable.apNumber}</strong> queda anulada
              {plan.accountPayable.paymentsToReverse > 0
                ? ` y se revierte${plan.accountPayable.paymentsToReverse === 1 ? ' su abono' : `n sus ${plan.accountPayable.paymentsToReverse} abonos`}`
                : ''}
              .
            </Typography>
          )}
          {lotsToVoid.length > 0 && (
            <Typography component="li" variant="body2">
              Se anula{lotsToVoid.length === 1 ? ' el rollo' : 'n los rollos'}{' '}
              <strong>{lotsToVoid.map((l) => l.code).join(', ')}</strong> y su saldo sale del inventario.
            </Typography>
          )}
          <Typography component="li" variant="body2">
            La OG queda <strong>Anulada</strong>: no se borra y deja de contar como costo.
          </Typography>
        </Stack>
      </Box>

      {plan.closings.map((c) => (
        <Box
          key={c.sessionId}
          sx={{ p: 2, borderRadius: 1, border: 1, borderColor: c.worsens ? 'warning.main' : 'divider' }}
        >
          <Typography variant="subtitle2" gutterBottom>
            Cierre del {formatDateTime(c.closedAt)} · {c.cashRegisterName}
          </Typography>
          <Stack spacing={0.5}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
              <Typography variant="body2" color="text.secondary">Esperado</Typography>
              <Typography variant="body2">
                {formatCurrency(c.systemBalanceBefore)} → <strong>{formatCurrency(c.systemBalanceAfter)}</strong>
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2" color="text.secondary">Diferencia</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2">
                  {formatSigned(c.discrepancyBefore)} → <strong>{formatSigned(c.discrepancyAfter)}</strong>
                </Typography>
                {c.worsens && <Chip label="Empeora" color="warning" size="small" />}
              </Box>
            </Box>
          </Stack>
          {c.worsens && (
            <Alert severity="warning" sx={{ mt: 1.5 }}>
              Ese día la caja cuadraba o le sobraba menos. Si el dinero sí salió del cajón, anular el egreso
              deja un faltante en ese cierre.
            </Alert>
          )}
          {c.crossesMonth && (
            <Alert severity="warning" sx={{ mt: 1.5 }}>
              Cambia el arqueo de <strong>{c.monthLabel}</strong>. Avísale a contabilidad.
            </Alert>
          )}
        </Box>
      ))}

      {openChange !== 0 && (
        <Typography variant="body2" color="text.secondary">
          La caja abierta esperará <strong>{formatCurrency(Math.abs(openChange))} {openChange > 0 ? 'más' : 'menos'}</strong> en
          efectivo.
        </Typography>
      )}

      {lotsToVoid.length > 0 && (
        <Alert severity="warning">
          Esta OG compró {lotsToVoid.length === 1 ? 'el rollo' : 'los rollos'}{' '}
          <strong>{lotsToVoid.map((l) => l.code).join(', ')}</strong>. Al anularla{' '}
          {lotsToVoid.length === 1 ? 'se anula también y su saldo sale' : 'se anulan también y su saldo sale'} del inventario.
          Si {lotsToVoid.length === 1 ? 'el rollo existe' : 'los rollos existen'} y solo el valor de la OG estaba mal, no la
          anules: corrígela.
        </Alert>
      )}
    </Stack>
  );
};

export default ExpenseOrderVoidPlanSummary;
