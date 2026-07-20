import React, { useEffect } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  TextField,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  CONTACT_MEDIUM_LABELS,
  CONTACT_OUTCOME_LABELS,
  ContactMedium,
  ContactOutcome,
  Prospect,
} from '../../../types/prospect.types';

const schema = z.object({
  contactDate: z.date({ required_error: 'La fecha es requerida' }).nullable(),
  medium: z.nativeEnum(ContactMedium, {
    required_error: 'Selecciona el medio',
  }),
  outcome: z.union([z.nativeEnum(ContactOutcome), z.literal('')]).optional(),
  note: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface ProspectContactDialogProps {
  open: boolean;
  prospect?: Prospect | null;
  isSaving?: boolean;
  onClose: () => void;
  onSubmit: (values: {
    contactDate: string;
    medium: ContactMedium;
    outcome?: ContactOutcome;
    note?: string;
  }) => void;
}

export const ProspectContactDialog: React.FC<ProspectContactDialogProps> = ({
  open,
  prospect,
  isSaving = false,
  onClose,
  onSubmit,
}) => {
  const { control, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      contactDate: new Date(),
      medium: ContactMedium.WHATSAPP,
      outcome: '',
      note: '',
    },
  });

  useEffect(() => {
    if (!open) return;
    reset({
      contactDate: new Date(),
      medium: ContactMedium.WHATSAPP,
      outcome: '',
      note: '',
    });
  }, [open, reset]);

  const submit = (values: FormValues) => {
    if (!values.contactDate) return;
    onSubmit({
      contactDate: values.contactDate.toISOString(),
      medium: values.medium,
      outcome: values.outcome ? (values.outcome as ContactOutcome) : undefined,
      note: values.note?.trim() || undefined,
    });
  };

  const nombre = prospect?.name || prospect?.phone || prospect?.email || '';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit(submit)}>
        <DialogTitle>
          Registrar contacto{nombre ? ` — ${nombre}` : ''}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12} sm={6}>
              <Controller
                name="contactDate"
                control={control}
                render={({ field, fieldState }) => (
                  <DatePicker
                    label="Fecha del contacto"
                    value={field.value}
                    onChange={field.onChange}
                    maxDate={new Date()}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        error: !!fieldState.error,
                        helperText: fieldState.error?.message,
                      },
                    }}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="medium"
                control={control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    select
                    label="Medio"
                    fullWidth
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                  >
                    {Object.values(ContactMedium).map((m) => (
                      <MenuItem key={m} value={m}>
                        {CONTACT_MEDIUM_LABELS[m]}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <Controller
                name="outcome"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    label="Resultado"
                    fullWidth
                    helperText="Necesario para medir la tasa de respuesta"
                  >
                    <MenuItem value="">Sin registrar</MenuItem>
                    {Object.values(ContactOutcome).map((o) => (
                      <MenuItem key={o} value={o}>
                        {CONTACT_OUTCOME_LABELS[o]}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <Controller
                name="note"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Nota"
                    fullWidth
                    multiline
                    rows={2}
                    placeholder="Ej: pidió precios de gorras bordadas"
                  />
                )}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="contained" disabled={isSaving}>
            {isSaving ? 'Guardando...' : 'Registrar'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
