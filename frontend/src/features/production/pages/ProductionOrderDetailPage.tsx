import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Chip,
  Button,
  Stack,
  Card,
  LinearProgress,
  Drawer,
  Divider,
  IconButton,
  TextField,
  MenuItem,
  Checkbox,
  FormControlLabel,
  CircularProgress,
  Alert,
  Collapse,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import BlockIcon from '@mui/icons-material/Block';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  useProductionOrder,
  useUpdateStepSpecification,
  useUpdateStepExecution,
  useCompleteStep,
} from '../hooks/useProduction';
import { useAuthStore } from '../../../store/authStore';
import { useSuppliers } from '../../suppliers/hooks/useSuppliers';
import { PERMISSIONS, ROUTES } from '../../../utils/constants';
import {
  resolveEffectiveFields,
  type ProductionOrderStep,
  type ProductionOrderComponent,
  type ProductionStepStatus,
  type FieldDef,
} from '../../../types/production.types';

const STATUS_ICON: Record<ProductionStepStatus, React.ReactNode> = {
  COMPLETED: <CheckCircleIcon color="success" />,
  IN_PROGRESS: <RadioButtonUncheckedIcon color="info" />,
  PENDING: <RadioButtonUncheckedIcon color="disabled" />,
  SKIPPED: <CheckCircleIcon color="disabled" />,
  BLOCKED: <BlockIcon color="disabled" />,
};

const STATUS_LABEL: Record<ProductionStepStatus, string> = {
  COMPLETED: 'Completado',
  IN_PROGRESS: 'En curso',
  PENDING: 'Pendiente',
  SKIPPED: 'Omitido',
  BLOCKED: 'Bloqueado',
};

// ─── Field renderer ────────────────────────────────────────────────────────────

interface FieldInputProps {
  field: FieldDef;
  value: any;
  onChange: (val: any) => void;
  readOnly?: boolean;
}

const SupplierFieldInput: React.FC<FieldInputProps> = ({ field, value, onChange, readOnly }) => {
  const { suppliersQuery } = useSuppliers();

  return (
    <TextField
      select
      label={field.label}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      size="small"
      fullWidth
      disabled={readOnly || suppliersQuery.isLoading}
      required={field.required}
    >
      {suppliersQuery.data?.map((s) => (
        <MenuItem key={s.id} value={s.name}>
          {s.name}
        </MenuItem>
      ))}
    </TextField>
  );
};

const FieldInput: React.FC<FieldInputProps> = ({ field, value, onChange, readOnly }) => {
  const isSupplierField =
    field.key.toLowerCase().includes('proveedor') ||
    field.label.toLowerCase().includes('proveedor') ||
    field.key.toLowerCase().includes('destino') ||
    field.label.toLowerCase().includes('destino');

  if (isSupplierField) {
    return <SupplierFieldInput field={field} value={value} onChange={onChange} readOnly={readOnly} />;
  }

  const isDateField =
    field.key.toLowerCase().includes('fecha') ||
    field.label.toLowerCase().includes('fecha');

  if (isDateField) {
    return (
      <DatePicker
        label={field.label}
        value={value ? new Date(value) : null}
        onChange={(newValue) => onChange(newValue ? newValue.toISOString() : null)}
        disabled={readOnly}
        slotProps={{
          textField: {
            size: 'small',
            fullWidth: true,
            required: field.required,
          },
        }}
      />
    );
  }

  if (field.type === 'boolean') {
    return (
      <FormControlLabel
        control={
          <Checkbox
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            disabled={readOnly}
            size="small"
          />
        }
        label={field.label}
      />
    );
  }
  if (field.type === 'select' && field.options) {
    return (
      <TextField
        select
        label={field.label}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        size="small"
        fullWidth
        disabled={readOnly}
        required={field.required}
      >
        {field.options.map((o) => (
          <MenuItem key={o} value={o}>
            {o}
          </MenuItem>
        ))}
      </TextField>
    );
  }
  return (
    <TextField
      label={field.label}
      value={value ?? ''}
      onChange={(e) => onChange(field.type === 'number' ? Number(e.target.value) : e.target.value)}
      size="small"
      fullWidth
      type={field.type === 'number' ? 'number' : 'text'}
      disabled={readOnly}
      required={field.required}
    />
  );
};

// ─── Step Drawer ───────────────────────────────────────────────────────────────

interface StepDrawerProps {
  orderId: string;
  step: ProductionOrderStep | null;
  onClose: () => void;
  canUpdate: boolean;
}

const StepDrawer: React.FC<StepDrawerProps> = ({ orderId, step, onClose, canUpdate }) => {
  const [specValues, setSpecValues] = useState<Record<string, any>>({});
  const [execValues, setExecValues] = useState<Record<string, any>>({});

  const updateSpec = useUpdateStepSpecification(orderId, step?.id ?? '');
  const updateExec = useUpdateStepExecution(orderId, step?.id ?? '');
  const completeStep = useCompleteStep(orderId);

  useEffect(() => {
    if (step) {
      setSpecValues(step.fieldValues.specification ?? {});
      setExecValues(step.fieldValues.execution ?? {});
    }
  }, [step]);

  if (!step) return null;

  const effectiveFields = resolveEffectiveFields(step);
  const specFields = effectiveFields.filter((f) => f.stage === 'specification');
  const execFields = effectiveFields.filter((f) => f.stage === 'execution');

  const isActive = step.status === 'PENDING' || step.status === 'IN_PROGRESS';
  const isBlocked = step.status === 'BLOCKED';
  const isCompleted = step.status === 'COMPLETED' || step.status === 'SKIPPED';

  const handleSaveSpec = async () => {
    await updateSpec.mutateAsync(specValues);
  };

  const handleSaveExec = async () => {
    await updateExec.mutateAsync(execValues);
  };

  const handleComplete = async () => {
    await completeStep.mutateAsync(step.id);
    onClose();
  };

  return (
    <Drawer
      anchor="right"
      open={!!step}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 420 }, p: 3 } }}
    >
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Box>
          <Typography variant="subtitle1" fontWeight={700}>
            {step.stepDefinition.name}
          </Typography>
          <Stack direction="row" spacing={1} mt={0.5}>
            <Chip
              label={STATUS_LABEL[step.status]}
              size="small"
              color={
                step.status === 'COMPLETED'
                  ? 'success'
                  : step.status === 'IN_PROGRESS'
                  ? 'warning'
                  : 'default'
              }
            />
          </Stack>
        </Box>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Stack>

      <Divider sx={{ mb: 2 }} />

      {/* Specification section */}
      {specFields.length > 0 && (
        <Box mb={3}>
          <Typography variant="overline" color="text.secondary" gutterBottom display="block">
            Especificación
          </Typography>
          <Stack spacing={1.5}>
            {specFields.map((f) =>
              isBlocked || isCompleted ? (
                <Box key={f.key}>
                  <Typography variant="caption" color="text.secondary">
                    {f.label}
                  </Typography>
                  <Typography variant="body2">
                    {specValues[f.key] !== undefined && specValues[f.key] !== ''
                      ? String(specValues[f.key])
                      : '—'}
                  </Typography>
                </Box>
              ) : (
                <FieldInput
                  key={f.key}
                  field={f}
                  value={specValues[f.key]}
                  onChange={(val) => setSpecValues((prev) => ({ ...prev, [f.key]: val }))}
                  readOnly={!canUpdate || isCompleted}
                />
              ),
            )}
          </Stack>
          {canUpdate && isActive && (
            <Button
              size="small"
              sx={{ mt: 1 }}
              onClick={handleSaveSpec}
              disabled={updateSpec.isPending}
            >
              Guardar especificación
            </Button>
          )}
        </Box>
      )}

      {/* Execution section */}
      {execFields.length > 0 && (
        <Box mb={3}>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="overline" color="text.secondary" gutterBottom display="block">
            Ejecución
          </Typography>
          {isBlocked && (
            <Alert severity="info" sx={{ mb: 1 }}>
              Este paso está bloqueado hasta que se completen los pasos anteriores.
            </Alert>
          )}
          <Stack spacing={1.5}>
            {execFields.map((f) =>
              isBlocked || isCompleted ? (
                <Box key={f.key}>
                  <Typography variant="caption" color="text.secondary">
                    {f.label}
                  </Typography>
                  <Typography variant="body2">
                    {execValues[f.key] !== undefined && execValues[f.key] !== ''
                      ? String(execValues[f.key])
                      : '—'}
                  </Typography>
                </Box>
              ) : (
                <FieldInput
                  key={f.key}
                  field={f}
                  value={execValues[f.key]}
                  onChange={(val) => setExecValues((prev) => ({ ...prev, [f.key]: val }))}
                  readOnly={!canUpdate}
                />
              ),
            )}
          </Stack>
          {canUpdate && isActive && (
            <Button
              size="small"
              sx={{ mt: 1 }}
              onClick={handleSaveExec}
              disabled={updateExec.isPending}
            >
              Guardar ejecución
            </Button>
          )}
        </Box>
      )}

      {/* Completado info */}
      {step.completedAt && (
        <Box mt={1}>
          <Divider sx={{ mb: 1 }} />
          <Typography variant="caption" color="text.secondary">
            Completado el {new Date(step.completedAt).toLocaleString('es-CO')}
            {step.completedBy &&
              ` por ${step.completedBy.firstName} ${step.completedBy.lastName}`}
          </Typography>
        </Box>
      )}

      {/* Complete button */}
      {canUpdate && isActive && (
        <Box mt="auto" pt={2}>
          <Divider sx={{ mb: 2 }} />
          <Button
            variant="contained"
            color="success"
            fullWidth
            onClick={handleComplete}
            disabled={completeStep.isPending}
          >
            {completeStep.isPending ? <CircularProgress size={20} /> : 'Marcar como completado'}
          </Button>
        </Box>
      )}
    </Drawer>
  );
};

// ─── Component accordion ───────────────────────────────────────────────────────

interface ComponentCardProps {
  component: ProductionOrderComponent;
  onStepClick: (step: ProductionOrderStep) => void;
}

const ComponentCard: React.FC<ComponentCardProps> = ({ component, onStepClick }) => {
  const [expanded, setExpanded] = useState(true);

  const progress = component.progress ?? 0;
  const totalSteps = component.steps.length;
  const completedSteps = component.steps.filter(
    (s) => s.status === 'COMPLETED' || s.status === 'SKIPPED',
  ).length;

  return (
    <Card 
      sx={{ 
        mb: 2, 
        borderRadius: 2, 
        bgcolor: 'background.paper', 
        color: 'text.primary',
        border: '1px solid',
        borderColor: progress === 100 ? '#10B981' : 'transparent',
        boxShadow: progress === 100 ? `0 0 12px rgba(16, 185, 129, 0.25)` : undefined,
        overflow: 'hidden',
        transition: 'all 0.3s ease'
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          p: 2,
          px: 3,
          cursor: 'pointer',
          borderBottom: expanded ? 1 : 0,
          borderColor: 'divider',
          '&:hover': { bgcolor: 'action.hover' }
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <IconButton 
          size="small" 
          sx={{ 
            mr: 1, 
            p: 0.5, 
            color: progress === 100 ? '#10B981' : 'inherit',
            transform: expanded ? 'rotate(0)' : 'rotate(-90deg)', 
            transition: 'transform 0.2s', 
            '&:hover': { bgcolor: 'transparent' } 
          }}
        >
          <ExpandMoreIcon />
        </IconButton>
        <Typography 
          variant="subtitle1" 
          fontWeight={700} 
          sx={{ flexGrow: 1, color: progress === 100 ? '#10B981' : 'inherit' }}
        >
          {component.name}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', minWidth: { xs: 120, sm: 200 }, gap: 2 }}>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{ 
              flexGrow: 1, 
              height: 6, 
              borderRadius: 3,
              backgroundColor: 'rgba(255,255,255,0.08)',
              ...(progress === 100 && {
                '& .MuiLinearProgress-bar': {
                  backgroundColor: '#10B981',
                  boxShadow: `0 0 10px rgba(16, 185, 129, 0.5)`,
                }
              }),
              ...(progress < 100 && {
                '& .MuiLinearProgress-bar': {
                  backgroundColor: 'primary.main',
                }
              })
            }}
          />
          <Typography 
            variant="body2" 
            fontWeight={600}
            sx={{ color: progress === 100 ? '#10B981' : 'inherit' }}
          >
            {completedSteps}/{totalSteps}
          </Typography>
        </Box>
      </Box>

      <Collapse in={expanded}>
        <Stack divider={<Divider />}>
          {[...component.steps].sort((a, b) => a.order - b.order).map((step) => {
             const fields = resolveEffectiveFields(step);
             const allValues = { ...step.fieldValues.specification, ...step.fieldValues.execution };
             
             return (
              <Box
                key={step.id}
                onClick={() => onStepClick(step)}
                sx={{
                  display: 'flex',
                  px: 3,
                  py: 2.5,
                  gap: 2,
                  cursor: step.status !== 'BLOCKED' ? 'pointer' : 'default',
                  opacity: step.status === 'BLOCKED' ? 0.5 : 1,
                  '&:hover': step.status !== 'BLOCKED' ? { bgcolor: 'action.hover' } : {},
                }}
              >
                <Box sx={{ pt: 0.2 }}>{STATUS_ICON[step.status]}</Box>
                <Box flexGrow={1}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
                     <Typography variant="subtitle1" fontWeight={600}>
                        {step.stepDefinition.name}
                     </Typography>
                     <Chip
                        label={STATUS_LABEL[step.status]}
                        size="small"
                        color={
                          step.status === 'COMPLETED' ? 'success' :
                          step.status === 'IN_PROGRESS' ? 'info' : 'default'
                        }
                        sx={{ fontWeight: 600, height: 24 }}
                     />
                  </Stack>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, rowGap: 0.5, columnGap: 3 }}>
                    {fields.map(f => {
                       const val = allValues[f.key];
                       if (val === undefined || val === null || val === '') return null;
                       const displayVal = typeof val === 'boolean' ? (val ? 'Sí' : 'No') : String(val);
                       return (
                         <Typography variant="body2" key={f.key}>
                            <Box component="span" color="text.secondary">{f.label}: </Box>
                            <Box component="span" fontWeight={600} ml={0.5}>{displayVal}</Box>
                         </Typography>
                       )
                    })}
                  </Box>
                  {step.status === 'IN_PROGRESS' && (
                     <Button 
                       variant="outlined" 
                       size="small" 
                       sx={{ mt: 2, borderRadius: 2, color: 'text.primary', borderColor: 'divider' }}
                       onClick={(e) => { e.stopPropagation(); onStepClick(step); }}
                     >
                       Marcar completado ↗
                     </Button>
                  )}
                </Box>
              </Box>
             );
          })}
        </Stack>
      </Collapse>
    </Card>
  );
};

// ─── Main page ─────────────────────────────────────────────────────────────────

const ORDER_STATUS_COLOR = {
  PENDING: 'default',
  IN_PROGRESS: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'error',
} as const;

const ORDER_STATUS_LABEL = {
  PENDING: 'Pendiente',
  IN_PROGRESS: 'En progreso',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
};

const ProductionOrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuthStore();
  const canUpdate = hasPermission(PERMISSIONS.UPDATE_PRODUCTION_ORDERS);

  const orderQuery = useProductionOrder(id ?? '');
  const [selectedStep, setSelectedStep] = useState<ProductionOrderStep | null>(null);

  if (orderQuery.isLoading) {
    return (
      <Box display="flex" justifyContent="center" mt={8}>
        <CircularProgress />
      </Box>
    );
  }
  if (orderQuery.isError || !orderQuery.data) {
    return <Alert severity="error">Error al cargar la orden de producción</Alert>;
  }

  const order = orderQuery.data;
  const progress = order.progress;

  const sortedComponents = [...(order.components ?? [])].sort((a, b) => a.order - b.order);
  const activeComponents = sortedComponents.filter(c => c.progress !== undefined && c.progress < 100 && c.progress > 0).length || 
                           sortedComponents.filter(c => c.progress !== 100).length;

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', pb: 6 }}>
      <Box mb={2}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(ROUTES.PRODUCTION_ORDERS)}
          color="inherit"
        >
          Volver
        </Button>
      </Box>

      {/* Header */}
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" mb={4}>
        <Box>
          <Typography variant="h5" fontWeight={800} mb={0.5}>
            {order.workOrder?.workOrderNumber ?? order.oprodNumber}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {order.template?.name ?? 'Sin plantilla'} 
            {order.oprodNumber ? ` — OP: ${order.oprodNumber}` : ''}
          </Typography>
        </Box>
        <Chip
          label={ORDER_STATUS_LABEL[order.status]}
          color={ORDER_STATUS_COLOR[order.status]}
          sx={{ fontWeight: 'bold' }}
        />
      </Stack>

      {/* Stats row */}
      <Stack direction="row" alignItems="center" justifyContent="space-around" mb={5} spacing={2}>
        <Box textAlign="center" flex={1}>
          <Typography variant="h4" fontWeight={800}>{progress.total}%</Typography>
          <Typography variant="caption" color="text.secondary" display="block" mb={1}>Progreso total</Typography>
          <LinearProgress
            variant="determinate"
            value={progress.total}
            color={progress.total === 100 ? "success" : "primary"}
            sx={{ height: 6, borderRadius: 3, maxWidth: 160, mx: 'auto' }}
          />
        </Box>
        <Box textAlign="center" flex={1}>
          <Typography variant="h4" fontWeight={800}>{activeComponents} / {sortedComponents.length}</Typography>
          <Typography variant="caption" color="text.secondary">Componentes activos</Typography>
        </Box>
        <Box textAlign="center" flex={1}>
          <Typography variant="h4" fontWeight={800}>{progress.completedSteps} / {progress.totalSteps}</Typography>
          <Typography variant="caption" color="text.secondary">Pasos completados</Typography>
        </Box>
      </Stack>

      {/* Components */}
      {sortedComponents.map((comp) => (
        <ComponentCard
          key={comp.id}
          component={comp}
          onStepClick={(step) => setSelectedStep(step)}
        />
      ))}

      {/* Step drawer */}
      <StepDrawer
        orderId={id ?? ''}
        step={selectedStep}
        onClose={() => setSelectedStep(null)}
        canUpdate={canUpdate}
      />
    </Box>
  );
};

export default ProductionOrderDetailPage;
