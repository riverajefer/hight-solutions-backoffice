import React from 'react';
import { Box, Chip, Typography } from '@mui/material';
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import { PageHeader } from '../../../components/common/PageHeader';
import { DataTable } from '../../../components/common/DataTable';
import { useSessionLogs } from '../hooks/useSessionLogs';
import { SessionLog } from '../../../types';

const SessionLogsPage: React.FC = () => {
  const { sessionLogsQuery } = useSessionLogs();
  const logs = sessionLogsQuery.data?.data || [];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const columns: GridColDef[] = [
    {
      field: 'user',
      headerName: 'Usuario',
      flex: 1,
      minWidth: 200,
      renderCell: (params: GridRenderCellParams<SessionLog>) => {
        const user = params.row.user;
        const fullName = user.firstName && user.lastName
          ? `${user.firstName} ${user.lastName}`
          : user.email;

        return (
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {fullName}
            </Typography>
          </Box>
        );
      },
    },
    {
      field: 'email',
      headerName: 'Email',
      flex: 1,
      minWidth: 200,
      renderCell: (params: GridRenderCellParams<SessionLog>) => {
        const user = params.row.user;
        return (
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {user.email}
            </Typography>
          </Box>
        );
      },
    },
    {
      field: 'area',
      headerName: 'Área',
      width: 150,
      valueGetter: (_value, row: SessionLog) => row.user.cargo?.area.name || '-',
    },
    {
      field: 'cargo',
      headerName: 'Cargo',
      width: 150,
      valueGetter: (_value, row: SessionLog) => row.user.cargo?.name || '-',
    },
    {
      field: 'loginAt',
      headerName: 'Login',
      width: 180,
      renderCell: (params: GridRenderCellParams<SessionLog>) => (
        <Chip
          icon={<LoginIcon />}
          label={formatDate(params.row.loginAt)}
          color="success"
          variant="outlined"
          size="small"
        />
      ),
    },
    {
      field: 'logoutAt',
      headerName: 'Logout',
      width: 180,
      renderCell: (params: GridRenderCellParams<SessionLog>) => {
        if (!params.row.logoutAt) {
          return (
            <Chip
              label="Sesión activa"
              color="success"
              size="small"
            />
          );
        }
        return (
          <Chip
            icon={<LogoutIcon />}
            label={formatDate(params.row.logoutAt)}
            color="error"
            variant="outlined"
            size="small"
          />
        );
      },
    },
    {
      field: 'durationFormatted',
      headerName: 'Tiempo Logueado',
      width: 160,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<SessionLog>) => {
        const minutes = params.row.durationMinutes || 0;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;

        let label = '';
        if (hours > 0) {
          label += `${hours} hora${hours !== 1 ? 's' : ''}`;
          if (mins > 0) {
            label += ` ${mins} min`;
          }
        } else {
          label = `${mins} minuto${mins !== 1 ? 's' : ''}`;
        }

        return (
          <Chip
            label={label}
            size="small"
            color={params.row.logoutAt ? 'default' : 'info'}
            variant="outlined"
          />
        );
      },
    },
    {
      field: 'ipAddress',
      headerName: 'IP',
      width: 140,
      renderCell: (params: GridRenderCellParams<SessionLog>) => (
        <Typography variant="body2" color="text.secondary">
          {params.row.ipAddress || '-'}
        </Typography>
      ),
    },
  ];

  return (
    <Box>
      <PageHeader
        title="Historial de Sesiones"
        subtitle="Visualiza los registros de inicio y cierre de sesión de los usuarios"
      />

      <DataTable
        rows={logs}
        columns={columns}
        loading={sessionLogsQuery.isLoading}
        searchPlaceholder="Buscar en historial de sesiones..."
        emptyMessage="No se encontraron registros de sesiones"
      />
    </Box>
  );
};

export default SessionLogsPage;
