import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  Stack,
  Grid,
} from '@mui/material';
import ExtensionIcon from '@mui/icons-material/Extension';
import type { StepDefinition } from '../../../types/production.types';
import { STEP_CATEGORY_STYLES } from '../utils/builder.constants';

interface StepDefinitionDialogProps {
  open: boolean;
  onClose: () => void;
  stepDefinition: StepDefinition | null;
}

export const StepDefinitionDialog: React.FC<StepDefinitionDialogProps> = ({
  open,
  onClose,
  stepDefinition,
}) => {
  if (!stepDefinition) return null;

  const styleConfig = STEP_CATEGORY_STYLES[stepDefinition.type] || STEP_CATEGORY_STYLES['PAPEL'];
  const Icon = styleConfig.icon || ExtensionIcon;

  // TypeScript assertion to any to access the JSON structure safely
  const fields = (stepDefinition.fieldSchema as any)?.fields || [];
  const specFields = fields.filter((f: any) => f.stage === 'specification');
  const execFields = fields.filter((f: any) => f.stage === 'execution');

  const FieldRow = ({ field }: { field: any }) => (
    <Box sx={{ py: 1, borderBottom: '1px solid', borderColor: 'divider', '&:last-child': { borderBottom: 0 } }}>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={5}>
          <Typography variant="body2" fontWeight={500}>
            {field.label}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            Key: {field.key}
          </Typography>
        </Grid>
        <Grid item xs={3}>
          <Chip label={field.type} size="small" variant="outlined" sx={{ fontSize: 10, height: 20 }} />
        </Grid>
        <Grid item xs={4}>
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Chip 
              label={field.required ? 'Requerido' : 'Opcional'} 
              size="small" 
              color={field.required ? 'primary' : 'default'}
              variant={field.required ? 'filled' : 'outlined'}
              sx={{ fontSize: 10, height: 20 }} 
            />
          </Stack>
        </Grid>
      </Grid>
      {field.options && field.options.length > 0 && (
        <Box mt={1}>
          <Typography variant="caption" color="text.secondary">Opciones:</Typography>
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
            {field.options.map((opt: string) => (
              <Chip key={opt} label={opt} size="small" sx={{ fontSize: 9, height: 16, mb: 0.5 }} />
            ))}
          </Stack>
        </Box>
      )}
    </Box>
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box 
          sx={{ 
            bgcolor: (theme) => theme.palette.mode === 'dark' ? styleConfig.darkBg : styleConfig.lightBg,
            color: (theme) => theme.palette.mode === 'dark' ? styleConfig.darkText : styleConfig.lightText,
            p: 1,
            borderRadius: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={24} />
        </Box>
        <Box>
          <Typography variant="h6">{stepDefinition.name}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
            TIPO: {stepDefinition.type}
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent dividers>
        {stepDefinition.description && (
          <Box mb={3}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Descripción
            </Typography>
            <Typography variant="body2">{stepDefinition.description}</Typography>
          </Box>
        )}

        <Box mb={3}>
          <Typography variant="subtitle2" color="primary" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
             Variables de Especificación 
             <Chip label={specFields.length} size="small" sx={{ height: 18, fontSize: 10 }} />
          </Typography>
          <Typography variant="caption" color="text.secondary" paragraph>
            Se llenan al momento de crear la Orden de Producción.
          </Typography>
          
          {specFields.length > 0 ? (
            <Box sx={{ bgcolor: (t) => t.palette.mode === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)', p: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
              {specFields.map((f: any) => <FieldRow key={f.key} field={f} />)}
            </Box>
          ) : (
            <Typography variant="body2" color="text.disabled" fontStyle="italic">
              No requiere variables iniciales.
            </Typography>
          )}
        </Box>

        <Box>
          <Typography variant="subtitle2" color="success.main" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
             Variables de Ejecución
             <Chip label={execFields.length} size="small" sx={{ height: 18, fontSize: 10 }} />
          </Typography>
          <Typography variant="caption" color="text.secondary" paragraph>
            Las llena el operario al marcar paso como completado.
          </Typography>

          {execFields.length > 0 ? (
            <Box sx={{ bgcolor: (t) => t.palette.mode === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)', p: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
              {execFields.map((f: any) => <FieldRow key={f.key} field={f} />)}
            </Box>
          ) : (
            <Typography variant="body2" color="text.disabled" fontStyle="italic">
              No requiere variables al finalizar.
            </Typography>
          )}
        </Box>

      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained" color="primary">
          Entendido
        </Button>
      </DialogActions>
    </Dialog>
  );
};
