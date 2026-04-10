import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
  Alert,
  CircularProgress,
  Stack,
} from '@mui/material';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import { PageHeader } from '../../../components/common/PageHeader';
import { useCashRegisters, useCashMutations } from '../hooks/useCashRegister';
import DenominationForm, {
  buildInitialRows,
  toDenominationDtoList,
} from '../components/DenominationForm';
import { PATHS } from '../../../router/paths';

const OpenSessionPage: React.FC = () => {
  const navigate = useNavigate();
  const registersQuery = useCashRegisters();
  const { openSession } = useCashMutations();

  const [cashRegisterId, setCashRegisterId] = useState('');
  const [denominationRows, setDenominationRows] = useState(buildInitialRows());
  const [notes] = useState('');

  const activeRegisters = (registersQuery.data || []).filter((r) => r.isActive);

  const handleSubmit = async () => {
    if (!cashRegisterId) return;

    const denominations = toDenominationDtoList(denominationRows);

    const session = await openSession.mutateAsync({
      cashRegisterId,
      denominations,
      notes: notes || undefined,
    });

    if (session) {
      navigate(
        PATHS.CASH_SESSION_ACTIVE.replace(':id', session.id),
      );
    }
  };

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 }, maxWidth: 700, mx: 'auto' }}>
      <PageHeader
        title="Abrir Sesión de Caja"
        subtitle="Selecciona la caja e ingresa el fondo de apertura"
      />

      <Stack spacing={3}>
        {/* Register selector */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              1. Seleccionar Caja
            </Typography>

            {registersQuery.isLoading ? (
              <CircularProgress size={24} />
            ) : activeRegisters.length === 0 ? (
              <Alert severity="warning">
                No hay cajas registradoras activas. Pide a un administrador que cree una.
              </Alert>
            ) : (
              <FormControl fullWidth>
                <InputLabel>Caja Registradora</InputLabel>
                <Select
                  value={cashRegisterId}
                  onChange={(e) => setCashRegisterId(e.target.value)}
                  label="Caja Registradora"
                >
                  {activeRegisters.map((reg) => (
                    <MenuItem
                      key={reg.id}
                      value={reg.id}
                      disabled={(reg._count?.sessions ?? 0) > 0}
                    >
                      {reg.name}
                      {(reg._count?.sessions ?? 0) > 0 && (
                        <Typography
                          variant="caption"
                          color="warning.main"
                          sx={{ ml: 1 }}
                        >
                          (sesión abierta)
                        </Typography>
                      )}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </CardContent>
        </Card>

        {/* Denomination form */}
        {cashRegisterId && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                2. Conteo de Fondo de Apertura
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Ingresa la cantidad de cada denominación en el fondo inicial de caja.
              </Typography>

              <DenominationForm
                value={denominationRows}
                onChange={setDenominationRows}
              />
            </CardContent>
          </Card>
        )}

        {/* Submit button */}
        {cashRegisterId && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={() => navigate(-1)}
              disabled={openSession.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="contained"
              color="success"
              size="large"
              startIcon={
                openSession.isPending ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  <LockOpenIcon />
                )
              }
              onClick={handleSubmit}
              disabled={openSession.isPending}
            >
              Abrir Sesión
            </Button>
          </Box>
        )}
      </Stack>
    </Box>
  );
};

export default OpenSessionPage;
