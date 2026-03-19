import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import TuneIcon from '@mui/icons-material/Tune';
import { useStepDefinition, useUpdateStepDefinitionSchema } from '../hooks/useProduction';
import { FormBuilder } from '../components/FormBuilder';
import { PATHS } from '../../../router/paths';

const FormBuilderPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const stepDefQuery = useStepDefinition(id ?? '');
  const mutation = useUpdateStepDefinitionSchema(id ?? '');

  if (!id) {
    return <Alert severity="error">ID de definición de paso no encontrado.</Alert>;
  }

  if (stepDefQuery.isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
        <CircularProgress />
      </Box>
    );
  }

  if (stepDefQuery.isError || !stepDefQuery.data) {
    return (
      <Alert severity="error">
        No se pudo cargar la definición de paso. Verifica que el ID sea válido.
      </Alert>
    );
  }

  const stepDef = stepDefQuery.data;

  return (
    <Box>
      {/* Breadcrumb navigation */}
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        <Button
          startIcon={<ArrowBackIcon />}
          size="small"
          onClick={() => navigate(PATHS.STEP_DEFINITIONS)}
          sx={{ color: 'text.secondary' }}
        >
          Definiciones de pasos
        </Button>
        <Typography variant="body2" color="text.disabled">/</Typography>
        <Box display="flex" alignItems="center" gap={0.5}>
          <TuneIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
          <Typography variant="body2" color="text.primary" fontWeight={600}>
            {stepDef.name}
          </Typography>
        </Box>
      </Box>

      {/* Form Builder */}
      <FormBuilder stepDefinition={stepDef} mutation={mutation} />
    </Box>
  );
};

export default FormBuilderPage;
