import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Stack,
  CircularProgress,
  Alert,
  TextField,
  MenuItem,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CategoryIcon from '@mui/icons-material/Category';
import AddIcon from '@mui/icons-material/Add';
import { useSnackbar } from 'notistack';
import { PageHeader } from '../../../components/common/PageHeader';
import {
  useProductTemplate,
  useCreateProductTemplate,
  useUpdateProductTemplate,
  useStepDefinitions,
} from '../hooks/useProduction';
import { ROUTES } from '../../../utils/constants';
import { useTemplateBuilderStore } from '../store/useTemplateBuilderStore';
import { TemplateBuilderContainer } from '../components/TemplateBuilder/TemplateBuilderContainer';

const CATEGORY_OPTIONS = [
  { value: 'cuadernos', label: 'Cuadernos' },
  { value: 'papeleria_impresa', label: 'Papelería impresa' },
  { value: 'revistas', label: 'Revistas / Catálogos' },
  { value: 'talonarios', label: 'Talonarios' },
  { value: 'otro', label: 'Otro' },
];

const ProductTemplateFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const templateQuery = useProductTemplate(id ?? '');
  const stepDefsQuery = useStepDefinitions();
  const createTemplate = useCreateProductTemplate();
  const updateTemplate = useUpdateProductTemplate(id ?? '');

  const store = useTemplateBuilderStore();

  useEffect(() => {
    if (isEdit && templateQuery.data && !templateQuery.isLoading) {
      const t = templateQuery.data;
      store.setAllData({
        name: t.name,
        category: t.category,
        description: t.description ?? '',
        components: [...(t.components ?? [])]
          .sort((a, b) => a.order - b.order)
          .map((c) => ({
            id: c.id || Math.random().toString(),
            name: c.name,
            phase: c.phase,
            isRequired: c.isRequired,
            order: c.order,
            steps: [...c.steps]
              .sort((a, b) => a.order - b.order)
              .map((s) => ({
                id: s.id || Math.random().toString(),
                stepDefinitionId: s.stepDefinition.id,
                stepType: s.stepDefinition.type,
                name: s.stepDefinition.name,
                order: s.order,
                isRequired: s.isRequired,
              })),
          })),
      });
    }
    
    return () => {
      if (!isEdit) store.reset(); // Only reset if we are leaving the creation context
    };
  }, [isEdit, templateQuery.data, templateQuery.isLoading]);

  // Handle saving the template visually
  const handleSave = async () => {
    // Validations
    if (!store.name.trim()) {
      enqueueSnackbar('El nombre de la plantilla es requerido', { variant: 'error' });
      return;
    }
    if (store.components.length === 0) {
      enqueueSnackbar('Debes agregar al menos un componente', { variant: 'error' });
      return;
    }

    let hasEmptyComponents = false;
    store.components.forEach(c => {
      if (c.steps.length === 0) hasEmptyComponents = true;
    });

    if (hasEmptyComponents) {
      enqueueSnackbar('Todos los componentes deben tener al menos un paso', { variant: 'error' });
      return;
    }

    try {
      const payload = {
        name: store.name,
        category: store.category,
        description: store.description,
        components: store.components.map((c, i) => ({
          name: c.name,
          order: i + 1,
          phase: c.phase,
          isRequired: c.isRequired,
          steps: c.steps.map((s, j) => ({
            stepDefinitionId: s.stepDefinitionId,
            order: j + 1,
            isRequired: s.isRequired,
          })),
        })),
      };

      if (isEdit) {
        // Assume API allows full overwrite of components using patch/put for simplifications based on template
        await updateTemplate.mutateAsync(payload as any);
        enqueueSnackbar('Plantilla actualizada con éxito', { variant: 'success' });
        navigate(ROUTES.PRODUCT_TEMPLATES_DETAIL.replace(':id', id!));
      } else {
        await createTemplate.mutateAsync(payload);
        enqueueSnackbar('Plantilla creada con éxito', { variant: 'success' });
        navigate(ROUTES.PRODUCT_TEMPLATES);
      }
    } catch (error) {
      enqueueSnackbar('Error al guardar la plantilla', { variant: 'error' });
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
  const isSaving = isEdit ? updateTemplate.isPending : createTemplate.isPending;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', pb: 3 }}>
      <PageHeader
        title={isEdit ? 'Editar Plantilla' : 'Nueva Plantilla'}
        subtitle="Constructor visual de componentes y flujo de producción"
        icon={<CategoryIcon />}
        action={
          <Stack direction="row" spacing={2}>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate(ROUTES.PRODUCT_TEMPLATES)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button 
              variant="contained" 
              onClick={handleSave}
              disabled={isSaving}
              startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {isSaving ? 'Guardando...' : 'Guardar Plantilla'}
            </Button>
          </Stack>
        }
      />

      <Box sx={{ mb: 3 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{ mb: 2 }}
          alignItems="stretch"  // Important to stretch children equally
        >
          <TextField
            label="Nombre de la plantilla"
            value={store.name}
            onChange={(e) => store.setName(e.target.value)}
            fullWidth
            required
            size="small"
            InputProps={{
              sx: { bgcolor: 'background.paper', fontWeight: 'bold', height: '100%' }
            }}
            sx={{
              '& .MuiInputBase-root': { height: 40 } // Adjust exact pixel height if needed, often 40 for small.
            }}
          />
          <TextField
            select
            label="Categoría"
            value={store.category}
            onChange={(e) => store.setCategory(e.target.value)}
            fullWidth
            size="small"
            sx={{ 
              maxWidth: 300, 
              '& .MuiInputBase-root': { bgcolor: 'background.paper', height: 40 }
            }}
          >
            {CATEGORY_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </TextField>
          <Button 
            variant="outlined" 
            startIcon={<AddIcon />} 
            onClick={store.addComponent}
            sx={{ 
              flexShrink: 0, 
              bgcolor: 'background.paper',
              height: 40 // Force exact match with inputs
            }}
          >
            Añadir Componente
          </Button>
        </Stack>
      </Box>

      <Box sx={{ flexGrow: 1, minHeight: 0 }}>
        <TemplateBuilderContainer stepDefinitions={stepDefs} />
      </Box>
    </Box>
  );
};

export default ProductTemplateFormPage;
