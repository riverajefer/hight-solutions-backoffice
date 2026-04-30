import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  Stack,
  TextField,
  Typography,
  Alert,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import UploadIcon from '@mui/icons-material/Upload';
import CloseIcon from '@mui/icons-material/Close';
import { PageHeader } from '../../../components/common/PageHeader';
import { useDtfDetail, useDtfFiles, useDtfMutations } from '../hooks/useDtf';
import { PATHS } from '../../../router/paths';
import axiosInstance from '../../../api/axios';

export const DtfEditPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { update, uploadImage, uploadComprobante } = useDtfMutations();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const comprobanteInputRef = useRef<HTMLInputElement>(null);

  const detailQuery = useDtfDetail(id!);
  const filesQuery = useDtfFiles(id!);
  const record = detailQuery.data;

  const [quantity, setQuantity] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [initialized, setInitialized] = useState(false);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [viewImage, setViewImage] = useState<{ open: boolean; url: string; title: string }>({
    open: false, url: '', title: '',
  });

  if (record && !initialized) {
    setQuantity(String(Number(record.quantity)));
    setNotes(record.notes ?? '');
    setInitialized(true);
  }

  useEffect(() => {
    const files = filesQuery.data;
    if (!files) return;
    const allFiles = [...(files.images ?? []), ...(files.comprobantes ?? [])];
    const missing = allFiles.filter((f) => !signedUrls[f.id]);
    if (missing.length === 0) return;
    Promise.all(
      missing.map(async (f) => {
        const { data } = await axiosInstance.get(`/storage/${f.id}/url`);
        return [f.id, data.url as string] as const;
      }),
    ).then((entries) =>
      setSignedUrls((prev) => ({ ...prev, ...Object.fromEntries(entries) })),
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filesQuery.data]);

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
        breadcrumbs={[
          { label: 'DTF', path: PATHS.DTF },
          { label: record.consecutive, path: PATHS.DTF_DETAIL.replace(':id', id!) },
          { label: 'Editar' },
        ]}
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
                  {(filesQuery.data?.images?.length ?? 0) > 0 && (
                    <Stack direction="row" flexWrap="wrap" gap={1} mb={1}>
                      {filesQuery.data!.images.map((img) => (
                        <Box
                          key={img.id}
                          component="img"
                          src={signedUrls[img.id]}
                          alt={img.originalName}
                          onClick={() => setViewImage({ open: true, url: signedUrls[img.id], title: img.originalName })}
                          sx={{
                            width: 80,
                            height: 80,
                            objectFit: 'cover',
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: 'grey.300',
                            cursor: 'pointer',
                            '&:hover': { opacity: 0.85 },
                          }}
                        />
                      ))}
                    </Stack>
                  )}
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
                  {(filesQuery.data?.comprobantes?.length ?? 0) > 0 && (
                    <Stack direction="row" flexWrap="wrap" gap={1} mb={1}>
                      {filesQuery.data!.comprobantes.map((comp) => (
                        <Box
                          key={comp.id}
                          component="img"
                          src={signedUrls[comp.id]}
                          alt={comp.originalName}
                          onClick={() => setViewImage({ open: true, url: signedUrls[comp.id], title: comp.originalName })}
                          sx={{
                            width: 80,
                            height: 80,
                            objectFit: 'cover',
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: 'grey.300',
                            cursor: 'pointer',
                            '&:hover': { opacity: 0.85 },
                          }}
                        />
                      ))}
                    </Stack>
                  )}
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

      <Dialog
        open={viewImage.open}
        onClose={() => setViewImage({ open: false, url: '', title: '' })}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {viewImage.title}
          <IconButton size="small" onClick={() => setViewImage({ open: false, url: '', title: '' })}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {viewImage.url && (
            <Box
              component="img"
              src={viewImage.url}
              alt={viewImage.title}
              sx={{ width: '100%', maxHeight: '75vh', objectFit: 'contain' }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default DtfEditPage;
