import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
  DragHandle as DragHandleIcon,
  Edit as EditIcon,
  Lock as LockIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { KeyboardSensor } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useSnackbar } from 'notistack';
import { quoteKanbanColumnsApi } from '../../../../api/quoteKanbanColumns.api';
import { useQueryClient } from '@tanstack/react-query';
import { KANBAN_COLUMNS_QUERY_KEY } from '../../hooks/useQuoteKanbanColumns';
import type { QuoteKanbanColumn, CreateQuoteKanbanColumnDto } from '../../../../types/quoteKanban.types';
import { QuoteStatus } from '../../../../types/quote.types';

/** Estados protegidos — no se pueden editar ni eliminar */
const PROTECTED_STATUSES: QuoteStatus[] = [QuoteStatus.DRAFT, QuoteStatus.CONVERTED];

const MAX_COLUMNS = 8;

const STATUS_LABELS: Record<QuoteStatus, string> = {
  [QuoteStatus.DRAFT]: 'Borrador',
  [QuoteStatus.SENT]: 'Enviada',
  [QuoteStatus.ACCEPTED]: 'Aceptada',
  [QuoteStatus.NO_RESPONSE]: 'Sin Respuesta',
  [QuoteStatus.CONVERTED]: 'Convertida',
};

// ─── Sortable row ────────────────────────────────────────────────────────────

interface SortableColumnRowProps {
  column: QuoteKanbanColumn;
  onEdit: (column: QuoteKanbanColumn) => void;
  onDelete: (column: QuoteKanbanColumn) => void;
}

const SortableColumnRow: React.FC<SortableColumnRowProps> = ({ column, onEdit, onDelete }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: column.id,
  });

  const isProtected = PROTECTED_STATUSES.includes(column.mappedStatus);

  return (
    <ListItem
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      sx={{
        bgcolor: 'background.paper',
        borderRadius: 1,
        mb: 0.5,
        border: '1px solid',
        borderColor: 'divider',
        py: 0.75,
        px: 1,
        gap: 1,
      }}
      disablePadding
    >
      {/* Drag handle */}
      <IconButton
        size="small"
        sx={{ cursor: 'grab', color: 'text.disabled', flexShrink: 0 }}
        {...listeners}
        {...attributes}
      >
        <DragHandleIcon fontSize="small" />
      </IconButton>

      {/* Color dot */}
      <Box
        sx={{
          width: 14,
          height: 14,
          borderRadius: '50%',
          bgcolor: column.color,
          flexShrink: 0,
        }}
      />

      {/* Name */}
      <Typography variant="body2" sx={{ flex: 1, fontWeight: 500 }}>
        {column.name}
      </Typography>

      {/* Status badge */}
      <Chip
        label={STATUS_LABELS[column.mappedStatus]}
        size="small"
        sx={{ fontSize: 10, height: 20, flexShrink: 0 }}
        variant="outlined"
      />

      {/* Actions */}
      {isProtected ? (
        <Tooltip title="Columna del sistema (no editable)">
          <LockIcon sx={{ fontSize: 16, color: 'text.disabled', flexShrink: 0, mr: 0.5 }} />
        </Tooltip>
      ) : (
        <>
          <Tooltip title="Editar">
            <IconButton size="small" onClick={() => onEdit(column)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Eliminar">
            <IconButton size="small" color="error" onClick={() => onDelete(column)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </>
      )}
    </ListItem>
  );
};

// ─── Edit / Create form ──────────────────────────────────────────────────────

interface ColumnFormProps {
  initial?: Partial<QuoteKanbanColumn>;
  availableStatuses: QuoteStatus[];
  onSave: (data: { name: string; color: string; mappedStatus?: QuoteStatus }) => Promise<void>;
  onCancel: () => void;
  isCreate?: boolean;
}

const ColumnForm: React.FC<ColumnFormProps> = ({
  initial,
  availableStatuses,
  onSave,
  onCancel,
  isCreate = false,
}) => {
  const [name, setName] = useState(initial?.name ?? '');
  const [color, setColor] = useState(initial?.color ?? '#1976d2');
  const [mappedStatus, setMappedStatus] = useState<QuoteStatus>(
    initial?.mappedStatus ?? availableStatuses[0],
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({ name: name.trim(), color, mappedStatus: isCreate ? mappedStatus : undefined });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ p: 2, border: '1px solid', borderColor: 'primary.main', borderRadius: 2, mt: 1 }}>
      <Typography variant="subtitle2" gutterBottom>
        {isCreate ? 'Nueva columna' : 'Editar columna'}
      </Typography>

      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <TextField
          label="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          size="small"
          sx={{ flex: 1, minWidth: 160 }}
          autoFocus
        />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" color="text.secondary">Color:</Typography>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            style={{ width: 36, height: 36, border: 'none', cursor: 'pointer', borderRadius: 4 }}
          />
        </Box>

        {isCreate && availableStatuses.length > 0 && (
          <TextField
            select
            label="Estado"
            value={mappedStatus}
            onChange={(e) => setMappedStatus(e.target.value as QuoteStatus)}
            size="small"
            sx={{ minWidth: 160 }}
            SelectProps={{ native: true }}
          >
            {availableStatuses.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </TextField>
        )}
      </Box>

      <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
        <Button
          size="small"
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={!name.trim() || saving}
        >
          Guardar
        </Button>
        <Button size="small" variant="outlined" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
      </Box>
    </Box>
  );
};

// ─── Main dialog ─────────────────────────────────────────────────────────────

interface QuoteKanbanManageColumnsDialogProps {
  open: boolean;
  onClose: () => void;
  columns: QuoteKanbanColumn[];
}

export const QuoteKanbanManageColumnsDialog: React.FC<QuoteKanbanManageColumnsDialogProps> = ({
  open,
  onClose,
  columns,
}) => {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  const [localColumns, setLocalColumns] = useState<QuoteKanbanColumn[]>([]);
  const [editingColumn, setEditingColumn] = useState<QuoteKanbanColumn | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [orderDirty, setOrderDirty] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);

  useEffect(() => {
    if (open) {
      setLocalColumns([...columns]);
      setOrderDirty(false);
      setEditingColumn(null);
      setShowCreateForm(false);
    }
  }, [open, columns]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setLocalColumns((cols) => {
      const oldIndex = cols.findIndex((c) => c.id === active.id);
      const newIndex = cols.findIndex((c) => c.id === over.id);
      return arrayMove(cols, oldIndex, newIndex);
    });
    setOrderDirty(true);
  };

  const handleSaveOrder = async () => {
    setSavingOrder(true);
    try {
      await quoteKanbanColumnsApi.reorder({
        columns: localColumns.map((c, i) => ({ id: c.id, displayOrder: i })),
      });
      queryClient.invalidateQueries({ queryKey: KANBAN_COLUMNS_QUERY_KEY });
      setOrderDirty(false);
      enqueueSnackbar('Orden guardado', { variant: 'success' });
    } catch {
      enqueueSnackbar('Error al guardar el orden', { variant: 'error' });
    } finally {
      setSavingOrder(false);
    }
  };

  const handleEdit = async (data: { name: string; color: string }) => {
    if (!editingColumn) return;
    await quoteKanbanColumnsApi.update(editingColumn.id, { name: data.name, color: data.color });
    queryClient.invalidateQueries({ queryKey: KANBAN_COLUMNS_QUERY_KEY });
    setLocalColumns((cols) =>
      cols.map((c) =>
        c.id === editingColumn.id ? { ...c, name: data.name, color: data.color } : c,
      ),
    );
    setEditingColumn(null);
    enqueueSnackbar('Columna actualizada', { variant: 'success' });
  };

  const handleDelete = async (column: QuoteKanbanColumn) => {
    try {
      await quoteKanbanColumnsApi.remove(column.id);
      queryClient.invalidateQueries({ queryKey: KANBAN_COLUMNS_QUERY_KEY });
      setLocalColumns((cols) => cols.filter((c) => c.id !== column.id));
      enqueueSnackbar('Columna eliminada', { variant: 'success' });
    } catch (error: any) {
      enqueueSnackbar(
        error?.response?.data?.message || 'Error al eliminar la columna',
        { variant: 'error' },
      );
    }
  };

  const handleCreate = async (data: { name: string; color: string; mappedStatus?: QuoteStatus }) => {
    if (!data.mappedStatus) return;
    const dto: CreateQuoteKanbanColumnDto = {
      name: data.name,
      color: data.color,
      mappedStatus: data.mappedStatus,
      displayOrder: localColumns.length,
    };
    try {
      const created = await quoteKanbanColumnsApi.create(dto);
      queryClient.invalidateQueries({ queryKey: KANBAN_COLUMNS_QUERY_KEY });
      setLocalColumns((cols) => [...cols, created]);
      setShowCreateForm(false);
      enqueueSnackbar('Columna creada', { variant: 'success' });
    } catch (error: any) {
      enqueueSnackbar(
        error?.response?.data?.message || 'Error al crear la columna',
        { variant: 'error' },
      );
    }
  };

  // All statuses available for new columns (no restriction — multiple columns can share a status)
  const allStatuses = Object.values(QuoteStatus);
  const canAddMore = localColumns.length < MAX_COLUMNS;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        Administrar columnas del tablero
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ px: 2, py: 1.5 }}>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
          Arrastra las filas para reordenar. Las columnas con{' '}
          <LockIcon sx={{ fontSize: 12, verticalAlign: 'middle' }} /> son del sistema y no se pueden modificar.
        </Typography>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={localColumns.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            <List disablePadding>
              {localColumns.map((col) =>
                editingColumn?.id === col.id ? (
                  <Box key={col.id} sx={{ mb: 0.5 }}>
                    <ColumnForm
                      initial={col}
                      availableStatuses={[]}
                      onSave={handleEdit}
                      onCancel={() => setEditingColumn(null)}
                    />
                  </Box>
                ) : (
                  <SortableColumnRow
                    key={col.id}
                    column={col}
                    onEdit={setEditingColumn}
                    onDelete={handleDelete}
                  />
                ),
              )}
            </List>
          </SortableContext>
        </DndContext>

        {/* Create form */}
        {showCreateForm ? (
          <ColumnForm
            availableStatuses={allStatuses}
            onSave={handleCreate}
            onCancel={() => setShowCreateForm(false)}
            isCreate
          />
        ) : (
          canAddMore ? (
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={() => setShowCreateForm(true)}
              sx={{ mt: 1 }}
              variant="outlined"
            >
              Nueva columna
            </Button>
          ) : (
            <Typography variant="caption" color="text.disabled" sx={{ mt: 1, display: 'block' }}>
              Límite máximo de {MAX_COLUMNS} columnas alcanzado.
            </Typography>
          )
        )}
      </DialogContent>

      <DialogActions sx={{ px: 2 }}>
        {orderDirty && (
          <Button
            variant="contained"
            size="small"
            onClick={handleSaveOrder}
            disabled={savingOrder}
            startIcon={<SaveIcon />}
          >
            Guardar orden
          </Button>
        )}
        <Button onClick={onClose} size="small">
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
};
