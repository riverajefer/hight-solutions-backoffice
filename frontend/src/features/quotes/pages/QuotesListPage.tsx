import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Stack,
  MenuItem,
  TextField,
  Autocomplete,
  Button,
  IconButton,
  Tooltip,
} from '@mui/material';
import { GridRenderCellParams } from '@mui/x-data-grid';
import { useResponsiveColumns, type ResponsiveGridColDef } from '../../../hooks';
import {
  PostAdd as PostAddIcon,
  ShoppingCartCheckout as ConvertIcon,
  SwapHoriz as SwapHorizIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers';
import { PageHeader } from '../../../components/common/PageHeader';
import { DataTable } from '../../../components/common/DataTable';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { ActionsCell } from '../../../components/common/DataTable/ActionsCell';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';
import { useQuotes } from '../hooks';
import { useClients } from '../../clients/hooks/useClients';
import { useUsers } from '../../users/hooks/useUsers';
import { QuoteStatusChip, ChangeQuoteStatusDialog } from '../components';
import type { Quote, QuoteStatus, FilterQuotesDto } from '../../../types/quote.types';
import { QuoteStatus as QStatus } from '../../../types/quote.types';
import type { Client } from '../../../types/client.types';

const formatCurrency = (value: string | number): string => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numValue);
};

const formatDate = (date: string): string => {
  return new Intl.DateTimeFormat('es-CO').format(new Date(date));
};

const formatDateTime = (date: string): string => {
  return new Intl.DateTimeFormat('es-CO', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
};

const QUOTE_STATUS_OPTIONS: { value: QuoteStatus; label: string }[] = [
  { value: QStatus.DRAFT,       label: 'Borrador' },
  { value: QStatus.SENT,        label: 'Enviada' },
  { value: QStatus.ACCEPTED,    label: 'Aceptada' },
  { value: QStatus.NO_RESPONSE, label: 'Sin respuesta' },
  { value: QStatus.CONVERTED,   label: 'Convertida' },
];

export const QuotesListPage: React.FC = () => {
  const navigate = useNavigate();

  const [filters, setFilters] = useState<FilterQuotesDto>({
    page: 1,
    limit: 20,
  });

  const [confirmDelete, setConfirmDelete] = useState<Quote | null>(null);
  const [confirmConvert, setConfirmConvert] = useState<Quote | null>(null);
  const [changeStatusQuote, setChangeStatusQuote] = useState<Quote | null>(null);

  const { quotesQuery, deleteQuoteMutation, convertToOrderMutation, updateQuoteMutation } = useQuotes(filters);
  const { clientsQuery } = useClients({ includeInactive: false });
  const { usersQuery } = useUsers();

  const quotes = quotesQuery.data?.data || [];
  const clients = clientsQuery.data || [];
  const users = usersQuery.data || [];
  
  const selectedClient = filters.clientId
    ? clients.find((c) => c.id === filters.clientId)
    : null;

  const selectedUser = filters.createdById
    ? users.find((u: any) => u.id === filters.createdById)
    : null;

  const handleFilterChange = (key: keyof FilterQuotesDto, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: 1,
    }));
  };

  const handleClearFilters = () => {
    setFilters({
      page: 1,
      limit: 20,
    });
  };

  const handleDeleteQuote = async () => {
    if (!confirmDelete) return;
    await deleteQuoteMutation.mutateAsync(confirmDelete.id);
    setConfirmDelete(null);
  };

  const handleConvertQuote = async () => {
    if (!confirmConvert) return;
    try {
      const order = await convertToOrderMutation.mutateAsync(confirmConvert.id);
      setConfirmConvert(null);
      if (order && (order as any).id) {
        navigate(`/orders/${(order as any).id}`);
      }
    } catch (error) {}
  };

  const handleChangeStatus = async (newStatus: QuoteStatus) => {
    if (!changeStatusQuote) return;
    await updateQuoteMutation.mutateAsync({
      id: changeStatusQuote.id,
      data: { status: newStatus },
    });
  };

  const rawColumns: ResponsiveGridColDef<Quote>[] = useMemo(() => [
    {
      field: 'quoteNumber',
      headerName: 'Nº Cotización',
      width: 150,
      renderCell: (params: GridRenderCellParams<Quote>) => (
        <Box sx={{ fontWeight: 600, color: 'primary.main' }}>{params.value}</Box>
      ),
    },
    {
      field: 'client',
      headerName: 'Cliente',
      width: 250,
      valueGetter: (_: any, row: Quote) => row.client?.name || '',
    },
    {
      field: 'createdBy',
      headerName: 'Asesor',
      width: 180,
      responsive: 'md',
      valueGetter: (_: any, row: Quote) => {
        if (!row.createdBy) return '';
        const firstName = row.createdBy.firstName || '';
        const lastName = row.createdBy.lastName || '';
        if (firstName || lastName) return `${firstName} ${lastName}`.trim();
        return row.createdBy.email || '';
      },
    },
    {
      field: 'quoteDate',
      headerName: 'Fecha',
      width: 160,
      responsive: 'sm',
      renderCell: (params: GridRenderCellParams<Quote>) => formatDateTime(params.value),
    },
    {
      field: 'validUntil',
      headerName: 'Vence',
      width: 130,
      responsive: 'md',
      renderCell: (params: GridRenderCellParams<Quote>) => params.value ? formatDate(params.value) : '-',
    },
    {
      field: 'total',
      headerName: 'Total',
      width: 150,
      align: 'right',
      headerAlign: 'right',
      responsive: 'sm',
      renderCell: (params: GridRenderCellParams<Quote>) => formatCurrency(params.value),
    },
    {
      field: 'status',
      headerName: 'Estado',
      width: 150,
      renderCell: (params: GridRenderCellParams<Quote>) => <QuoteStatusChip status={params.value as QuoteStatus} />,
    },
    {
      field: 'actions',
      headerName: 'Acciones',
      width: 200,
      sortable: false,
      renderCell: (params: GridRenderCellParams<Quote>) => {
        const isConverted = params.row.status === QStatus.CONVERTED;
        const canEdit = !isConverted;
        const canDelete = params.row.status === QStatus.DRAFT;
        const canConvert = params.row.status === QStatus.ACCEPTED;
        const canChangeStatus = !isConverted;

        return (
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
            <ActionsCell
              onView={() => navigate(`/quotes/${params.row.id}`)}
              onEdit={canEdit ? () => navigate(`/quotes/${params.row.id}/edit`) : undefined}
              onDelete={canDelete ? () => setConfirmDelete(params.row) : undefined}
            />
            {canChangeStatus && (
              <Tooltip title="Cambiar Estado">
                <IconButton
                  size="small"
                  color="primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    setChangeStatusQuote(params.row);
                  }}
                >
                  <SwapHorizIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {canConvert && (
              <Tooltip title="Convertir a Orden">
                <IconButton
                  size="small"
                  color="success"
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmConvert(params.row);
                  }}
                >
                  <ConvertIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        );
      },
    },
  ], [navigate, setConfirmDelete, setConfirmConvert, setChangeStatusQuote]);

  const columns = useResponsiveColumns(rawColumns);

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      {updateQuoteMutation.isPending && (
        <LoadingSpinner fullScreen message="Actualizando estado..." />
      )}
      <PageHeader
        title="Cotizaciones"
        breadcrumbs={[{ label: 'Cotizaciones' }]}
        action={
          <Button
            variant="outlined"
            startIcon={<PostAddIcon />}
            onClick={() => navigate('/quotes/new')}
          >
            Nueva Cotización
          </Button>
        }
      />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3, mt: 2 }} flexWrap="wrap" useFlexGap>
        <TextField
          select
          label="Estado"
          value={filters.status || ''}
          onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
          sx={{ minWidth: { xs: '100%', sm: 200 } }}
          size="small"
        >
          <MenuItem value="">Todos los estados</MenuItem>
          {QUOTE_STATUS_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
          ))}
        </TextField>

        <Autocomplete
          sx={{ minWidth: { xs: '100%', sm: 300 } }}
          size="small"
          options={clients}
          value={selectedClient}
          onChange={(_, val) => handleFilterChange('clientId', val?.id)}
          getOptionLabel={(opt) => opt.name}
          renderInput={(params) => <TextField {...params} label="Cliente" placeholder="Todos los clientes" />}
          loading={clientsQuery.isLoading}
        />

        <Autocomplete
          sx={{ minWidth: { xs: '100%', sm: 300 } }}
          size="small"
          options={users}
          value={selectedUser}
          onChange={(_, val) => handleFilterChange('createdById', val?.id)}
          getOptionLabel={(opt: any) => `${opt.firstName} ${opt.lastName}`}
          renderInput={(params) => <TextField {...params} label="Asesor" placeholder="Todos los asesores" />}
          loading={usersQuery.isLoading}
        />

        <DatePicker
          label="Desde"
          value={filters.dateFrom ? new Date(filters.dateFrom) : null}
          onChange={(d) => handleFilterChange('dateFrom', d?.toISOString())}
          slotProps={{ textField: { size: 'small' } }}
        />

        <DatePicker
          label="Hasta"
          value={filters.dateTo ? new Date(filters.dateTo) : null}
          onChange={(d) => handleFilterChange('dateTo', d?.toISOString())}
          slotProps={{ textField: { size: 'small' } }}
        />

        {(filters.status || filters.clientId || filters.dateFrom || filters.dateTo) && (
          <Button variant="outlined" onClick={handleClearFilters} size="small">Limpiar</Button>
        )}
      </Stack>

      <DataTable
        rows={quotes}
        columns={columns}
        loading={quotesQuery.isLoading}
        getRowId={(row) => row.id}
        onRowClick={(row) => navigate(`/quotes/${row.id}`)}
        emptyMessage="No se encontraron cotizaciones"
      />

      <ConfirmDialog
        open={!!confirmDelete}
        title="Eliminar Cotización"
        message={`¿Confirma eliminar la cotización ${confirmDelete?.quoteNumber}?`}
        onConfirm={handleDeleteQuote}
        onCancel={() => setConfirmDelete(null)}
        isLoading={deleteQuoteMutation.isPending}
      />

      <ConfirmDialog
        open={!!confirmConvert}
        title="Convertir a Orden"
        message={`¿Confirma convertir la cotización ${confirmConvert?.quoteNumber} en una orden de pedido?`}
        onConfirm={handleConvertQuote}
        onCancel={() => setConfirmConvert(null)}
        isLoading={convertToOrderMutation.isPending}
      />

      <ChangeQuoteStatusDialog
        open={!!changeStatusQuote}
        quote={changeStatusQuote}
        onClose={() => setChangeStatusQuote(null)}
        onConfirm={handleChangeStatus}
        isLoading={updateQuoteMutation.isPending}
      />
    </Box>
  );
};

export default QuotesListPage;
