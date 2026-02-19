import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Divider,
  Stack,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  ShoppingCartCheckout as ConvertIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  Storefront as ChannelIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
  Visibility as VisibilityIcon,
  Close as CloseIcon,
  WhatsApp as WhatsAppIcon,
} from '@mui/icons-material';
import { PageHeader } from '../../../components/common/PageHeader';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useQuotes } from '../hooks/useQuotes';
import { QuoteStatusChip } from '../components/QuoteStatusChip';
import { QuoteStatus, QUOTE_STATUS_CONFIG, QuoteItem } from '../../../types/quote.types';
import { generateQuotePdf } from '../utils/generateQuotePdf';
import { useSnackbar } from 'notistack';
import axiosInstance from '../../../api/axios';

const formatCurrency = (value: string | number): string => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(numValue);
};

const formatDate = (date: string): string => {
  return new Intl.DateTimeFormat('es-CO', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(date));
};

const formatDateTime = (date: string): string => {
  return new Intl.DateTimeFormat('es-CO', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  }).format(new Date(date));
};

const formatPhoneForWhatsApp = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `57${digits}`;
  if (digits.length === 12 && digits.startsWith('57')) return digits;
  if (digits.length === 13 && digits.startsWith('057')) return digits.slice(1);
  return digits;
};

export const QuoteDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { enqueueSnackbar } = useSnackbar();

  const { quoteQuery, updateQuoteMutation, deleteQuoteMutation, convertToOrderMutation } = useQuotes();
  const { data: quote, isLoading } = quoteQuery(id!);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmConvert, setConfirmConvert] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [viewImageDialog, setViewImageDialog] = useState<{
    open: boolean;
    url: string;
  }>({ open: false, url: '' });

  if (isLoading) return <LoadingSpinner />;
  if (!quote) return (
    <Box sx={{ p: 3 }}>
      <Typography>Cotización no encontrada</Typography>
      <Button onClick={() => navigate('/quotes')}>Volver al listado</Button>
    </Box>
  );

  const isConverted = quote.status === QuoteStatus.CONVERTED;
  const canEdit = !isConverted && quote.status !== QuoteStatus.CANCELLED;
  const canDelete = !isConverted;
  const canConvert = !isConverted && quote.status === QuoteStatus.ACCEPTED;

  const handleMenuClose = () => setAnchorEl(null);

  const handleChangeStatus = async (newStatus: QuoteStatus) => {
    await updateQuoteMutation.mutateAsync({ id: id!, data: { status: newStatus } });
    handleMenuClose();
  };

  const handleConvert = async () => {
    try {
      const order = await convertToOrderMutation.mutateAsync(id!);
      navigate(`/orders/${order.id}`);
    } catch (error) {}
  };

  const handleDelete = async () => {
    await deleteQuoteMutation.mutateAsync(id!);
    navigate('/quotes');
  };

  const handleDownloadPdf = async () => {
    if (!quote) return;

    setIsGeneratingPdf(true);
    try {
      const pdfDoc = await generateQuotePdf(quote);
      pdfDoc.save(`Cotizacion-${quote.quoteNumber}.pdf`);
      enqueueSnackbar('PDF descargado exitosamente', { variant: 'success' });
    } catch (error) {
      console.error('Error generating PDF:', error);
      enqueueSnackbar('Error al generar el PDF', { variant: 'error' });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrintPdf = async () => {
    if (!quote) return;

    setIsGeneratingPdf(true);
    try {
      const pdfDoc = await generateQuotePdf(quote);
      const pdfBlob = pdfDoc.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);

      const printWindow = window.open(pdfUrl, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
          URL.revokeObjectURL(pdfUrl);
        };
      } else {
        enqueueSnackbar('No se pudo abrir la ventana de impresión', { variant: 'warning' });
        URL.revokeObjectURL(pdfUrl);
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      enqueueSnackbar('Error al generar el PDF para impresión', { variant: 'error' });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleShareWhatsApp = async () => {
    if (!quote) return;

    if (!quote.client?.phone) {
      enqueueSnackbar('El cliente no tiene número de teléfono registrado', { variant: 'info' });
      return;
    }

    setIsGeneratingPdf(true);
    try {
      const pdfDoc = await generateQuotePdf(quote);
      pdfDoc.save(`Cotizacion-${quote.quoteNumber}.pdf`);

      const whatsappPhone = formatPhoneForWhatsApp(quote.client.phone);

      const totalFormatted = formatCurrency(quote.total);
      const validUntilFormatted = quote.validUntil ? formatDate(quote.validUntil) : 'sin fecha de vencimiento';

      const message = [
        `Hola ${quote.client.name},`,
        ``,
        `Adjunto encontrará la cotización *${quote.quoteNumber}* de Hight Solutions.`,
        ``,
        `*Resumen:*`,
        `• Total: ${totalFormatted}`,
        `• Válida hasta: ${validUntilFormatted}`,
        ``,
        `Quedamos atentos a cualquier pregunta. ¡Gracias por preferirnos!`,
      ].join('\n');

      const encodedMessage = encodeURIComponent(message);
      window.open(`https://wa.me/${whatsappPhone}?text=${encodedMessage}`, '_blank', 'noopener,noreferrer');

      enqueueSnackbar('PDF descargado. Adjúntalo en la conversación de WhatsApp que se abrió.', { variant: 'success' });
    } catch (error) {
      console.error('Error al compartir por WhatsApp:', error);
      enqueueSnackbar('Error al generar el PDF para compartir', { variant: 'error' });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleViewImage = async (sampleImageId: string) => {
    try {
      const { data } = await axiosInstance.get(`/storage/${sampleImageId}/url`);
      setViewImageDialog({ open: true, url: data.url });
    } catch (error) {
      console.error('Error loading image:', error);
      enqueueSnackbar('Error al cargar la imagen', { variant: 'error' });
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <PageHeader
        title={`Cotización ${quote.quoteNumber}`}
        breadcrumbs={[{ label: 'Cotizaciones', path: '/quotes' }, { label: quote.quoteNumber }]}
        action={
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
            >
              Descargar PDF
            </Button>
            <Button
              variant="outlined"
              startIcon={<PrintIcon />}
              onClick={handlePrintPdf}
              disabled={isGeneratingPdf}
            >
              Imprimir
            </Button>
            <Button
              variant="outlined"
              startIcon={<WhatsAppIcon />}
              onClick={handleShareWhatsApp}
              disabled={isGeneratingPdf}
              sx={{
                color: 'success.dark',
                borderColor: 'success.main',
                '&:hover': {
                  borderColor: 'success.dark',
                  backgroundColor: 'success.light',
                  color: 'success.dark',
                },
              }}
            >
              Compartir WhatsApp
            </Button>
            {canEdit && (
              <Button variant="outlined" startIcon={<EditIcon />} onClick={() => navigate(`/quotes/${id}/edit`)}>
                Editar
              </Button>
            )}
            {canConvert && (
              <Button variant="contained" color="success" startIcon={<ConvertIcon />} onClick={() => setConfirmConvert(true)}>
                Convertir a Orden
              </Button>
            )}
            <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}><MoreVertIcon /></IconButton>
          </Stack>
        }
      />

      {isConverted && quote.order && (
        <Card sx={{ mb: 3, bgcolor: 'secondary.light', color: 'secondary.contrastText' }}>
          <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
            <Typography variant="body2" fontWeight={600}>
              Esta cotización ya fue convertida en la orden{' '}
              <Button 
                variant="text" 
                color="inherit" 
                size="small" 
                onClick={() => navigate(`/orders/${quote.order?.id}`)} 
                sx={{ textDecoration: 'underline', fontWeight: 800 }}
              >
                {quote.order.orderNumber}
              </Button>
            </Typography>
          </CardContent>
        </Card>
      )}

      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid item xs={12} md={8}>
          <Stack spacing={3}>
            <Card>
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={3}>
                    <Typography variant="body2" color="textSecondary">Estado</Typography>
                    <Box sx={{ mt: 1 }}><QuoteStatusChip status={quote.status} size="medium" /></Box>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Typography variant="body2" color="textSecondary">Fecha</Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 1 }}><CalendarIcon fontSize="small"/><Typography>{formatDateTime(quote.quoteDate)}</Typography></Stack>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Typography variant="body2" color="textSecondary">Vence</Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 1 }}><CalendarIcon fontSize="small"/><Typography>{quote.validUntil ? formatDate(quote.validUntil) : '-'}</Typography></Stack>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Typography variant="body2" color="textSecondary">Canal</Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 1 }}><ChannelIcon fontSize="small"/><Typography>{quote.commercialChannel?.name || '-'}</Typography></Stack>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Items</Typography>
                <Divider sx={{ mb: 2 }} />
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        {quote.items?.some(item => item.sampleImageId) && (
                          <TableCell width="60px" align="center">Imagen</TableCell>
                        )}
                        <TableCell>Descripción</TableCell>
                        <TableCell align="right">Cant.</TableCell>
                        <TableCell align="right">P. Unit</TableCell>
                        <TableCell align="right">Total</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {quote.items?.map((item: QuoteItem) => (
                        <TableRow key={item.id}>
                          {quote.items?.some(i => i.sampleImageId) && (
                            <TableCell align="center">
                              {item.sampleImageId && (
                                <IconButton
                                  size="small"
                                  onClick={() => handleViewImage(item.sampleImageId!)}
                                  color="primary"
                                >
                                  <VisibilityIcon fontSize="small" />
                                </IconButton>
                              )}
                            </TableCell>
                          )}
                          <TableCell>
                            {item.product && <Chip label={item.product.name} size="small" sx={{ mr: 1, mb: 0.5 }} />}
                            <Typography variant="body2">{item.description}</Typography>
                          </TableCell>
                          <TableCell align="right">{item.quantity.toString()}</TableCell>
                          <TableCell align="right">{formatCurrency(item.unitPrice)}</TableCell>
                          <TableCell align="right"><Typography fontWeight={500}>{formatCurrency(item.total)}</Typography></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                <Box sx={{ mt: 3, ml: 'auto', width: 'fit-content' }}>
                  <Stack spacing={1} alignItems="flex-end">
                    <Typography>Subtotal: {formatCurrency(quote.subtotal)}</Typography>
                    {parseFloat(quote.tax.toString()) > 0 && (
                      <Typography>IVA ({(parseFloat(quote.taxRate.toString()) * 100).toFixed(0)}%): {formatCurrency(quote.tax)}</Typography>
                    )}
                    <Typography variant="h6" color="primary">Total: {formatCurrency(quote.total)}</Typography>
                  </Stack>
                </Box>
              </CardContent>
            </Card>

            {quote.notes && (
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Observaciones</Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Typography variant="body2">{quote.notes}</Typography>
                </CardContent>
              </Card>
            )}
          </Stack>
        </Grid>

        <Grid item xs={12} md={4}>
          <Stack spacing={3}>
            <Card>
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}><PersonIcon color="primary" /><Typography variant="h6">Cliente</Typography></Stack>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="subtitle1" fontWeight={600}>{quote.client?.name}</Typography>
                <Typography variant="body2" color="textSecondary">{quote.client?.email}</Typography>
                <Typography variant="body2" color="textSecondary">{quote.client?.phone}</Typography>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Info Adicional</Typography>
                <Divider sx={{ mb: 2 }} />
                <Stack spacing={1}>
                  <Box>
                    <Typography variant="caption" color="textSecondary">Creado por</Typography>
                    <Typography variant="body2">{quote.createdBy?.firstName} {quote.createdBy?.lastName}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="textSecondary">Fecha creación</Typography>
                    <Typography variant="body2">{formatDateTime(quote.createdAt)}</Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        {Object.entries(QUOTE_STATUS_CONFIG).map(([status, config]) => (
          <MenuItem key={status} onClick={() => handleChangeStatus(status as QuoteStatus)} disabled={quote.status === status}>
            <Chip label={config.label} color={config.color} size="small" />
          </MenuItem>
        ))}
        <Divider />
        {canDelete && (
          <MenuItem onClick={() => setConfirmDelete(true)} sx={{ color: 'error.main' }}>
            <DeleteIcon sx={{ mr: 1 }} fontSize="small" /> Eliminar
          </MenuItem>
        )}
      </Menu>

      <ConfirmDialog
        open={confirmDelete}
        title="Eliminar Cotización"
        message="¿Confirma eliminar esta cotización?"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
        isLoading={deleteQuoteMutation.isPending}
      />

      <ConfirmDialog
        open={confirmConvert}
        title="Convertir a Orden"
        message="¿Confirma convertir esta cotización en una orden de pedido?"
        onConfirm={handleConvert}
        onCancel={() => setConfirmConvert(false)}
        isLoading={convertToOrderMutation.isPending}
      />

      {/* View Image Dialog */}
      <Dialog
        open={viewImageDialog.open}
        onClose={() => setViewImageDialog({ open: false, url: '' })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Imagen de Muestra
          <IconButton
            onClick={() => setViewImageDialog({ open: false, url: '' })}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box
            component="img"
            src={viewImageDialog.url}
            alt="Muestra"
            sx={{
              width: '100%',
              height: 'auto',
              maxHeight: '70vh',
              objectFit: 'contain',
            }}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default QuoteDetailPage;
