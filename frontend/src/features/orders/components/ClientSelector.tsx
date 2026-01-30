import React, { useState } from 'react';
import {
  Autocomplete,
  TextField,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Stack,
  Box,
  IconButton,
} from '@mui/material';
import {
  Add as AddIcon,
  Close as CloseIcon,
  Business as BusinessIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useClients } from '../../clients/hooks/useClients';
import type { Client } from '../../../types/client.types';
import { CreateClientModal } from './CreateClientModal';

interface ClientSelectorProps {
  value: Client | null;
  onChange: (client: Client | null) => void;
  error?: boolean;
  helperText?: string;
}

export const ClientSelector: React.FC<ClientSelectorProps> = ({
  value,
  onChange,
  error,
  helperText,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const { clientsQuery } = useClients({ includeInactive: false });

  const clients = clientsQuery.data || [];

  const handleCreateSuccess = (newClient: Client) => {
    onChange(newClient);
    setModalOpen(false);
  };

  // Si hay un cliente seleccionado, mostrar card
  if (value) {
    return (
      <Box>
        <Card variant="outlined">
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item>
                {value.personType === 'EMPRESA' ? (
                  <BusinessIcon color="primary" fontSize="large" />
                ) : (
                  <PersonIcon color="primary" fontSize="large" />
                )}
              </Grid>
              <Grid item xs>
                <Typography variant="h6" gutterBottom>
                  {value.name}
                </Typography>
                <Grid container spacing={2}>
                  {value.email && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="textSecondary">
                        Email
                      </Typography>
                      <Typography variant="body2">{value.email}</Typography>
                    </Grid>
                  )}
                  {value.phone && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="textSecondary">
                        Teléfono
                      </Typography>
                      <Typography variant="body2">{value.phone}</Typography>
                    </Grid>
                  )}
                  {value.nit && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="textSecondary">
                        NIT
                      </Typography>
                      <Typography variant="body2">{value.nit}</Typography>
                    </Grid>
                  )}
                  {value.city && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="textSecondary">
                        Ciudad
                      </Typography>
                      <Typography variant="body2">
                        {value.city.name}
                        {value.department && `, ${value.department.name}`}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </Grid>
              <Grid item>
                <IconButton
                  onClick={() => onChange(null)}
                  color="error"
                  size="small"
                >
                  <CloseIcon />
                </IconButton>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Box>
    );
  }

  // Si no hay cliente, mostrar autocomplete
  return (
    <Box>
      <Stack direction="row" spacing={2} alignItems="flex-start">
        <Autocomplete
          fullWidth
          options={clients}
          value={value}
          onChange={(_, newValue) => onChange(newValue)}
          getOptionLabel={(option) => option.name}
          renderOption={(props, option) => (
            <li {...props} key={option.id}>
              <Stack direction="row" spacing={1} alignItems="center">
                {option.personType === 'EMPRESA' ? (
                  <BusinessIcon fontSize="small" />
                ) : (
                  <PersonIcon fontSize="small" />
                )}
                <Box>
                  <Typography variant="body2">{option.name}</Typography>
                  <Typography variant="caption" color="textSecondary">
                    {option.phone && `${option.phone} • `}
                    {option.email}
                  </Typography>
                </Box>
              </Stack>
            </li>
          )}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Cliente"
              placeholder="Buscar cliente..."
              error={error}
              helperText={helperText}
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {clientsQuery.isLoading ? 'Cargando...' : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
          loading={clientsQuery.isLoading}
          noOptionsText="No se encontraron clientes"
        />
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => setModalOpen(true)}
          sx={{ minWidth: 180, height: 56 }}
        >
          Nuevo Cliente
        </Button>
      </Stack>

      <CreateClientModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />
    </Box>
  );
};
