import React from 'react';
import { Alert } from '@mui/material';
import { HourglassEmpty as HourglassEmptyIcon } from '@mui/icons-material';
import { useAdvisorChangeRequest } from '../hooks/useAdvisorChangeRequests';

const userName = (u?: {
  firstName: string | null;
  lastName: string | null;
  email: string;
} | null): string => {
  if (!u) return 'otro asesor';
  return [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email;
};

interface AdvisorChangeStatusAlertProps {
  orderId: string;
}

/**
 * Muestra un aviso cuando hay una solicitud de cambio de asesor pendiente
 * de aprobación para la OP.
 */
export const AdvisorChangeStatusAlert: React.FC<
  AdvisorChangeStatusAlertProps
> = ({ orderId }) => {
  const { orderRequestQuery } = useAdvisorChangeRequest(orderId);
  const request = orderRequestQuery.data;

  if (!request || request.status !== 'PENDING') {
    return null;
  }

  return (
    <Alert severity="warning" icon={<HourglassEmptyIcon />} sx={{ mt: 2 }}>
      <strong>Cambio de asesor pendiente de aprobación.</strong> Se solicitó
      reasignar el asesor de esta orden a{' '}
      <strong>{userName(request.requestedAdvisor)}</strong>. El cambio se
      aplicará cuando un administrador lo apruebe.
    </Alert>
  );
};
