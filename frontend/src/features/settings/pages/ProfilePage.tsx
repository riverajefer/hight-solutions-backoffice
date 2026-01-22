import React, { useRef, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  Grid,
  Divider,
  Stack,
  Chip,
  IconButton,
  CircularProgress,
  alpha,
  useTheme,
} from '@mui/material';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import EmailIcon from '@mui/icons-material/Email';
import BadgeIcon from '@mui/icons-material/Badge';
import WorkIcon from '@mui/icons-material/Work';
import BusinessIcon from '@mui/icons-material/Business';
import SecurityIcon from '@mui/icons-material/Security';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { useSnackbar } from 'notistack';
import { PageHeader } from '../../../components/common/PageHeader';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';
import { useProfile } from '../hooks/useProfile';
import { formatDate } from '../../../utils/helpers';

const DetailItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}> = ({ icon, label, value }) => {
  const theme = useTheme();

  return (
    <Box display="flex" alignItems="flex-start" gap={2}>
      <Box
        sx={{
          p: 1,
          bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.2 : 0.1),
          color: 'primary.main',
          borderRadius: 2,
          display: 'flex',
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
};

const ProfilePage: React.FC = () => {
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { profileQuery, updateProfilePhotoMutation } = useProfile();

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      enqueueSnackbar('Por favor selecciona una imagen válida', { variant: 'error' });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      enqueueSnackbar('La imagen no debe superar 2MB', { variant: 'error' });
      return;
    }

    try {
      setIsUploading(true);

      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;

        await updateProfilePhotoMutation.mutateAsync({ profilePhoto: base64 });
        enqueueSnackbar('Foto de perfil actualizada correctamente', { variant: 'success' });
      };
      reader.readAsDataURL(file);
    } catch (error) {
      enqueueSnackbar('Error al actualizar la foto de perfil', { variant: 'error' });
    } finally {
      setIsUploading(false);
    }

    // Reset input
    event.target.value = '';
  };

  if (profileQuery.isLoading) {
    return <LoadingSpinner />;
  }

  if (profileQuery.error || !profileQuery.data) {
    return (
      <Box>
        <PageHeader title="Mi Perfil" />
        <Typography color="error">Error al cargar el perfil</Typography>
      </Box>
    );
  }

  const { user } = profileQuery.data;
  const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Usuario';

  return (
    <Box>
      <PageHeader
        title="Mi Perfil"
        subtitle="Visualiza y administra tu información personal"
        breadcrumbs={[
          { label: 'Ajustes', path: '/settings' },
          { label: 'Mi Perfil' },
        ]}
      />

      {/* Profile Header Card */}
      <Card sx={{ mb: 3, overflow: 'visible' }}>
        <Box
          sx={{
            height: 140,
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
            borderRadius: '12px 12px 0 0',
          }}
        />
        <CardContent sx={{ pt: 0, mt: -8, pb: 3 }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={3}
            alignItems={{ xs: 'center', sm: 'flex-end' }}
          >
            <Box position="relative">
              <Avatar
                src={user.profilePhoto || undefined}
                sx={{
                  width: 140,
                  height: 140,
                  fontSize: '3.5rem',
                  fontWeight: 'bold',
                  bgcolor: 'background.paper',
                  color: 'primary.main',
                  border: `4px solid ${theme.palette.background.paper}`,
                  boxShadow: theme.shadows[4],
                }}
              >
                {fullName.charAt(0).toUpperCase()}
              </Avatar>
              <IconButton
                onClick={handlePhotoClick}
                disabled={isUploading || updateProfilePhotoMutation.isPending}
                sx={{
                  position: 'absolute',
                  bottom: 4,
                  right: 4,
                  bgcolor: 'primary.main',
                  color: 'white',
                  '&:hover': {
                    bgcolor: 'primary.dark',
                  },
                  width: 40,
                  height: 40,
                }}
              >
                {isUploading || updateProfilePhotoMutation.isPending ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <CameraAltIcon />
                )}
              </IconButton>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </Box>

            <Box sx={{ textAlign: { xs: 'center', sm: 'left' }, pb: 1 }}>
              <Typography variant="h4" fontWeight="bold">
                {fullName}
              </Typography>
              <Typography variant="body1" color="text.secondary" gutterBottom>
                {user.email}
              </Typography>
              <Stack
                direction="row"
                spacing={1}
                justifyContent={{ xs: 'center', sm: 'flex-start' }}
                mt={1}
              >
                <Chip
                  icon={<SecurityIcon />}
                  label={user.role?.name || 'Usuario'}
                  color="primary"
                  size="small"
                />
                {user.cargo && (
                  <Chip
                    icon={<WorkIcon />}
                    label={user.cargo.name}
                    color="secondary"
                    size="small"
                  />
                )}
                {user.cargo?.area && (
                  <Chip
                    icon={<BusinessIcon />}
                    label={user.cargo.area.name}
                    variant="outlined"
                    size="small"
                  />
                )}
              </Stack>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Details Cards */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Información Personal
              </Typography>
              <Divider sx={{ mb: 3 }} />

              <Stack spacing={3}>
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
                <DetailItem
                  icon={<CalendarTodayIcon />}
                  label="Fecha de Registro"
                  value={user.createdAt ? formatDate(user.createdAt) : 'N/A'}
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Información Laboral
              </Typography>
              <Divider sx={{ mb: 3 }} />

              <Stack spacing={3}>
                <DetailItem
                  icon={<SecurityIcon />}
                  label="Rol"
                  value={user.role?.name || 'Sin rol asignado'}
                />
                <DetailItem
                  icon={<WorkIcon />}
                  label="Cargo"
                  value={user.cargo?.name || 'Sin cargo asignado'}
                />
                <DetailItem
                  icon={<BusinessIcon />}
                  label="Área"
                  value={user.cargo?.area?.name || 'Sin área asignada'}
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ProfilePage;
