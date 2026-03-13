import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  TextField,
  MenuItem,
  Stack,
  Typography,
  Card,
  CardContent,
  IconButton,
  Divider,
  CircularProgress,
  Alert,
  FormControlLabel,
  Switch,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CategoryIcon from '@mui/icons-material/Category';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '../../../components/common/PageHeader';
import {
  useProductTemplate,
  useCreateProductTemplate,
  useUpdateProductTemplate,
  useStepDefinitions,
} from '../hooks/useProduction';
import { ROUTES } from '../../../utils/constants';
import type { ComponentPhase } from '../../../types/production.types';

const CATEGORY_OPTIONS = [
  { value: 'cuadernos', label: 'Cuadernos' },
  { value: 'papeleria_impresa', label: 'Papelería impresa' },
  { value: 'revistas', label: 'Revistas / Catálogos' },
  { value: 'talonarios', label: 'Talonarios' },
  { value: 'otro', label: 'Otro' },
];

const PHASE_OPTIONS: { value: ComponentPhase; label: string }[] = [
  { value: 'impresion', label: 'Impresión' },
  { value: 'material', label: 'Material' },
  { value: 'armado', label: 'Armado' },
  { value: 'despacho', label: 'Despacho' },
];

const stepSchema = z.object({
  stepDefinitionId: z.string().uuid('Selecciona un paso'),
  order: z.number().int().min(1),
  isRequired: z.boolean(),
});

const componentSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  order: z.number().int().min(1),
  phase: z.enum(['impresion', 'material', 'armado', 'despacho']),
  isRequired: z.boolean(),
  steps: z.array(stepSchema).min(1, 'Agrega al menos un paso'),
});

const formSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  category: z.string().min(1, 'Categoría requerida'),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  components: z.array(componentSchema).min(1, 'Agrega al menos un componente'),
});

type FormValues = z.infer<typeof formSchema>;

const ProductTemplateFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();

  const templateQuery = useProductTemplate(id ?? '');
  const stepDefsQuery = useStepDefinitions();
  const createTemplate = useCreateProductTemplate();
  const updateTemplate = useUpdateProductTemplate(id ?? '');

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      category: '',
      description: '',
      isActive: true,
      components: [],
    },
  });

  const { fields: compFields, append: appendComp, remove: removeComp } = useFieldArray({
    control,
    name: 'components',
  });

  useEffect(() => {
    if (isEdit && templateQuery.data) {
      const t = templateQuery.data;
      reset({
        name: t.name,
        category: t.category,
        description: t.description ?? '',
        isActive: t.isActive,
        components: [...(t.components ?? [])].sort((a, b) => a.order - b.order).map((c) => ({
          name: c.name,
          order: c.order,
          phase: c.phase,
          isRequired: c.isRequired,
          steps: [...c.steps].sort((a, b) => a.order - b.order).map((s) => ({
            stepDefinitionId: s.stepDefinition.id,
            order: s.order,
            isRequired: s.isRequired,
          })),
        })),
      });
    }
  }, [isEdit, templateQuery.data, reset]);

  const onSubmit = async (data: FormValues) => {
    if (isEdit) {
      await updateTemplate.mutateAsync({
        name: data.name,
        category: data.category,
        description: data.description,
        isActive: data.isActive,
      });
      navigate(ROUTES.PRODUCT_TEMPLATES_DETAIL.replace(':id', id!));
    } else {
      await createTemplate.mutateAsync(data);
      navigate(ROUTES.PRODUCT_TEMPLATES);
    }
  };

  if (isEdit && templateQuery.isLoading) {
    return (
      <Box display="flex" justifyContent="center" mt={8}>
        <CircularProgress />
      </Box>
    );
  }
  if (isEdit && templateQuery.isError) {
    return <Alert severity="error">Error al cargar la plantilla</Alert>;
  }

  const stepDefs = stepDefsQuery.data ?? [];

  return (
    <Box>
      <PageHeader
        title={isEdit ? 'Editar Plantilla' : 'Nueva Plantilla'}
        subtitle="Define los componentes y pasos del proceso de fabricación"
        icon={<CategoryIcon />}
        action={
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(ROUTES.PRODUCT_TEMPLATES)}
          >
            Volver
          </Button>
        }
      />

      <Box component="form" onSubmit={handleSubmit(onSubmit)}>
        {/* Basic info */}
        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={600} mb={2}>
              Información general
            </Typography>
            <Stack spacing={2}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Controller
                  name="name"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Nombre de la plantilla"
                      fullWidth
                      error={!!errors.name}
                      helperText={errors.name?.message}
                    />
                  )}
                />
                <Controller
                  name="category"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      select
                      label="Categoría"
                      fullWidth
                      error={!!errors.category}
                      helperText={errors.category?.message}
                    >
                      {CATEGORY_OPTIONS.map((o) => (
                        <MenuItem key={o.value} value={o.value}>
                          {o.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              </Stack>
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Descripción (opcional)"
                    multiline
                    rows={2}
                    fullWidth
                  />
                )}
              />
              {isEdit && (
                <Controller
                  name="isActive"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Switch checked={field.value} onChange={field.onChange} />
                      }
                      label="Plantilla activa"
                    />
                  )}
                />
              )}
            </Stack>
          </CardContent>
        </Card>

        {/* Components — only on create */}
        {!isEdit && (
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
                <Typography variant="subtitle1" fontWeight={600}>
                  Componentes
                </Typography>
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() =>
                    appendComp({
                      name: '',
                      order: compFields.length + 1,
                      phase: 'impresion',
                      isRequired: true,
                      steps: [],
                    })
                  }
                >
                  Agregar componente
                </Button>
              </Stack>

              {(errors.components as any)?.root?.message && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {(errors.components as any).root.message}
                </Alert>
              )}

              <Stack spacing={3}>
                {compFields.map((compField, compIdx) => (
                  <ComponentEditor
                    key={compField.id}
                    control={control}
                    compIdx={compIdx}
                    stepDefs={stepDefs}
                    onRemove={() => removeComp(compIdx)}
                    errors={errors}
                  />
                ))}
                {compFields.length === 0 && (
                  <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>
                    Sin componentes. Haz clic en "Agregar componente".
                  </Typography>
                )}
              </Stack>
            </CardContent>
          </Card>
        )}

        <Stack direction="row" justifyContent="flex-end" spacing={2}>
          <Button onClick={() => navigate(ROUTES.PRODUCT_TEMPLATES)}>Cancelar</Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting || createTemplate.isPending || updateTemplate.isPending}
          >
            {isEdit ? 'Guardar cambios' : 'Crear plantilla'}
          </Button>
        </Stack>
      </Box>
    </Box>
  );
};

interface ComponentEditorProps {
  control: any;
  compIdx: number;
  stepDefs: any[];
  onRemove: () => void;
  errors: any;
}

const ComponentEditor: React.FC<ComponentEditorProps> = ({
  control,
  compIdx,
  stepDefs,
  onRemove,
  errors,
}) => {
  const { fields: stepFields, append: appendStep, remove: removeStep } = useFieldArray({
    control,
    name: `components.${compIdx}.steps`,
  });

  return (
    <Box border={1} borderColor="divider" borderRadius={1} p={2}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
        <Typography variant="subtitle2">Componente {compIdx + 1}</Typography>
        <IconButton size="small" color="error" onClick={onRemove}>
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Stack>

      <Stack spacing={1.5} mb={2}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <Controller
            name={`components.${compIdx}.name`}
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Nombre del componente"
                size="small"
                fullWidth
                error={!!errors.components?.[compIdx]?.name}
                helperText={errors.components?.[compIdx]?.name?.message}
              />
            )}
          />
          <Controller
            name={`components.${compIdx}.phase`}
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                select
                label="Fase"
                size="small"
                sx={{ minWidth: 150 }}
              >
                {PHASE_OPTIONS.map((o) => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
        </Stack>
      </Stack>

      <Divider sx={{ mb: 1.5 }} />
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
        <Typography variant="caption" color="text.secondary">
          Pasos
        </Typography>
        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={() =>
            appendStep({
              stepDefinitionId: '',
              order: stepFields.length + 1,
              isRequired: true,
            })
          }
        >
          Agregar paso
        </Button>
      </Stack>

      <Stack spacing={1}>
        {stepFields.map((stepField, stepIdx) => (
          <Stack key={stepField.id} direction="row" spacing={1} alignItems="center">
            <Typography variant="caption" color="text.secondary" sx={{ minWidth: 20 }}>
              {stepIdx + 1}.
            </Typography>
            <Controller
              name={`components.${compIdx}.steps.${stepIdx}.stepDefinitionId`}
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Tipo de paso"
                  size="small"
                  fullWidth
                  error={!!errors.components?.[compIdx]?.steps?.[stepIdx]?.stepDefinitionId}
                >
                  {stepDefs.map((sd: any) => (
                    <MenuItem key={sd.id} value={sd.id}>
                      {sd.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <IconButton size="small" onClick={() => removeStep(stepIdx)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Stack>
        ))}
        {stepFields.length === 0 && (
          <Typography variant="caption" color="text.disabled">
            Sin pasos configurados
          </Typography>
        )}
      </Stack>
    </Box>
  );
};

export default ProductTemplateFormPage;
