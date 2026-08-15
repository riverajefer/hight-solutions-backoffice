import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
} from '@mui/material';
import { GridColDef } from '@mui/x-data-grid';
import { DatePicker } from '@mui/x-date-pickers';
import AddIcon from '@mui/icons-material/Add';
import PhoneCallbackIcon from '@mui/icons-material/PhoneCallback';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import InsightsIcon from '@mui/icons-material/Insights';
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewKanbanIcon from '@mui/icons-material/ViewKanban';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { DataTable } from '../../../components/common/DataTable/DataTable';
import { ActionsCell } from '../../../components/common/DataTable/ActionsCell';
import { PageHeader } from '../../../components/common/PageHeader';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { ExportDialog } from '../../../components/common/ExportDialog';
import { useAuthStore } from '../../../store/authStore';
import { useUsers } from '../../users/hooks/useUsers';
import { PERMISSIONS, ROUTES } from '../../../utils/constants';
import { formatDate } from '../../../utils/formatters';
import { EXPORT_LIMIT } from '../../../utils/excelExport';
import { prospectsApi } from '../../../api/prospects.api';
import {
  CONTACT_MEDIUM_LABELS,
  ContactMedium,
  FilterProspectsDto,
  PROSPECT_STATUS_LABELS,
  Prospect,
  ProspectConversionTarget,
  ProspectStatus,
  prospectHasDocument,
} from '../../../types/prospect.types';
import {
  useProspect,
  useProspects,
} from '../hooks/useProspects';
import { ProspectStatusChip } from '../components/ProspectStatusChip';
import { EditableObservationCell } from '../components/EditableObservationCell';
import { ProspectDocumentCell } from '../components/ProspectDocumentCell';
import { ProspectFormDialog } from '../components/ProspectFormDialog';
import { ProspectContactDialog } from '../components/ProspectContactDialog';
import { ProspectDetailDrawer } from '../components/ProspectDetailDrawer';
import { ConvertProspectDialog } from '../components/ConvertProspectDialog';
import { ProspectKanbanBoard } from '../components/kanban/ProspectKanbanBoard';
import { PROSPECT_EXPORT_COLUMNS } from '../utils/prospectExportColumns';
import { parseDateFilter, toDateFilterOrUndefined } from '../../../utils/dateFilters';

const VIEW_MODE_KEY = 'prospects-view-mode';

const diasDesde = (iso?: string | null): number | null => {
  if (!iso) return null;
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
};

export const ProspectsListPage: React.FC = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { user, hasPermission } = useAuthStore();

  const canCreate = hasPermission(PERMISSIONS.CREATE_PROSPECTS);
  const canUpdate = hasPermission(PERMISSIONS.UPDATE_PROSPECTS);
  const canDelete = hasPermission(PERMISSIONS.DELETE_PROSPECTS);
  const canConvert = hasPermission(PERMISSIONS.CONVERT_PROSPECTS);
  const canExport = hasPermission(PERMISSIONS.EXPORT_PROSPECTS);
  const canReadAll = hasPermission(PERMISSIONS.READ_ALL_PROSPECTS);
  const canReadMetrics = hasPermission(PERMISSIONS.READ_PROSPECT_METRICS);

  const [viewMode, setViewMode] = useState<'list' | 'board'>(
    () => (localStorage.getItem(VIEW_MODE_KEY) as 'list' | 'board') || 'list',
  );
  const [filters, setFilters] = useState<FilterProspectsDto>({ page: 1, limit: 20 });
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Prospect | null>(null);
  const [contactFor, setContactFor] = useState<Prospect | null>(null);
  const [convertFor, setConvertFor] = useState<Prospect | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Prospect | null>(null);
  const [confirmDeleteContact, setConfirmDeleteContact] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  const {
    prospectsQuery,
    createProspectMutation,
    updateProspectMutation,
    deleteProspectMutation,
    addContactMutation,
    deleteContactMutation,
    convertProspectMutation,
  } = useProspects(filters);

  const detailQuery = useProspect(detailId ?? undefined);
  // La lista de usuarios solo hace falta para el filtro de vendedora.
  const { usersQuery } = useUsers({ enabled: canReadAll });

  const prospects = prospectsQuery.data?.data ?? [];
  const meta = prospectsQuery.data?.meta;

  const setFilter = <K extends keyof FilterProspectsDto>(
    key: K,
    value: FilterProspectsDto[K],
  ) => setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));

  const handleSaveProspect = async (values: {
    name?: string;
    phone?: string;
    email?: string;
    observation?: string;
  }) => {
    if (editing) {
      await updateProspectMutation.mutateAsync({ id: editing.id, data: values });
      enqueueSnackbar('Prospecto actualizado', { variant: 'success' });
    } else {
      await createProspectMutation.mutateAsync(values);
    }
    setFormOpen(false);
    setEditing(null);
  };

  const handleConvert = async (
    clientId: string,
    target: ProspectConversionTarget,
  ) => {
    if (!convertFor) return;
    const prospectId = convertFor.id;
    await convertProspectMutation.mutateAsync({
      id: prospectId,
      data: { clientId, target },
    });
    setConvertFor(null);
    // El formulario de destino crea el documento y luego enlaza el `quoteId`
    // de vuelta al prospecto (ver QuoteFormPage).
    const base = target === 'QUOTE' ? '/quotes/new' : '/orders/new';
    navigate(`${base}?clientId=${clientId}&prospectId=${prospectId}`);
  };

  const columns = useMemo<GridColDef<Prospect>[]>(() => {
    const cols: GridColDef<Prospect>[] = [
      {
        field: 'name',
        headerName: 'Nombre',
        flex: 1.2,
        minWidth: 170,
        valueGetter: (_v, row) => row.name ?? '',
        renderCell: (params) =>
          params.row.name || (
            <Box component="span" sx={{ color: 'text.disabled' }}>
              Sin nombre
            </Box>
          ),
      },
      { field: 'phone', headerName: 'Celular', flex: 0.8, minWidth: 130 },
      { field: 'email', headerName: 'Correo', flex: 1, minWidth: 180 },
      {
        field: 'status',
        headerName: 'Estado',
        flex: 0.8,
        minWidth: 140,
        renderCell: (params) => <ProspectStatusChip status={params.row.status} />,
      },
      {
        field: 'lastContactAt',
        headerName: 'Último contacto',
        flex: 0.9,
        minWidth: 150,
        renderCell: (params) =>
          params.row.lastContactAt ? (
            formatDate(params.row.lastContactAt)
          ) : (
            <Box component="span" sx={{ color: 'text.disabled' }}>
              Nunca
            </Box>
          ),
      },
      {
        field: 'contactCount',
        headerName: 'Contactos',
        flex: 0.5,
        minWidth: 100,
        align: 'center',
        headerAlign: 'center',
      },
      {
        field: 'diasSinContacto',
        headerName: 'Días sin contacto',
        flex: 0.7,
        minWidth: 140,
        align: 'center',
        headerAlign: 'center',
        sortable: false,
        renderCell: (params) => {
          const dias = diasDesde(params.row.lastContactAt);
          if (dias === null) {
            return <Chip size="small" color="error" label="Sin contactar" />;
          }
          return (
            <Chip
              size="small"
              label={`${dias} d`}
              color={dias > 14 ? 'error' : dias > 7 ? 'warning' : 'default'}
            />
          );
        },
      },
      {
        field: 'documento',
        headerName: 'Documento',
        flex: 0.9,
        minWidth: 160,
        sortable: false,
        renderCell: (params) => <ProspectDocumentCell prospect={params.row} />,
      },
      {
        field: 'observation',
        headerName: 'Observación',
        flex: 1.4,
        minWidth: 200,
        sortable: false,
        renderCell: (params) => (
          <EditableObservationCell
            value={params.row.observation}
            disabled={!canUpdate}
            onSave={(value) =>
              updateProspectMutation.mutate({
                id: params.row.id,
                data: { observation: value },
              })
            }
          />
        ),
      },
    ];

    if (canReadAll) {
      cols.splice(4, 0, {
        field: 'advisor',
        headerName: 'Vendedora',
        flex: 0.9,
        minWidth: 150,
        sortable: false,
        valueGetter: (_v, row) =>
          [row.advisor?.firstName, row.advisor?.lastName].filter(Boolean).join(' '),
      });
    }

    cols.push({
      field: 'actions',
      headerName: 'Acciones',
      width: 150,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        // Sin stopPropagation, cada clic en un botón también dispara el
        // onRowClick de la tabla y abre el detalle encima del diálogo.
        <Box onClick={(e) => e.stopPropagation()} sx={{ display: 'flex' }}>
          <ActionsCell
            onEdit={
              canUpdate
                ? () => {
                    setEditing(params.row);
                    setFormOpen(true);
                  }
                : undefined
            }
            onDelete={canDelete ? () => setConfirmDelete(params.row) : undefined}
            extraActions={[
              ...(canUpdate
                ? [
                    {
                      icon: <PhoneCallbackIcon fontSize="small" />,
                      label: 'Registrar contacto',
                      tooltip: 'Registrar contacto',
                      onClick: () => setContactFor(params.row),
                      color: 'primary' as const,
                    },
                  ]
                : []),
              ...(canConvert && !prospectHasDocument(params.row)
                ? [
                    {
                      icon: <RequestQuoteIcon fontSize="small" />,
                      label: 'Convertir',
                      tooltip: 'Convertir a cotización u orden',
                      onClick: () => setConvertFor(params.row),
                      color: 'success' as const,
                    },
                  ]
                : []),
            ]}
          />
        </Box>
      ),
    });

    return cols;
  }, [canReadAll, canUpdate, canConvert, canDelete, updateProspectMutation]);

  return (
    <Box>
      <PageHeader
        title="Pipeline de Ventas"
        subtitle="Seguimiento de contactos comerciales"
        action={
          <Stack direction="row" spacing={1}>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              size="small"
              onChange={(_, v) => {
                if (!v) return;
                setViewMode(v);
                localStorage.setItem(VIEW_MODE_KEY, v);
              }}
            >
              <ToggleButton value="list" aria-label="Vista de lista">
                <Tooltip title="Lista">
                  <ViewListIcon fontSize="small" />
                </Tooltip>
              </ToggleButton>
              <ToggleButton value="board" aria-label="Vista de tablero">
                <Tooltip title="Tablero">
                  <ViewKanbanIcon fontSize="small" />
                </Tooltip>
              </ToggleButton>
            </ToggleButtonGroup>

            {canReadMetrics && (
              <Button
                variant="outlined"
                startIcon={<InsightsIcon />}
                onClick={() => navigate(ROUTES.PROSPECT_METRICS)}
              >
                Métricas
              </Button>
            )}
            {canExport && (
              <Button
                variant="outlined"
                startIcon={<FileDownloadIcon />}
                onClick={() => setExportOpen(true)}
              >
                Exportar
              </Button>
            )}
            {canCreate && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                Nuevo prospecto
              </Button>
            )}
          </Stack>
        }
      />

      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={2.4}>
            <TextField
              select
              label="Estado"
              fullWidth
              size="small"
              value={filters.status ?? ''}
              onChange={(e) =>
                setFilter('status', (e.target.value || undefined) as ProspectStatus)
              }
            >
              <MenuItem value="">Todos</MenuItem>
              {Object.values(ProspectStatus).map((s) => (
                <MenuItem key={s} value={s}>
                  {PROSPECT_STATUS_LABELS[s]}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6} md={2.4}>
            <TextField
              select
              label="Medio de contacto"
              fullWidth
              size="small"
              value={filters.medium ?? ''}
              onChange={(e) =>
                setFilter('medium', (e.target.value || undefined) as ContactMedium)
              }
            >
              <MenuItem value="">Todos</MenuItem>
              {Object.values(ContactMedium).map((m) => (
                <MenuItem key={m} value={m}>
                  {CONTACT_MEDIUM_LABELS[m]}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {canReadAll && (
            <Grid item xs={12} sm={6} md={2.4}>
              <TextField
                select
                label="Vendedora"
                fullWidth
                size="small"
                value={filters.advisorId ?? ''}
                onChange={(e) => setFilter('advisorId', e.target.value || undefined)}
              >
                <MenuItem value="">Todas</MenuItem>
                {(usersQuery.data ?? []).map((u: any) => (
                  <MenuItem key={u.id} value={u.id}>
                    {[u.firstName, u.lastName].filter(Boolean).join(' ') || u.email}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          )}

          <Grid item xs={12} sm={6} md={2.4}>
            <DatePicker
              label="Desde"
              value={parseDateFilter(filters.dateFrom) ?? null}
              onChange={(d) => setFilter('dateFrom', toDateFilterOrUndefined(d))}
              slotProps={{ textField: { fullWidth: true, size: 'small' } }}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={2.4}>
            <DatePicker
              label="Hasta"
              value={parseDateFilter(filters.dateTo) ?? null}
              onChange={(d) => setFilter('dateTo', toDateFilterOrUndefined(d))}
              slotProps={{ textField: { fullWidth: true, size: 'small' } }}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={2.4}>
            <TextField
              select
              label="Sin contactar hace"
              fullWidth
              size="small"
              value={filters.sinContactoDias ?? ''}
              onChange={(e) =>
                setFilter(
                  'sinContactoDias',
                  e.target.value ? Number(e.target.value) : undefined,
                )
              }
            >
              <MenuItem value="">Cualquier tiempo</MenuItem>
              <MenuItem value={3}>3 días o más</MenuItem>
              <MenuItem value={7}>7 días o más</MenuItem>
              <MenuItem value={15}>15 días o más</MenuItem>
              <MenuItem value={30}>30 días o más</MenuItem>
            </TextField>
          </Grid>
        </Grid>
      </Paper>

      {viewMode === 'board' ? (
        <ProspectKanbanBoard
          filters={filters}
          canUpdate={canUpdate}
          canConvert={canConvert}
          onViewProspect={(p) => setDetailId(p.id)}
          onAddContact={(p) => setContactFor(p)}
          onConvert={(p) => setConvertFor(p)}
        />
      ) : (
        <DataTable
          rows={prospects}
          columns={columns}
          loading={prospectsQuery.isLoading || prospectsQuery.isFetching}
          getRowId={(row) => row.id}
          onRowClick={(row) => setDetailId(row.id)}
          searchPlaceholder="Buscar por nombre, celular o correo..."
          searchValue={filters.search ?? ''}
          onSearchChange={(value) => setFilter('search', value || undefined)}
          serverSideSearch
          rowCount={meta?.total ?? 0}
          currentPage={(filters.page ?? 1) - 1}
          pageSize={filters.limit ?? 20}
          pageSizeOptions={[20, 50, 100]}
          onPaginationModelChange={(model) =>
            setFilters((prev) => ({
              ...prev,
              page: model.page + 1,
              limit: model.pageSize,
            }))
          }
          emptyMessage="Aún no hay prospectos registrados"
        />
      )}

      <ProspectFormDialog
        open={formOpen}
        prospect={editing}
        isSaving={
          createProspectMutation.isPending || updateProspectMutation.isPending
        }
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSubmit={handleSaveProspect}
      />

      <ProspectContactDialog
        open={!!contactFor}
        prospect={contactFor}
        isSaving={addContactMutation.isPending}
        onClose={() => setContactFor(null)}
        onSubmit={async (values) => {
          if (!contactFor) return;
          await addContactMutation.mutateAsync({ id: contactFor.id, data: values });
          setContactFor(null);
        }}
      />

      <ConvertProspectDialog
        open={!!convertFor}
        prospect={convertFor}
        isSaving={convertProspectMutation.isPending}
        currentUserId={user?.id}
        isAdmin={hasPermission(PERMISSIONS.READ_ALL_PROSPECTS)}
        onClose={() => setConvertFor(null)}
        onConfirm={handleConvert}
      />

      <ProspectDetailDrawer
        open={!!detailId}
        prospect={detailQuery.data}
        isLoading={detailQuery.isLoading}
        canUpdate={canUpdate}
        canConvert={canConvert}
        onClose={() => setDetailId(null)}
        onAddContact={() => detailQuery.data && setContactFor(detailQuery.data)}
        onDeleteContact={(contactId) => setConfirmDeleteContact(contactId)}
        onConvert={() => detailQuery.data && setConvertFor(detailQuery.data)}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        title="Eliminar prospecto"
        message={`¿Eliminar "${
          confirmDelete?.name || confirmDelete?.phone || confirmDelete?.email
        }" y todo su historial de contactos? Esta acción no se puede deshacer.`}
        severity="error"
        confirmText="Eliminar"
        isLoading={deleteProspectMutation.isPending}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={async () => {
          if (!confirmDelete) return;
          await deleteProspectMutation.mutateAsync(confirmDelete.id);
          setConfirmDelete(null);
        }}
      />

      <ConfirmDialog
        open={!!confirmDeleteContact}
        title="Eliminar contacto"
        message="¿Eliminar este contacto del historial? Los indicadores se recalcularán."
        severity="error"
        confirmText="Eliminar"
        isLoading={deleteContactMutation.isPending}
        onCancel={() => setConfirmDeleteContact(null)}
        onConfirm={async () => {
          if (!confirmDeleteContact || !detailId) return;
          await deleteContactMutation.mutateAsync({
            id: detailId,
            contactId: confirmDeleteContact,
          });
          setConfirmDeleteContact(null);
        }}
      />

      {canExport && (
        <ExportDialog<Prospect>
          open={exportOpen}
          onClose={() => setExportOpen(false)}
          title="Exportar Prospectos a Excel"
          entityLabel="prospectos"
          fileNamePrefix="prospectos"
          sheetName="Prospectos"
          columns={PROSPECT_EXPORT_COLUMNS}
          storageKey="prospects-export-columns"
          dateRangeLabel="Rango de fechas (fecha de registro)"
          helperText="Se respetan los filtros de estado, medio y vendedora de la pantalla."
          fetchRows={async ({ fromDate, toDate }) => {
            const res = await prospectsApi.findAll({
              ...filters,
              dateFrom: fromDate,
              dateTo: toDate,
              page: 1,
              limit: EXPORT_LIMIT,
            });
            return res.data;
          }}
        />
      )}
    </Box>
  );
};
