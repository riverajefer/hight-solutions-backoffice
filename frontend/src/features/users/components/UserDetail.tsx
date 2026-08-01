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

// ─── Etiquetas de nómina ─────────────────────────────────────────────────────
const identificationTypeLabels: Record<string, string> = {
  CC: 'Cédula de ciudadanía',
  CE: 'Cédula de extranjería',
  TI: 'Tarjeta de identidad',
  PA: 'Pasaporte',
  NIT: 'NIT',
};
const sexLabels: Record<string, string> = { MALE: 'Masculino', FEMALE: 'Femenino', OTHER: 'Otro' };
const employeeTypeLabels: Record<string, string> = { REGULAR: 'Regular', TEMPORARY: 'Temporal' };
const contractTypeLabels: Record<string, string> = {
  FIXED_TERM: 'Término fijo',
  INDEFINITE: 'Término indefinido',
  SERVICE_CONTRACT: 'Contrato de servicios',
  INTERNSHIP: 'Práctica',
};
const employeeStatusLabels: Record<string, string> = { ACTIVE: 'Activo', INACTIVE: 'Inactivo' };

const formatDateOnly = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString('es-CO') : '—';
const formatCOP = (value?: string | null) =>
  value !== null && value !== undefined
    ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(value))
    : '—';

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
  const employee = user.payrollEmployee;

  // Secciones de la ficha de nómina (solo se muestran los campos con valor).
  const payrollSections = employee
    ? [
        {
          title: 'Identificación y datos personales',
          fields: [
            { label: 'Tipo de identificación', value: employee.identificationType ? identificationTypeLabels[employee.identificationType] : null },
            { label: 'Número de identificación', value: employee.identificationNumber },
            { label: 'Fecha de expedición', value: employee.documentIssueDate ? formatDateOnly(employee.documentIssueDate) : null },
            { label: 'Primer nombre', value: employee.firstName },
            { label: 'Segundo nombre', value: employee.middleName },
            { label: 'Primer apellido', value: employee.firstLastName },
            { label: 'Segundo apellido', value: employee.secondLastName },
            { label: 'Sexo', value: employee.sex ? sexLabels[employee.sex] : null },
            { label: 'Fecha de nacimiento', value: employee.birthDate ? formatDateOnly(employee.birthDate) : null },
          ],
        },
        {
          title: 'Contacto y seguridad social',
          fields: [
            { label: 'Dirección', value: employee.address },
            { label: 'Barrio', value: employee.neighborhood },
            { label: 'Teléfono', value: employee.phone },
            { label: 'Correo', value: employee.email },
            { label: 'EPS', value: employee.eps },
            { label: 'Pensiones', value: employee.pensionFund },
            { label: 'Contacto de emergencia', value: employee.emergencyContactName },
            { label: 'Parentesco (emergencia)', value: employee.emergencyContactRelationship },
            { label: 'Teléfono (emergencia)', value: employee.emergencyContactPhone },
          ],
        },
        {
          title: 'Información laboral',
          fields: [
            { label: 'Tipo de empleado', value: employeeTypeLabels[employee.employeeType] },
            { label: 'Salario mensual', value: employee.monthlySalary ? formatCOP(employee.monthlySalary) : null },
            { label: 'Tarifa diaria', value: employee.dailyRate ? formatCOP(employee.dailyRate) : null },
            { label: 'Cargo', value: employee.cargo?.name },
            { label: 'Fecha de ingreso', value: formatDateOnly(employee.startDate) },
            { label: 'Fecha terminación contrato', value: employee.contractEndDate ? formatDateOnly(employee.contractEndDate) : null },
            { label: 'Tipo de contrato', value: employee.contractType ? contractTypeLabels[employee.contractType] : null },
            { label: 'Estado', value: employeeStatusLabels[employee.status] },
            { label: 'Notas', value: employee.notes },
          ],
        },
      ]
    : [];

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
                label="Área de Producción"
                value={(user as any).cargo?.productionArea?.name || 'N/A'}
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

        {/* ─── Ficha de nómina (si el usuario es empleado) ─────────────────── */}
        {employee && (
          <>
            <Divider sx={{ my: 4 }} />
            <Box display="flex" alignItems="center" gap={1} mb={3}>
              <WorkIcon color="primary" />
              <Typography variant="h6">Ficha de Nómina</Typography>
              <Chip
                label={employeeStatusLabels[employee.status] ?? employee.status}
                size="small"
                color={employee.status === 'ACTIVE' ? 'success' : 'default'}
                variant="outlined"
              />
            </Box>

            <Grid container spacing={4}>
              {payrollSections.map((section) => {
                const visibleFields = section.fields.filter((f) => f.value);
                if (visibleFields.length === 0) return null;
                return (
                  <Grid item xs={12} md={6} key={section.title}>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      {section.title}
                    </Typography>
                    <Box display="flex" flexDirection="column" gap={1.5}>
                      {visibleFields.map((f) => (
                        <Box key={f.label} display="flex" justifyContent="space-between" gap={2}>
                          <Typography variant="body2" color="text.secondary">
                            {f.label}
                          </Typography>
                          <Typography variant="body2" fontWeight={500} textAlign="right">
                            {f.value}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
          </>
        )}
      </CardContent>
    </Card>
  );
};
