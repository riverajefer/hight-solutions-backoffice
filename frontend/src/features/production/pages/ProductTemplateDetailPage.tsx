import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Stack,
  Divider,
  CircularProgress,
  Alert,
  Tooltip,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CategoryIcon from '@mui/icons-material/Category';
import { PageHeader } from '../../../components/common/PageHeader';
import { useProductTemplate } from '../hooks/useProduction';
import { useAuthStore } from '../../../store/authStore';
import { PERMISSIONS, ROUTES } from '../../../utils/constants';
import type { TemplateComponent, ComponentPhase } from '../../../types/production.types';

const PHASE_LABELS: Record<ComponentPhase, string> = {
  impresion: 'Impresión',
  material: 'Material',
  armado: 'Armado',
  despacho: 'Despacho',
};

const PHASE_COLORS: Record<ComponentPhase, 'info' | 'warning' | 'success' | 'secondary'> = {
  impresion: 'info',
  material: 'warning',
  armado: 'success',
  despacho: 'secondary',
};

const PHASES: ComponentPhase[] = ['impresion', 'material', 'armado', 'despacho'];

const ProductTemplateDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuthStore();
  const canUpdate = hasPermission(PERMISSIONS.UPDATE_PRODUCT_TEMPLATES);

  const templateQuery = useProductTemplate(id ?? '');

  if (templateQuery.isLoading) {
    return (
      <Box display="flex" justifyContent="center" mt={8}>
        <CircularProgress />
      </Box>
    );
  }

  if (templateQuery.isError || !templateQuery.data) {
    return <Alert severity="error">Error al cargar la plantilla</Alert>;
  }

  const template = templateQuery.data;

  // Group components by phase
  const componentsByPhase: Record<ComponentPhase, TemplateComponent[]> = {
    impresion: [],
    material: [],
    armado: [],
    despacho: [],
  };
  [...(template.components ?? [])].sort((a, b) => a.order - b.order).forEach((c) => {
    if (componentsByPhase[c.phase]) {
      componentsByPhase[c.phase].push(c);
    }
  });

  return (
    <Box>
      <PageHeader
        title={template.name}
        subtitle={`Categoría: ${template.category}`}
        icon={<CategoryIcon />}
        action={
          <Stack direction="row" spacing={1}>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate(ROUTES.PRODUCT_TEMPLATES)}
            >
              Volver
            </Button>
            {canUpdate && (
              <Button
                variant="contained"
                startIcon={<EditIcon />}
                onClick={() =>
                  navigate(ROUTES.PRODUCT_TEMPLATES_EDIT.replace(':id', template.id))
                }
              >
                Editar
              </Button>
            )}
          </Stack>
        }
      />

      <Stack direction="row" spacing={1} mb={3} alignItems="center">
        <Chip
          label={template.isActive ? 'Activa' : 'Inactiva'}
          color={template.isActive ? 'success' : 'default'}
          size="small"
        />
        {template.description && (
          <Typography variant="body2" color="text.secondary">
            {template.description}
          </Typography>
        )}
      </Stack>

      {/* Phase columns */}
      <Box
        display="grid"
        gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, 1fr)' }}
        gap={2}
      >
        {PHASES.map((phase) => {
          const components = componentsByPhase[phase];
          return (
            <Card key={phase} variant="outlined">
              <CardHeader
                title={
                  <Chip
                    label={PHASE_LABELS[phase]}
                    color={PHASE_COLORS[phase]}
                    size="small"
                    sx={{ fontWeight: 600 }}
                  />
                }
                subheader={`${components.length} componente${components.length !== 1 ? 's' : ''}`}
                sx={{ pb: 0 }}
              />
              <CardContent sx={{ pt: 1 }}>
                {components.length === 0 ? (
                  <Typography variant="caption" color="text.disabled">
                    Sin componentes
                  </Typography>
                ) : (
                  <Stack spacing={1.5}>
                    {components.map((comp) => (
                      <Box key={comp.id}>
                        <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
                          <Typography variant="body2" fontWeight={600}>
                            {comp.name}
                          </Typography>
                          {!comp.isRequired && (
                            <Chip label="Opcional" size="small" variant="outlined" sx={{ fontSize: 10 }} />
                          )}
                        </Stack>
                        <Stack spacing={0.5} pl={1}>
                          {[...comp.steps].sort((a, b) => a.order - b.order).map((step, idx) => (
                            <Stack
                              key={step.id}
                              direction="row"
                              alignItems="center"
                              spacing={1}
                            >
                              <Typography
                                variant="caption"
                                color="text.disabled"
                                sx={{ minWidth: 18 }}
                              >
                                {idx + 1}.
                              </Typography>
                              <Tooltip title={step.stepDefinition.description ?? ''}>
                                <Typography variant="caption" sx={{ flexGrow: 1 }}>
                                  {step.stepDefinition.name}
                                </Typography>
                              </Tooltip>
                              <Chip
                                label={step.isRequired ? 'Req' : 'Opc'}
                                size="small"
                                color={step.isRequired ? 'default' : 'default'}
                                variant={step.isRequired ? 'filled' : 'outlined'}
                                sx={{ fontSize: 9, height: 18 }}
                              />
                            </Stack>
                          ))}
                        </Stack>
                        <Divider sx={{ mt: 1 }} />
                      </Box>
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>
          );
        })}
      </Box>
    </Box>
  );
};

export default ProductTemplateDetailPage;
