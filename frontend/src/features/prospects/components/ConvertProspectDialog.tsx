import React, { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { ClientSelector } from '../../orders/components/ClientSelector';
import type { Client } from '../../../types/client.types';
import {
  Prospect,
  ProspectConversionTarget,
} from '../../../types/prospect.types';

interface ConvertProspectDialogProps {
  open: boolean;
  prospect?: Prospect | null;
  isSaving?: boolean;
  currentUserId?: string;
  isAdmin?: boolean;
  onClose: () => void;
  onConfirm: (clientId: string, target: ProspectConversionTarget) => void;
}

/**
 * Un prospecto guarda datos sueltos, pero una cotización necesita un `Client`,
 * que a su vez exige departamento y ciudad. Este modal cubre ese salto:
 * reutiliza `ClientSelector` para elegir un cliente existente o crear uno nuevo
 * con los datos completos.
 */
export const ConvertProspectDialog: React.FC<ConvertProspectDialogProps> = ({
  open,
  prospect,
  isSaving = false,
  currentUserId,
  isAdmin,
  onClose,
  onConfirm,
}) => {
  const [client, setClient] = useState<Client | null>(null);
  const [target, setTarget] = useState<ProspectConversionTarget>('QUOTE');

  useEffect(() => {
    if (!open) return;
    setClient(null);
    setTarget('QUOTE');
  }, [open]);

  const datos = [prospect?.name, prospect?.phone, prospect?.email]
    .filter(Boolean)
    .join(' · ');

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Convertir prospecto</DialogTitle>
      <DialogContent>
        {datos && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {datos}
          </Typography>
        )}

        <Alert severity="info" sx={{ mb: 2 }}>
          Elige el cliente al que quedará asociado. Si aún no existe, créalo
          desde aquí con los datos del prospecto.
        </Alert>

        <ToggleButtonGroup
          value={target}
          exclusive
          fullWidth
          size="small"
          onChange={(_, v) => v && setTarget(v)}
          sx={{ mb: 2 }}
        >
          <ToggleButton value="QUOTE">A cotización</ToggleButton>
          <ToggleButton value="ORDER">A orden de pedido</ToggleButton>
        </ToggleButtonGroup>

        <ClientSelector
          value={client}
          onChange={setClient}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          documentType={target === 'QUOTE' ? 'cotización' : 'orden'}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          variant="contained"
          disabled={!client || isSaving}
          onClick={() => client && onConfirm(client.id, target)}
        >
          {isSaving ? 'Convirtiendo...' : 'Continuar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
