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
import EmailIcon from '@mui/icons-material/Email';
import BadgeIcon from '@mui/icons-material/Badge';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import WorkIcon from '@mui/icons-material/Work';
import BusinessIcon from '@mui/icons-material/Business';
import { User } from '../../../types';
import { StatusBadge } from '../../../components/common/DataTable';
import { formatDate } from '../../../utils/helpers';

interface UserDetailProps {
  user: User;
  onEdit: () => void;
  onBack: () => void;
  canEdit?: boolean;
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
        bgcolor: 'primary.light', 
        color: 'primary.main',
        borderRadius: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: 0.15
      }}
    >
      {/* Clone element to force color if needed, but primary.main usually works for icons if passed as children to a Box with that color. 
          Actually icons usually take currentColor. So setting color on Box works.
          But opacity applies to children too.
          Better approach:
      */}
    </Box>
    {/* Re-doing the icon part for better styling */}
     <Box 
      sx={{ 
        p: 1, 
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
      <Typography variant="body1" fontWeight={500}>
        {value}
      </Typography>
    </Box>
  </Box>
);

export const UserDetail: React.FC<UserDetailProps> = ({ 
  user, 
  onEdit, 
  onBack,
  canEdit = false 
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
              sx={{ 
                width: 80, 
                height: 80, 
                bgcolor: 'primary.main',
                fontSize: '2rem',
                fontWeight: 'bold'
              }}
            >
              {fullName.charAt(0).toUpperCase()}
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
              <DetailItem 
                icon={<EmailIcon />} 
                label="Correo Electrónico" 
                value={user.email} 
              />
            </Box>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
              Información del Sistema
            </Typography>
            <Box display="flex" flexDirection="column" gap={3}>
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
                value={user.createdAt ? formatDate(user.createdAt) : 'N/A'}
              />
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};
