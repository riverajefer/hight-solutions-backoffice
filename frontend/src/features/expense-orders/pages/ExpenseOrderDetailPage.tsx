import { useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Stack,
  Card,
  CardContent,
  Typography,
  Button,
  Divider,
  Chip,
  Grid,
  MenuItem,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  InputAdornment,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Edit as EditIcon,
  ArrowBack as ArrowBackIcon,
  SwapHoriz as SwapHorizIcon,
  Add as AddIcon,
  AttachFile as AttachFileIcon,
  Close as CloseIcon,
  Image as ImageIcon,
  Receipt as ReceiptIcon,
  Download as DownloadIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { PageHeader } from '../../../components/common/PageHeader';
import { useExpenseOrder } from '../hooks';
import { useSuppliers } from '../../suppliers/hooks/useSuppliers';
import { useProductionAreas } from '../../production-areas/hooks/useProductionAreas';
import { useAuthStore } from '../../../store/authStore';
import { storageApi } from '../../../api/storage.api';
import { PERMISSIONS, ROUTES } from '../../../utils/constants';
import {
  ExpenseOrderStatus,
  EXPENSE_ORDER_STATUS_CONFIG,
  PAYMENT_METHOD_LABELS,
  PaymentMethod,
  type CreateExpenseItemDto,
} from '../../../types/expense-order.types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatDate = (date?: string | null): string => {
  if (!date) return '-';
  return new Intl.DateTimeFormat('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
};

const formatCurrency = (value?: string | number | null): string => {
  if (value == null) return '-';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(isNaN(num) ? 0 : num);
};

const STATUS_TRANSITIONS: Record<ExpenseOrderStatus, ExpenseOrderStatus[]> = {
  [ExpenseOrderStatus.DRAFT]: [ExpenseOrderStatus.CREATED, ExpenseOrderStatus.AUTHORIZED],
  [ExpenseOrderStatus.CREATED]: [ExpenseOrderStatus.AUTHORIZED, ExpenseOrderStatus.DRAFT],
  [ExpenseOrderStatus.AUTHORIZED]: [ExpenseOrderStatus.PAID],
  [ExpenseOrderStatus.PAID]: [],
};

const userName = (user?: { firstName?: string | null; lastName?: string | null; email: string } | null) => {
  if (!user) return '—';
  const full = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
  return full || user.email;
};

// ─── Default item form ────────────────────────────────────────────────────────

interface ItemForm {
  name: string;
  quantity: string;
  unitPrice: string;
  description: string;
  paymentMethod: PaymentMethod;
  supplierId: string;
  productionAreaIds: string[];
}

const defaultItemForm = (): ItemForm => ({
  name: '',
  quantity: '1',
  unitPrice: '',
  description: '',
  paymentMethod: PaymentMethod.CASH,
  supplierId: '',
  productionAreaIds: [],
});

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

// ─── Main Component ───────────────────────────────────────────────────────────

export const ExpenseOrderDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuthStore();

  const { expenseOrderQuery, updateStatusMutation, addExpenseItemMutation } = useExpenseOrder(id);
  const { suppliersQuery } = useSuppliers();
  const { productionAreasQuery } = useProductionAreas();

  const suppliers = suppliersQuery.data ?? [];
  const productionAreas = productionAreasQuery.data ?? [];

  // ── Status dialog ────────────────────────────────────────────────────────────
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<ExpenseOrderStatus | ''>('');

  // ── Add item dialog ──────────────────────────────────────────────────────────
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [itemForm, setItemForm] = useState<ItemForm>(defaultItemForm());
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ── View receipt dialog ──────────────────────────────────────────────────────
  const [receiptDialog, setReceiptDialog] = useState<{
    open: boolean;
    url: string;
    mimeType: string;
    originalName: string;
    fileId: string;
  }>({ open: false, url: '', mimeType: '', originalName: '', fileId: '' });
  const [loadingReceiptId, setLoadingReceiptId] = useState<string | null>(null);

  const canUpdate = hasPermission(PERMISSIONS.UPDATE_EXPENSE_ORDERS);
  const canApprove = hasPermission(PERMISSIONS.APPROVE_EXPENSE_ORDERS);

  const og = expenseOrderQuery.data;

  // ── Status change ────────────────────────────────────────────────────────────
  const handleStatusChange = async () => {
    if (!id || !newStatus) return;
    await updateStatusMutation.mutateAsync({ id, dto: { status: newStatus as ExpenseOrderStatus } });
    setStatusDialogOpen(false);
    setNewStatus('');
  };

  // ── Add item ─────────────────────────────────────────────────────────────────
  const handleOpenItemDialog = () => {
    setItemForm(defaultItemForm());
    setReceiptFile(null);
    setItemDialogOpen(true);
  };

  const handleCloseItemDialog = () => {
    setItemDialogOpen(false);
    setItemForm(defaultItemForm());
    setReceiptFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleReceiptFileChange = (file: File | null) => {
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return;
    setReceiptFile(file);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const extension = file.type.split('/')[1] || 'png';
          const newFile = new File([file], `pasted-image-${Date.now()}.${extension}`, { type: file.type });
          handleReceiptFileChange(newFile);
          e.preventDefault();
          break;
        }
      }
    }
  };

  const isItemFormValid =
    itemForm.name.trim().length > 0 &&
    parseFloat(itemForm.quantity) > 0 &&
    parseFloat(itemForm.unitPrice) > 0;

  const handleAddItem = async () => {
    if (!id || !isItemFormValid) return;

    let receiptFileId: string | undefined;

    if (receiptFile) {
      const uploaded = await storageApi.uploadFile(receiptFile, { entityType: 'expense_order' });
      receiptFileId = uploaded.id;
    }

    const dto: CreateExpenseItemDto = {
      name: itemForm.name.trim(),
      quantity: parseFloat(itemForm.quantity),
      unitPrice: parseFloat(itemForm.unitPrice),
      description: itemForm.description || undefined,
      paymentMethod: itemForm.paymentMethod,
      supplierId: itemForm.supplierId || undefined,
      productionAreaIds:
        og?.workOrder && itemForm.productionAreaIds.length
          ? itemForm.productionAreaIds
          : undefined,
      receiptFileId,
    };

    await addExpenseItemMutation.mutateAsync({ id, dto });
    handleCloseItemDialog();
  };

  // ── View / download receipt ───────────────────────────────────────────────────
  const handleViewReceipt = async (fileId: string) => {
    setLoadingReceiptId(fileId);
    try {
      const [urlResponse, fileData] = await Promise.all([
        storageApi.getFileUrl(fileId),
        storageApi.getFile(fileId),
      ]);
      setReceiptDialog({
        open: true,
        url: urlResponse.url,
        mimeType: fileData.mimeType,
        originalName: fileData.originalName,
        fileId,
      });
    } finally {
      setLoadingReceiptId(null);
    }
  };

  const handleDownloadReceipt = async (fileId: string, originalName: string) => {
    try {
      const response = await import('../../../api/axios').then(({ default: axiosInstance }) =>
        axiosInstance.get(`/storage/${fileId}/download`, { responseType: 'blob' }),
      );
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = originalName || 'comprobante';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      // silently ignore — user can try again
    }
  };

  // ── Loading / not found ───────────────────────────────────────────────────────
  if (expenseOrderQuery.isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
        <CircularProgress />
      </Box>
    );
  }

  if (!og) {
    return (
      <Box>
        <PageHeader title="Orden de Gasto" />
        <Alert severity="error">Orden de gasto no encontrada.</Alert>
      </Box>
    );
  }

  const statusConfig = EXPENSE_ORDER_STATUS_CONFIG[og.status];
  const allowedTransitions = STATUS_TRANSITIONS[og.status] ?? [];
  const totalAmount = og.items.reduce((acc, item) => acc + parseFloat(item.total), 0);
  const isEditable =
    og.status === ExpenseOrderStatus.DRAFT || og.status === ExpenseOrderStatus.CREATED;

  const availableTransitions = allowedTransitions.filter((s) => {
    if (s === ExpenseOrderStatus.PAID) return canApprove;
    return canUpdate;
  });

  return (
    <Box>
      <PageHeader
        title={og.ogNumber}
        subtitle={`${og.expenseType.name} / ${og.expenseSubcategory.name}`}
      />

      {/* Header actions */}
      <Stack direction="row" spacing={2} mb={3} flexWrap="wrap">
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(ROUTES.EXPENSE_ORDERS)}>
          Volver
        </Button>
        {canUpdate && isEditable && (
          <Button
            startIcon={<EditIcon />}
            variant="outlined"
            onClick={() => navigate(ROUTES.EXPENSE_ORDERS_EDIT.replace(':id', og.id))}
          >
            Editar
          </Button>
        )}
        {canUpdate && isEditable && (
          <Button
            startIcon={<AddIcon />}
            variant="outlined"
            color="secondary"
            onClick={handleOpenItemDialog}
          >
            Agregar Ítem
          </Button>
        )}
        {availableTransitions.length > 0 && (
          <Button
            startIcon={<SwapHorizIcon />}
            variant="contained"
            onClick={() => setStatusDialogOpen(true)}
          >
            Cambiar Estado
          </Button>
        )}
      </Stack>

      <Grid container spacing={3}>
        {/* Left column */}
        <Grid item xs={12} md={8}>
          {/* General info */}
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} mb={2}>
                Información General
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">Estado</Typography>
                  <Box mt={0.5}>
                    <Chip label={statusConfig.label} color={statusConfig.color} size="small" />
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">Fecha</Typography>
                  <Typography variant="body2">{formatDate(og.createdAt)}</Typography>
                </Grid>
                {og.workOrder && (
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">OT Asociada</Typography>
                    <Typography variant="body2">{og.workOrder.workOrderNumber}</Typography>
                  </Grid>
                )}
                {og.areaOrMachine && (
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">Área / Máquina</Typography>
                    <Typography variant="body2">{og.areaOrMachine}</Typography>
                  </Grid>
                )}
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">Se autoriza a</Typography>
                  <Typography variant="body2">{userName(og.authorizedTo)}</Typography>
                </Grid>
                {og.responsible && (
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">Responsable</Typography>
                    <Typography variant="body2">{userName(og.responsible)}</Typography>
                  </Grid>
                )}
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">Creado por</Typography>
                  <Typography variant="body2">{userName(og.createdBy)}</Typography>
                </Grid>
              </Grid>

              {og.observations && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="caption" color="text.secondary">Observaciones</Typography>
                  <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-line' }}>
                    {og.observations}
                  </Typography>
                </>
              )}
            </CardContent>
          </Card>

          {/* Items table */}
          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="subtitle1" fontWeight={700}>
                  Ítems de Gasto
                </Typography>
                {canUpdate && isEditable && (
                  <Button
                    startIcon={<AddIcon />}
                    size="small"
                    variant="outlined"
                    color="secondary"
                    onClick={handleOpenItemDialog}
                  >
                    Agregar Ítem
                  </Button>
                )}
              </Stack>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Ítem</TableCell>
                    <TableCell align="center">Cant.</TableCell>
                    <TableCell align="right">Precio Unit.</TableCell>
                    <TableCell align="right">Total</TableCell>
                    <TableCell>Método de Pago</TableCell>
                    <TableCell>Proveedor</TableCell>
                    {og.workOrder && <TableCell>Áreas</TableCell>}
                    <TableCell align="center">Comprobante</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {og.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {item.name}
                        </Typography>
                        {item.description && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            {item.description}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">{item.quantity}</TableCell>
                      <TableCell align="right">{formatCurrency(item.unitPrice)}</TableCell>
                      <TableCell align="right">
                        <strong>{formatCurrency(item.total)}</strong>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={PAYMENT_METHOD_LABELS[item.paymentMethod]}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>{item.supplier?.name ?? '—'}</TableCell>
                      {og.workOrder && (
                        <TableCell>
                          {item.productionAreas.length > 0
                            ? item.productionAreas
                                .map((pa) => pa.productionArea.name)
                                .join(', ')
                            : '—'}
                        </TableCell>
                      )}
                      <TableCell align="center">
                        {item.receiptFileId ? (
                          <Tooltip title="Ver comprobante">
                            <span>
                              <IconButton
                                size="small"
                                color="success"
                                onClick={() => handleViewReceipt(item.receiptFileId!)}
                                disabled={loadingReceiptId === item.receiptFileId}
                              >
                                {loadingReceiptId === item.receiptFileId ? (
                                  <CircularProgress size={16} color="inherit" />
                                ) : (
                                  <VisibilityIcon fontSize="small" />
                                )}
                              </IconButton>
                            </span>
                          </Tooltip>
                        ) : (
                          <Typography variant="caption" color="text.disabled">
                            —
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={og.workOrder ? 3 : 3} />
                    <TableCell align="right">
                      <Typography variant="subtitle2" fontWeight={700}>
                        {formatCurrency(totalAmount)}
                      </Typography>
                    </TableCell>
                    <TableCell colSpan={og.workOrder ? 4 : 3} />
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>

        {/* Right column: OT details */}
        {og.workOrder && (
          <Grid item xs={12} md={4}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} mb={2}>
                  Orden de Trabajo Asociada
                </Typography>
                <Stack spacing={1}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="caption" color="text.secondary">Número</Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {og.workOrder.workOrderNumber}
                    </Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="caption" color="text.secondary">Cliente</Typography>
                    <Typography variant="body2">{og.workOrder.order.client.name}</Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="caption" color="text.secondary">Orden</Typography>
                    <Typography variant="body2">{og.workOrder.order.orderNumber}</Typography>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* ── Status change dialog ─────────────────────────────────────────────── */}
      <Dialog open={statusDialogOpen} onClose={() => setStatusDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Cambiar Estado de la OG</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Estado actual:{' '}
            <strong>{EXPENSE_ORDER_STATUS_CONFIG[og.status].label}</strong>
          </Typography>
          <TextField
            select
            fullWidth
            label="Nuevo estado"
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value as ExpenseOrderStatus)}
          >
            {availableTransitions.map((s) => (
              <MenuItem key={s} value={s}>
                {EXPENSE_ORDER_STATUS_CONFIG[s].label}
                {s === ExpenseOrderStatus.PAID && ' (requiere permiso de aprobación)'}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialogOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleStatusChange}
            disabled={!newStatus || updateStatusMutation.isPending}
          >
            {updateStatusMutation.isPending ? <CircularProgress size={20} /> : 'Confirmar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Add item dialog ──────────────────────────────────────────────────── */}
      <Dialog open={itemDialogOpen} onClose={handleCloseItemDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Agregar Ítem de Gasto</DialogTitle>
        <DialogContent onPaste={handlePaste}>
          <Stack spacing={2.5} sx={{ mt: 1 }}>

            {/* Name */}
            <TextField
              label="Nombre del gasto *"
              value={itemForm.name}
              onChange={(e) => setItemForm((f) => ({ ...f, name: e.target.value }))}
              inputProps={{ maxLength: 200 }}
              fullWidth
              autoFocus
            />

            {/* Quantity + Unit price */}
            <Stack direction="row" spacing={2}>
              <TextField
                label="Cantidad *"
                type="number"
                value={itemForm.quantity}
                onChange={(e) => setItemForm((f) => ({ ...f, quantity: e.target.value }))}
                inputProps={{ min: 0.01, step: 0.01 }}
                sx={{ flex: 1 }}
              />
              <TextField
                label="Precio unitario *"
                type="number"
                value={itemForm.unitPrice}
                onChange={(e) => setItemForm((f) => ({ ...f, unitPrice: e.target.value }))}
                inputProps={{ min: 0, step: 100 }}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
                sx={{ flex: 1 }}
              />
            </Stack>

            {/* Total preview */}
            {parseFloat(itemForm.quantity) > 0 && parseFloat(itemForm.unitPrice) > 0 && (
              <Typography variant="body2" color="text.secondary">
                Total:{' '}
                <strong>
                  {formatCurrency(
                    (parseFloat(itemForm.quantity) || 0) * (parseFloat(itemForm.unitPrice) || 0),
                  )}
                </strong>
              </Typography>
            )}

            {/* Description */}
            <TextField
              label="Descripción"
              value={itemForm.description}
              onChange={(e) => setItemForm((f) => ({ ...f, description: e.target.value }))}
              multiline
              rows={2}
              placeholder="Detalle adicional del gasto..."
              fullWidth
            />

            {/* Payment method + Supplier */}
            <Stack direction="row" spacing={2}>
              <TextField
                select
                label="Método de pago"
                value={itemForm.paymentMethod}
                onChange={(e) =>
                  setItemForm((f) => ({ ...f, paymentMethod: e.target.value as PaymentMethod }))
                }
                sx={{ flex: 1 }}
              >
                {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                label="Proveedor"
                value={itemForm.supplierId}
                onChange={(e) => setItemForm((f) => ({ ...f, supplierId: e.target.value }))}
                sx={{ flex: 1 }}
              >
                <MenuItem value="">Sin proveedor</MenuItem>
                {suppliers
                  .filter((s) => s.isActive !== false)
                  .map((s) => (
                    <MenuItem key={s.id} value={s.id}>
                      {s.name}
                    </MenuItem>
                  ))}
              </TextField>
            </Stack>

            {/* Production areas (only if OG has workOrder) */}
            {og.workOrder && (
              <TextField
                select
                label="Áreas de producción"
                value={itemForm.productionAreaIds}
                onChange={(e) => {
                  const value = e.target.value;
                  setItemForm((f) => ({
                    ...f,
                    productionAreaIds: typeof value === 'string' ? value.split(',') : value as string[],
                  }));
                }}
                SelectProps={{ multiple: true }}
                helperText="Solo disponible cuando hay OT asociada"
                fullWidth
              >
                {productionAreas
                  .filter((pa) => pa.isActive !== false)
                  .map((pa) => (
                    <MenuItem key={pa.id} value={pa.id}>
                      {pa.name}
                    </MenuItem>
                  ))}
              </TextField>
            )}

            {/* Receipt image upload */}
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Comprobante de pago (imagen)
              </Typography>
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                hidden
                ref={fileInputRef}
                onChange={(e) => handleReceiptFileChange(e.target.files?.[0] ?? null)}
              />

              {!receiptFile ? (
                <Stack spacing={1}>
                  <Button
                    variant="outlined"
                    startIcon={<AttachFileIcon />}
                    size="small"
                    onClick={() => fileInputRef.current?.click()}
                    sx={{ textTransform: 'none', alignSelf: 'flex-start' }}
                  >
                    Adjuntar imagen
                  </Button>
                  <Box
                    onPaste={handlePaste}
                    tabIndex={0}
                    sx={{
                      border: '2px dashed',
                      borderColor: 'grey.300',
                      borderRadius: 1,
                      p: 2,
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'border-color 0.2s, background-color 0.2s',
                      '&:hover, &:focus': {
                        borderColor: 'primary.main',
                        bgcolor: 'action.hover',
                      },
                    }}
                    onClick={() => {
                      // Focus the box so paste events work
                      (document.activeElement as HTMLElement)?.blur();
                    }}
                  >
                    <ImageIcon sx={{ fontSize: 28, color: 'grey.400', mb: 0.5 }} />
                    <Typography variant="caption" color="text.secondary" display="block">
                      O pega una imagen aquí (Ctrl+V / ⌘+V)
                    </Typography>
                  </Box>
                </Stack>
              ) : (
                <Stack spacing={1.5}>
                  {/* Thumbnail preview */}
                  <Box
                    sx={{
                      position: 'relative',
                      width: 'fit-content',
                      border: '1px solid',
                      borderColor: 'grey.300',
                      borderRadius: 1,
                      overflow: 'hidden',
                      bgcolor: 'grey.50',
                    }}
                  >
                    <Box
                      component="img"
                      src={URL.createObjectURL(receiptFile)}
                      alt="Vista previa"
                      sx={{
                        display: 'block',
                        maxWidth: 200,
                        maxHeight: 140,
                        objectFit: 'contain',
                      }}
                      onLoad={(e) => {
                        // Revoke URL after load to free memory
                        URL.revokeObjectURL((e.target as HTMLImageElement).src);
                      }}
                    />
                  </Box>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Chip
                      icon={<ImageIcon />}
                      label={`${receiptFile.name} (${(receiptFile.size / 1024).toFixed(1)} KB)`}
                      color="primary"
                      variant="outlined"
                      size="small"
                      onDelete={() => {
                        setReceiptFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      deleteIcon={<CloseIcon />}
                      sx={{ maxWidth: 300 }}
                    />
                    <IconButton
                      size="small"
                      onClick={() => fileInputRef.current?.click()}
                      title="Cambiar imagen"
                    >
                      <AttachFileIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </Stack>
              )}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseItemDialog} disabled={addExpenseItemMutation.isPending}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleAddItem}
            disabled={!isItemFormValid || addExpenseItemMutation.isPending}
            startIcon={addExpenseItemMutation.isPending ? <CircularProgress size={16} /> : <AddIcon />}
          >
            {addExpenseItemMutation.isPending ? 'Guardando...' : 'Agregar Ítem'}
          </Button>
        </DialogActions>
      </Dialog>
      {/* ── View receipt dialog ──────────────────────────────────────────────── */}
      <Dialog
        open={receiptDialog.open}
        onClose={() => setReceiptDialog((d) => ({ ...d, open: false }))}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" alignItems="center" spacing={1}>
              <ReceiptIcon color="success" fontSize="small" />
              <Typography variant="subtitle1" fontWeight={600}>
                Comprobante de pago
              </Typography>
              {receiptDialog.originalName && (
                <Typography variant="caption" color="text.secondary">
                  — {receiptDialog.originalName}
                </Typography>
              )}
            </Stack>
            <Stack direction="row" spacing={1}>
              <Tooltip title="Descargar">
                <IconButton
                  size="small"
                  onClick={() =>
                    handleDownloadReceipt(receiptDialog.fileId, receiptDialog.originalName)
                  }
                >
                  <DownloadIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <IconButton
                size="small"
                onClick={() => setReceiptDialog((d) => ({ ...d, open: false }))}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: 400,
              bgcolor: 'grey.100',
              p: 2,
            }}
          >
            {receiptDialog.mimeType.startsWith('image/') ? (
              <Box
                component="img"
                src={receiptDialog.url}
                alt="Comprobante de pago"
                sx={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: 1 }}
              />
            ) : receiptDialog.mimeType === 'application/pdf' ? (
              <iframe
                src={receiptDialog.url}
                title="Comprobante de pago"
                style={{ width: '100%', height: '70vh', border: 'none' }}
              />
            ) : (
              <Typography color="text.secondary">
                No se puede previsualizar este tipo de archivo.
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            startIcon={<DownloadIcon />}
            onClick={() =>
              handleDownloadReceipt(receiptDialog.fileId, receiptDialog.originalName)
            }
          >
            Descargar
          </Button>
          <Button
            variant="contained"
            onClick={() => setReceiptDialog((d) => ({ ...d, open: false }))}
          >
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ExpenseOrderDetailPage;
