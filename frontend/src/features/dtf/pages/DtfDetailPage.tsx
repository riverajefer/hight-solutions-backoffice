import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  MenuItem,
  Select,
  Stack,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CloseIcon from '@mui/icons-material/Close';
import { PageHeader } from '../../../components/common/PageHeader';
import { DtfStatusChip } from '../components/DtfStatusChip';
import { useDtfDetail, useDtfFiles, useDtfMutations } from '../hooks/useDtf';
import { useAuthStore } from '../../../store/authStore';
import { PERMISSIONS } from '../../../utils/constants';
import { PATHS } from '../../../router/paths';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import axiosInstance from '../../../api/axios';
import type { DtfStatus } from '../../../types/dtf.types';

const NEXT_STATUSES: Record<DtfStatus, DtfStatus[]> = {
  BORRADOR: ['ENVIADA'],
  ENVIADA: ['EN_IMPRESION', 'BORRADOR'],
  EN_IMPRESION: ['COMPLETADA'],
  COMPLETADA: ['CONVERTIDA_EN_OP'],
  CONVERTIDA_EN_OP: [],
};

const STATUS_LABELS: Record<DtfStatus, string> = {
  BORRADOR: 'Borrador',
  ENVIADA: 'Enviada',
  EN_IMPRESION: 'En Impresión',
  COMPLETADA: 'Completada',
  CONVERTIDA_EN_OP: 'Convertida en OP',
};

export const DtfDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuthStore();
  const { changeStatus, convertToOrder } = useDtfMutations();
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<DtfStatus | ''>('');
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);

  const detailQuery = useDtfDetail(id!);
  const filesQuery = useDtfFiles(id!);
  const record = detailQuery.data;
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [viewImage, setViewImage] = useState<{ open: boolean; url: string; title: string }>({
    open: false, url: '', title: '',
  });

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

  const nextStatuses = NEXT_STATUSES[record.status] ?? [];
  const canEdit =
    hasPermission(PERMISSIONS.UPDATE_DTF) && record.status === 'BORRADOR';
  const canChangeStatus =
    hasPermission(PERMISSIONS.CHANGE_DTF_STATUS) && nextStatuses.length > 0;
  const canConvert =
    hasPermission(PERMISSIONS.CONVERT_DTF_TO_ORDER) &&
    record.status !== 'CONVERTIDA_EN_OP';

  const handleChangeStatus = async () => {
    if (!selectedStatus) return;
    await changeStatus.mutateAsync({ id: id!, dto: { status: selectedStatus } });
    setStatusDialogOpen(false);
  };

  const handleConvertToOrder = async () => {
    const order = await convertToOrder.mutateAsync(id!);
    setConvertDialogOpen(false);
    if (order?.id) {
      navigate(PATHS.ORDERS_DETAIL.replace(':id', order.id));
    }
  };

  const files = filesQuery.data;

  return (
    <Box p={3}>
      <PageHeader
        title={record.consecutive}
        subtitle={`Registro DTF — ${record.product?.name}`}
        breadcrumbs={[
          { label: 'DTF', path: PATHS.DTF },
          { label: record.consecutive },
        ]}
        action={
          <Stack direction="row" spacing={1}>
            {canEdit && (
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => navigate(PATHS.DTF_EDIT.replace(':id', id!))}
              >
                Editar
              </Button>
            )}
            {canChangeStatus && (
              <Button
                variant="outlined"
                startIcon={<SwapHorizIcon />}
                onClick={() => {
                  setSelectedStatus('');
                  setStatusDialogOpen(true);
                }}
              >
                Cambiar estado
              </Button>
            )}
            {canConvert && (
              <Button
                variant="contained"
                color="success"
                onClick={() => setConvertDialogOpen(true)}
              >
                Convertir en OP
              </Button>
            )}
          </Stack>
        }
      />

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Información General
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Stack spacing={1.5}>
                <Row label="Consecutivo" value={record.consecutive} />
                <Row label="Producto" value={record.product?.name} />
                <Row label="Cliente" value={record.client?.name} />
                <Row
                  label="Estado"
                  value={<DtfStatusChip status={record.status} />}
                />
                <Row label="Fecha" value={formatDate(record.createdAt)} />
                {record.notes && <Row label="Notas" value={record.notes} />}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Valores
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Stack spacing={1.5}>
                <Row label="Cantidad" value={Number(record.quantity).toLocaleString('es-CO')} />
                <Row
                  label="Precio unitario"
                  value={formatCurrency(Number(record.unitPrice))}
                />
                <Row
                  label="Valor total"
                  value={
                    <Typography fontWeight={600} variant="body2">
                      {formatCurrency(Number(record.value))}
                    </Typography>
                  }
                />
              </Stack>
            </CardContent>
          </Card>

          {record.order && (
            <Card variant="outlined" sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Orden de Pedido
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Button
                  component={RouterLink}
                  to={PATHS.ORDERS_DETAIL.replace(':id', record.order.id)}
                  endIcon={<OpenInNewIcon />}
                  size="small"
                >
                  {record.order.orderNumber}
                </Button>
              </CardContent>
            </Card>
          )}
        </Grid>

        {(files?.images?.length || files?.comprobantes?.length) ? (
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Archivos
                </Typography>
                <Divider sx={{ mb: 2 }} />

                {(files?.images?.length ?? 0) > 0 && (
                  <Box mb={files?.comprobantes?.length ? 3 : 0}>
                    <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                      Imágenes de referencia
                    </Typography>
                    <Stack direction="row" flexWrap="wrap" gap={1.5}>
                      {files!.images.map((img) => (
                        <Box
                          key={img.id}
                          component="img"
                          src={signedUrls[img.id]}
                          alt={img.originalName}
                          onClick={() =>
                            setViewImage({ open: true, url: signedUrls[img.id], title: img.originalName })
                          }
                          sx={{
                            width: 120,
                            height: 120,
                            objectFit: 'cover',
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: 'grey.300',
                            cursor: 'pointer',
                            transition: 'opacity 0.2s, transform 0.2s',
                            '&:hover': { opacity: 0.85, transform: 'scale(1.03)' },
                          }}
                        />
                      ))}
                    </Stack>
                  </Box>
                )}

                {(files?.comprobantes?.length ?? 0) > 0 && (
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                      Comprobantes de pago
                    </Typography>
                    <Stack direction="row" flexWrap="wrap" gap={1.5}>
                      {files!.comprobantes.map((comp) => (
                        <Box
                          key={comp.id}
                          component="img"
                          src={signedUrls[comp.id]}
                          alt={comp.originalName}
                          onClick={() =>
                            setViewImage({ open: true, url: signedUrls[comp.id], title: comp.originalName })
                          }
                          sx={{
                            width: 120,
                            height: 120,
                            objectFit: 'cover',
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: 'grey.300',
                            cursor: 'pointer',
                            transition: 'opacity 0.2s, transform 0.2s',
                            '&:hover': { opacity: 0.85, transform: 'scale(1.03)' },
                          }}
                        />
                      ))}
                    </Stack>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ) : null}
      </Grid>

      {/* Change Status Dialog */}
      <Dialog open={statusDialogOpen} onClose={() => setStatusDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Cambiar estado</DialogTitle>
        <DialogContent>
          <Select
            fullWidth
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as DtfStatus)}
            displayEmpty
            size="small"
            sx={{ mt: 1 }}
          >
            <MenuItem value="" disabled>Seleccionar estado...</MenuItem>
            {nextStatuses.map((s) => (
              <MenuItem key={s} value={s}>{STATUS_LABELS[s]}</MenuItem>
            ))}
          </Select>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialogOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleChangeStatus}
            disabled={!selectedStatus || changeStatus.isPending}
          >
            {changeStatus.isPending ? <CircularProgress size={18} /> : 'Confirmar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Full-size image viewer */}
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

      {/* Convert to Order Dialog */}
      <Dialog open={convertDialogOpen} onClose={() => setConvertDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Convertir en Orden de Pedido</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Desea convertir el registro <strong>{record.consecutive}</strong> en una Orden de
            Pedido? Se creará una OP con el cliente y el producto correspondiente.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConvertDialogOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleConvertToOrder}
            disabled={convertToOrder.isPending}
          >
            {convertToOrder.isPending ? <CircularProgress size={18} /> : 'Convertir'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

const Row = ({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) => (
  <Stack direction="row" spacing={1} alignItems="center">
    <Typography variant="body2" color="text.secondary" sx={{ minWidth: 130 }}>
      {label}:
    </Typography>
    {typeof value === 'string' || typeof value === 'number' ? (
      <Typography variant="body2">{value}</Typography>
    ) : (
      value
    )}
  </Stack>
);

export default DtfDetailPage;
