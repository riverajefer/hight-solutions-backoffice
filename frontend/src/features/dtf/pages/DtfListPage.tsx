import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Stack,
  Button,
  MenuItem,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import { Add as AddIcon, Close as CloseIcon, Collections as CollectionsIcon } from '@mui/icons-material';
import { GridRenderCellParams } from '@mui/x-data-grid';
import { useResponsiveColumns, type ResponsiveGridColDef } from '../../../hooks';
import { PageHeader } from '../../../components/common/PageHeader';
import { DataTable } from '../../../components/common/DataTable';
import { ActionsCell } from '../../../components/common/DataTable/ActionsCell';
import { useDtfList, useDtfMutations } from '../hooks/useDtf';
import { DtfStatusChip } from '../components/DtfStatusChip';
import { useAuthStore } from '../../../store/authStore';
import { PERMISSIONS } from '../../../utils/constants';
import { PATHS } from '../../../router/paths';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import { dtfApi } from '../../../api/dtf.api';
import axiosInstance from '../../../api/axios';
import type { DtfRecord, DtfStatus, DtfListFilters, DtfFiles } from '../../../types/dtf.types';

const STATUS_OPTIONS: { value: DtfStatus | ''; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'BORRADOR', label: 'Borrador' },
  { value: 'ENVIADA', label: 'Enviada' },
  { value: 'EN_IMPRESION', label: 'En Impresión' },
  { value: 'COMPLETADA', label: 'Completada' },
  { value: 'CONVERTIDA_EN_OP', label: 'Convertida en OP' },
];

interface FilesDialogState {
  open: boolean;
  consecutive: string;
  files: DtfFiles | null;
  loading: boolean;
}

export const DtfListPage = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuthStore();
  const [filters, setFilters] = useState<DtfListFilters>({ limit: 50 });
  const { changeStatus, convertToOrder } = useDtfMutations();
  const [filesDialog, setFilesDialog] = useState<FilesDialogState>({
    open: false,
    consecutive: '',
    files: null,
    loading: false,
  });
  const [viewImage, setViewImage] = useState<{ open: boolean; url: string; title: string }>({
    open: false,
    url: '',
    title: '',
  });

  const dtfQuery = useDtfList(filters);
  const records: DtfRecord[] = dtfQuery.data?.data ?? [];

  const fetchSignedUrl = async (fileId: string): Promise<string> => {
    const { data } = await axiosInstance.get(`/storage/${fileId}/url`);
    return data.url as string;
  };

  const handleOpenFiles = async (record: DtfRecord) => {
    setFilesDialog({ open: true, consecutive: record.consecutive, files: null, loading: true });
    try {
      const files = await dtfApi.getFiles(record.id);
      const [imagesWithUrls, comprobantesWithUrls] = await Promise.all([
        Promise.all(
          (files.images ?? []).map(async (img) => ({
            ...img,
            url: await fetchSignedUrl(img.id),
          })),
        ),
        Promise.all(
          (files.comprobantes ?? []).map(async (comp) => ({
            ...comp,
            url: await fetchSignedUrl(comp.id),
          })),
        ),
      ]);
      const resolvedFiles: DtfFiles = {
        images: imagesWithUrls,
        comprobantes: comprobantesWithUrls,
      };
      setFilesDialog((prev) => ({ ...prev, files: resolvedFiles, loading: false }));
    } catch {
      setFilesDialog((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleCloseFiles = () =>
    setFilesDialog({ open: false, consecutive: '', files: null, loading: false });

  const rawColumns: ResponsiveGridColDef<DtfRecord>[] = useMemo(() => [
    {
      field: 'consecutive',
      headerName: 'Consecutivo',
      width: 175,
      flex: 0,
    },
    {
      field: 'product',
      headerName: 'Producto',
      flex: 1,
      minWidth: 130,
      valueGetter: (_, row) => row.product?.name ?? '-',
    },
    {
      field: 'client',
      headerName: 'Cliente',
      flex: 1,
      minWidth: 160,
      valueGetter: (_, row) => row.client?.name ?? '-',
    },
    {
      field: 'quantity',
      headerName: 'Cantidad',
      width: 100,
      align: 'right',
      headerAlign: 'right',
      valueFormatter: (value) => Number(value).toLocaleString('es-CO'),
    },
    {
      field: 'value',
      headerName: 'Valor',
      width: 130,
      align: 'right',
      headerAlign: 'right',
      valueFormatter: (value) => formatCurrency(Number(value)),
    },
    {
      field: 'status',
      headerName: 'Estado',
      width: 165,
      renderCell: (params: GridRenderCellParams<DtfRecord, DtfStatus>) =>
        params.value ? <DtfStatusChip status={params.value} /> : null,
    },
    {
      field: 'createdAt',
      headerName: 'Fecha',
      width: 120,
      valueFormatter: (value: string) => formatDate(value),
    },
    {
      field: 'files',
      headerName: 'Archivos',
      width: 80,
      sortable: false,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<DtfRecord>) => (
        <Tooltip title="Ver imágenes y comprobantes">
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenFiles(params.row);
            }}
          >
            <CollectionsIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
    },
    {
      field: 'actions',
      headerName: 'Acciones',
      width: 150,
      sortable: false,
      renderCell: (params: GridRenderCellParams<DtfRecord>) => {
        const record = params.row;
        return (
          <ActionsCell
            onView={() => navigate(PATHS.DTF_DETAIL.replace(':id', record.id))}
            onEdit={
              hasPermission(PERMISSIONS.UPDATE_DTF) && record.status === 'BORRADOR'
                ? () => navigate(PATHS.DTF_EDIT.replace(':id', record.id))
                : undefined
            }
          />
        );
      },
    },
  ], [navigate, hasPermission, changeStatus, convertToOrder]);

  const columns = useResponsiveColumns(rawColumns);

  const allFiles = filesDialog.files
    ? [...(filesDialog.files.images ?? []), ...(filesDialog.files.comprobantes ?? [])]
    : [];

  return (
    <Box p={3}>
      <PageHeader
        title="DTF"
        subtitle="Gestión de solicitudes DTF"
        breadcrumbs={[{ label: 'DTF' }]}
        action={
          hasPermission(PERMISSIONS.CREATE_DTF) ? (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate(PATHS.DTF_CREATE)}
            >
              Crear DTF
            </Button>
          ) : undefined
        }
      />

      <Stack direction="row" spacing={2} mb={2} flexWrap="wrap">
        <TextField
          select
          label="Estado"
          size="small"
          value={filters.status ?? ''}
          onChange={(e) =>
            setFilters((f) => ({ ...f, status: (e.target.value as DtfStatus) || undefined }))
          }
          sx={{ minWidth: 180 }}
        >
          {STATUS_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <DataTable
        columns={columns}
        rows={records}
        loading={dtfQuery.isLoading}
        pageSize={filters.limit ?? 50}
      />

      {/* Files Dialog */}
      <Dialog open={filesDialog.open} onClose={handleCloseFiles} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Archivos — {filesDialog.consecutive}
          <IconButton onClick={handleCloseFiles} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {filesDialog.loading && (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          )}

          {!filesDialog.loading && allFiles.length === 0 && (
            <Typography color="text.secondary" textAlign="center" py={4}>
              Este registro no tiene archivos adjuntos.
            </Typography>
          )}

          {!filesDialog.loading && allFiles.length > 0 && (
            <Box>
              {(filesDialog.files?.images?.length ?? 0) > 0 && (
                <Box mb={3}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Imágenes de referencia
                  </Typography>
                  <Stack direction="row" flexWrap="wrap" gap={1.5}>
                    {filesDialog.files!.images.map((img) => (
                      <Box
                        key={img.id}
                        component="img"
                        src={img.url}
                        alt={img.originalName}
                        onClick={() =>
                          setViewImage({ open: true, url: img.url, title: img.originalName })
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

              {(filesDialog.files?.comprobantes?.length ?? 0) > 0 && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Comprobantes de pago
                  </Typography>
                  <Stack direction="row" flexWrap="wrap" gap={1.5}>
                    {filesDialog.files!.comprobantes.map((comp) => (
                      <Box
                        key={comp.id}
                        component="img"
                        src={comp.url}
                        alt={comp.originalName}
                        onClick={() =>
                          setViewImage({ open: true, url: comp.url, title: comp.originalName })
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
            </Box>
          )}
        </DialogContent>
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
          <IconButton onClick={() => setViewImage({ open: false, url: '', title: '' })} size="small">
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

export default DtfListPage;
