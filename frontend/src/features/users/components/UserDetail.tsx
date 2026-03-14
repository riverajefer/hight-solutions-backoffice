import React from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Grid, 
  Typography, 
  Divider, 
  Button, 
  Avatar,
  Chip
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import BlockIcon from '@mui/icons-material/Block';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import BadgeIcon from '@mui/icons-material/Badge';
import KeyIcon from '@mui/icons-material/Key';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import LockResetIcon from '@mui/icons-material/LockReset';
import WorkIcon from '@mui/icons-material/Work';
import BusinessIcon from '@mui/icons-material/Business';
import { User } from '../../../types';
import { StatusBadge } from '../../../components/common/DataTable';
import { formatDateTime } from '../../../utils/helpers';

interface UserDetailProps {
  user: User;
  onEdit: () => void;
  onBack: () => void;
  onDeactivate?: () => void;
  canEdit?: boolean;
  canDeactivate?: boolean;
}

const DetailItem: React.FC<{ 
  icon: React.ReactNode; 
  label: string; 
  value: React.ReactNode 
}> = ({ icon, label, value }) => (
  <Box display="flex" alignItems="flex-start" gap={2}>
    <Box 
      sx={{ 
        p: 1.5, 
        bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.1)', 
        color: 'primary.main',
        borderRadius: 2,
        display: 'flex'
      }}
    >
      {icon}
    </Box>
    <Box>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        {label}
      </Typography>
      <Box sx={{ typography: 'body1', fontWeight: 500 }}>
        {value}
      </Box>
    </Box>
  </Box>
);

export const UserDetail: React.FC<UserDetailProps> = ({ 
  user, 
  onEdit, 
  onBack,
  onDeactivate,
  canEdit = false,
  canDeactivate = false,
}) => {
  const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();

  return (
    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
      <CardContent sx={{ p: 4 }}>
        {/* Header */}
        <Box 
          display="flex" 
          justifyContent="space-between" 
          alignItems="flex-start" 
          mb={4}
          flexWrap="wrap"
          gap={2}
        >
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar 
              src={user.profilePhoto || undefined}
              sx={{ 
                width: 80, 
                height: 80, 
                bgcolor: 'primary.main',
                fontSize: '2rem',
                fontWeight: 'bold'
              }}
            >
              {!user.profilePhoto && fullName.charAt(0).toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="h4" fontWeight="bold" gutterBottom>
                {fullName}
              </Typography>
              <Box display="flex" gap={1} alignItems="center">
                <StatusBadge status={user.isActive !== false ? 'active' : 'inactive'} />
                <Chip 
                  label={user.role?.name || user.roleId || 'Usuario'} 
                  size="small" 
                  variant="outlined"
                  color="default"
                />
              </Box>
            </Box>
          </Box>

          <Box display="flex" gap={2}>
            <Button 
              variant="outlined" 
              startIcon={<ArrowBackIcon />} 
              onClick={onBack}
            >
              Volver
            </Button>
            {canEdit && (
              <Button 
                variant="contained" 
                startIcon={<EditIcon />} 
                onClick={onEdit}
              >
                Editar
              </Button>
            )}
            {canDeactivate && (
              <Button
                variant="outlined"
                color="warning"
                startIcon={<BlockIcon />}
                onClick={onDeactivate}
              >
                Desactivar usuario
              </Button>
            )}
          </Box>
        </Box>

        <Divider sx={{ mb: 4 }} />

        {/* Details Grid */}
        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
              Información Personal
            </Typography>
            <Box display="flex" flexDirection="column" gap={3}>
              <DetailItem
                icon={<BadgeIcon />}
                label="Nombre Completo"
                value={fullName}
              />
              {user.username && (
                <DetailItem
                  icon={<AccountCircleIcon />}
                  label="Usuario"
                  value={user.username}
                />
              )}
              {user.email && (
                <DetailItem
                  icon={<EmailIcon />}
                  label="Correo Electrónico"
                  value={user.email}
                />
              )}
              {user.phone && (
                <DetailItem
                  icon={<PhoneIcon />}
                  label="Número de celular"
                  value={user.phone}
                />
              )}
            </Box>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
              Información del Sistema
            </Typography>
            <Box display="flex" flexDirection="column" gap={3}>
              <DetailItem
                icon={<KeyIcon />}
                label="ID de Usuario"
                value={
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', bgcolor: 'action.hover', px: 1, py: 0.5, borderRadius: 1, display: 'inline-block' }}>
                    {user.id}
                  </Typography>
                }
              />
              <DetailItem
                icon={<VerifiedUserIcon />}
                label="Rol Asignado"
                value={(user as any).role?.name || 'N/A'}
              />
              <DetailItem
                icon={<WorkIcon />}
                label="Cargo"
                value={(user as any).cargo?.name || 'Sin cargo asignado'}
              />
              <DetailItem
                icon={<BusinessIcon />}
                label="Área"
                value={(user as any).cargo?.area?.name || 'N/A'}
              />
              <DetailItem
                icon={<AccessTimeIcon />}
                label="Fecha de Registro"
                value={user.createdAt ? formatDateTime(user.createdAt) : 'N/A'}
              />
              <DetailItem
                icon={<CalendarTodayIcon />}
                label="Última Actualización"
                value={user.updatedAt ? formatDateTime(user.updatedAt) : 'N/A'}
              />
              <DetailItem
                icon={<LockResetIcon />}
                label="Requiere Cambio de Contraseña"
                value={user.mustChangePassword ? 'Sí' : 'No'}
              />
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};
