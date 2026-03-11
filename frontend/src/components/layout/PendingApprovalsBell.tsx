import React, { useMemo } from 'react';
import { IconButton, Badge, Tooltip } from '@mui/material';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { PATHS } from '../../router/paths';

import { orderStatusChangeRequestsApi } from '../../api/order-status-change-requests.api';
import { editRequestsApi } from '../../api/edit-requests.api';
import { expenseOrderAuthRequestsApi } from '../../api/expense-order-auth-requests.api';
import { advancePaymentApprovalsApi } from '../../api/advance-payment-approvals.api';
import { clientOwnershipAuthRequestsApi } from '../../api/client-ownership-auth-requests.api';

export const PendingApprovalsBell: React.FC = () => {
  const navigate = useNavigate();
  const { user, hasPermission } = useAuthStore();

  const isAdmin = user?.role?.name === 'admin';
  const canApproveOrders = hasPermission('approve_orders') || isAdmin;
  const canApproveAdvancePayments = hasPermission('approve_advance_payments') || isAdmin;
  const canApproveClientOwnership = hasPermission('approve_client_ownership_auth') || isAdmin;

  const { data: statusRequests } = useQuery({
    queryKey: ['statusChangeRequests', 'pending', 'badge'],
    queryFn: () => orderStatusChangeRequestsApi.findPending(),
    enabled: !!canApproveOrders,
  });

  const { data: editRequests } = useQuery({
    queryKey: ['editRequests', 'pending', 'badge'],
    queryFn: () => editRequestsApi.findAllPending(),
    enabled: !!canApproveOrders,
  });

  const { data: ogAuthRequests } = useQuery({
    queryKey: ['ogAuthRequests', 'pending', 'badge'],
    queryFn: () => expenseOrderAuthRequestsApi.findPending(),
    enabled: !!isAdmin,
  });

  const { data: advanceRequests } = useQuery({
    queryKey: ['advancePaymentApprovals', 'pending', 'badge'],
    queryFn: () => advancePaymentApprovalsApi.findPending(),
    enabled: !!canApproveAdvancePayments,
  });

  const { data: ownershipRequests } = useQuery({
    queryKey: ['clientOwnershipAuthRequests', 'pending', 'badge'],
    queryFn: () => clientOwnershipAuthRequestsApi.findPending(),
    enabled: !!canApproveClientOwnership,
  });

  const totalPending = useMemo(() => {
    let count = 0;
    if (statusRequests) count += statusRequests.length;
    if (editRequests) count += editRequests.length;
    if (ogAuthRequests) count += ogAuthRequests.length;
    if (advanceRequests) count += advanceRequests.length;
    if (ownershipRequests) count += ownershipRequests.length;
    return count;
  }, [statusRequests, editRequests, ogAuthRequests, advanceRequests, ownershipRequests]);

  const hasAnyPermission = canApproveOrders || canApproveAdvancePayments || canApproveClientOwnership || isAdmin;

  if (!hasAnyPermission) {
    return null;
  }

  const handleClick = () => {
    navigate(`${PATHS.ORDERS}/status-change-requests`);
  };

  return (
    <Tooltip title="Gestionar solicitudes pendientes de aprobación">
      <IconButton color="inherit" onClick={handleClick}>
        <Badge badgeContent={totalPending} color="warning">
          <AssignmentTurnedInIcon />
        </Badge>
      </IconButton>
    </Tooltip>
  );
};
