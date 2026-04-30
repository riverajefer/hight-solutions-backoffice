import { useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Grid,
  Stack,
  TextField,
  Typography,
  Alert,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import UploadIcon from '@mui/icons-material/Upload';
import { PageHeader } from '../../../components/common/PageHeader';
import { useDtfDetail, useDtfMutations } from '../hooks/useDtf';
import { PATHS } from '../../../router/paths';

export const DtfEditPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { update, uploadImage, uploadComprobante } = useDtfMutations();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const comprobanteInputRef = useRef<HTMLInputElement>(null);

  const detailQuery = useDtfDetail(id!);
  const record = detailQuery.data;

  const [quantity, setQuantity] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [initialized, setInitialized] = useState(false);

  if (record && !initialized) {
    setQuantity(String(Number(record.quantity)));
    setNotes(record.notes ?? '');
    setInitialized(true);
  }

  if (detailQuery.isLoading) {
    return (
      <Box display="flex" justifyContent="center" mt={6}>
        <CircularProgress />
      </Box>
    );
  }

  if (!record) {
    return (
      <Box p={3}>
        <Alert severity="error">Registro DTF no encontrado</Alert>
      </Box>
    );
  }

  const handleSave = async () => {
    await update.mutateAsync({
      id: id!,
      dto: {
        quantity: Number(quantity),
        notes: notes || undefined,
      },
    });
    navigate(PATHS.DTF_DETAIL.replace(':id', id!));
  };

  const handleImageUpload = (file: File) => {
    uploadImage.mutate({ id: id!, file });
  };

  const handleComprobanteUpload = (file: File) => {
    uploadComprobante.mutate({ id: id!, file });
  };

  const isSaving = update.isPending;

  return (
    <Box p={3}>
      <PageHeader
        title={`Editar ${record.consecutive}`}
        subtitle={`${record.product?.name} — ${record.client?.name}`}
      />

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Editar datos
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Stack spacing={2}>
                <TextField
                  label="Cantidad"
                  type="number"
                  size="small"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  inputProps={{ min: 0, step: 0.01 }}
                  disabled={isSaving}
                  fullWidth
                />
                <TextField
                  label="Notas"
                  size="small"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  multiline
                  rows={3}
                  disabled={isSaving}
                  fullWidth
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Archivos
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Stack spacing={2}>
                <Box>
                  <Typography variant="body2" mb={1}>Imagen de referencia</Typography>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file);
                    }}
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<UploadIcon />}
                    onClick={() => imageInputRef.current?.click()}
                    disabled={uploadImage.isPending}
                  >
                    {uploadImage.isPending ? 'Subiendo...' : 'Subir imagen'}
                  </Button>
                </Box>

                <Box>
                  <Typography variant="body2" mb={1}>Comprobante de pago</Typography>
                  <input
                    ref={comprobanteInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleComprobanteUpload(file);
                    }}
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<UploadIcon />}
                    onClick={() => comprobanteInputRef.current?.click()}
                    disabled={uploadComprobante.isPending}
                  >
                    {uploadComprobante.isPending ? 'Subiendo...' : 'Subir comprobante'}
                  </Button>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Stack direction="row" spacing={2} mt={3} justifyContent="flex-end">
        <Button
          variant="outlined"
          onClick={() => navigate(PATHS.DTF_DETAIL.replace(':id', id!))}
          disabled={isSaving}
        >
          Cancelar
        </Button>
        <Button
          variant="contained"
          startIcon={isSaving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
          onClick={handleSave}
          disabled={isSaving || !quantity || Number(quantity) <= 0}
        >
          Guardar cambios
        </Button>
      </Stack>
    </Box>
  );
};

export default DtfEditPage;
