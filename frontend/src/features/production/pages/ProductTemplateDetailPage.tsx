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
  CircularProgress,
  Alert,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CategoryIcon from '@mui/icons-material/Category';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
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
            <Card 
              key={phase} 
              variant="outlined"
              sx={{
                height: '100%',
                bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.01)' : 'background.paper',
                borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'divider',
                borderRadius: 3,
                transition: 'all 0.3s ease',
                '&:hover': {
                  borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'primary.main',
                  boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 24px rgba(0,0,0,0.08)',
                }
              }}
            >
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
                  <Stack spacing={1}>
                    {components.map((comp) => (
                      <Accordion
                        key={comp.id}
                        disableGutters
                        variant="outlined"
                        sx={{
                          bgcolor: 'transparent',
                          '&:before': { display: 'none' },
                          border: '1px solid',
                          borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'divider',
                          borderRadius: '8px !important',
                          overflow: 'hidden',
                          boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 4px 12px rgba(0,0,0,0.2)' : 'none',
                        }}
                      >
                        <AccordionSummary
                          expandIcon={<ExpandMoreIcon fontSize="small" />}
                          sx={{ 
                            px: 1.5, 
                            minHeight: '40px !important', 
                            '& .MuiAccordionSummary-content': { my: 1 } 
                          }}
                        >
                          <Stack direction="row" alignItems="center" spacing={1} width="100%" justifyContent="space-between" pr={1}>
                            <Stack direction="row" spacing={1} alignItems="center" overflow="hidden">
                              <Typography variant="body2" fontWeight={600} noWrap>
                                {comp.name}
                              </Typography>
                              {!comp.isRequired && (
                                <Chip label="Opcional" size="small" variant="outlined" sx={{ fontSize: 9, height: 18 }} />
                              )}
                            </Stack>
                            <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                              {comp.steps.length} {comp.steps.length === 1 ? 'paso' : 'pasos'}
                            </Typography>
                          </Stack>
                        </AccordionSummary>
                        <AccordionDetails sx={{ px: 1, py: 1.25, bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)', borderTop: '1px solid', borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'divider' }}>
                          <Stack spacing={0.75}>
                            {[...comp.steps].sort((a, b) => a.order - b.order).map((step, idx) => (
                              <Stack
                                key={step.id}
                                direction="row"
                                alignItems="center"
                                spacing={1}
                                sx={{
                                  p: 0.75,
                                  pl: 1,
                                  borderRadius: 1,
                                  bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'background.paper',
                                  border: '1px solid',
                                  borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'divider',
                                }}
                              >
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  fontWeight={600}
                                  sx={{ minWidth: 16 }}
                                >
                                  {idx + 1}.
                                </Typography>
                                <Tooltip title={step.stepDefinition.description ?? ''}>
                                  <Typography variant="caption" sx={{ flexGrow: 1, fontWeight: 500 }}>
                                    {step.stepDefinition.name}
                                  </Typography>
                                </Tooltip>
                                <Chip
                                  label={step.isRequired ? 'Req' : 'Opc'}
                                  size="small"
                                  color={step.isRequired ? 'primary' : 'default'}
                                  variant={step.isRequired ? 'outlined' : 'filled'}
                                  sx={{ fontSize: 9, height: 18, bgcolor: step.isRequired ? 'transparent' : 'rgba(255,255,255,0.05)' }}
                                />
                              </Stack>
                            ))}
                          </Stack>
                        </AccordionDetails>
                      </Accordion>
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
