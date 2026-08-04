import React from 'react';
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import DragHandleIcon from '@mui/icons-material/DragHandle';
import LockIcon from '@mui/icons-material/Lock';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { GridColDef, GridValidRowModel } from '@mui/x-data-grid';

interface SortableColumnItemProps {
  field: string;
  label: string;
  visible: boolean;
  onToggle: () => void;
}

const SortableColumnItem: React.FC<SortableColumnItemProps> = ({
  field,
  label,
  visible,
  onToggle,
}) => {
  const theme = useTheme();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: field });

  return (
    <ListItem
      ref={setNodeRef}
      disableGutters
      sx={{
        px: 1,
        py: 0.25,
        mb: 0.5,
        borderRadius: 1.5,
        border: '1px solid',
        borderColor: isDragging ? 'primary.main' : 'divider',
        backgroundColor: isDragging
          ? alpha(theme.palette.primary.main, 0.08)
          : 'background.paper',
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 1 : 0,
      }}
    >
      <Tooltip title="Arrastrar para reordenar">
        <IconButton
          size="small"
          disableRipple
          sx={{ cursor: 'grab', touchAction: 'none', '&:active': { cursor: 'grabbing' } }}
          {...attributes}
          {...listeners}
        >
          <DragHandleIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Checkbox
        size="small"
        checked={visible}
        onChange={onToggle}
        inputProps={{ 'aria-label': `Mostrar columna ${label}` }}
      />

      <Typography
        variant="body2"
        sx={{ flex: 1, color: visible ? 'text.primary' : 'text.disabled' }}
      >
        {label}
      </Typography>
    </ListItem>
  );
};

interface ColumnSettingsDialogProps<R extends GridValidRowModel> {
  open: boolean;
  onClose: () => void;
  /** Columnas base, sin ordenar ni filtrar. */
  columns: GridColDef<R>[];
  /** Campos movibles, en el orden actual. */
  orderedFields: string[];
  hiddenFields: string[];
  lockedFields: string[];
  onOrderChange: (order: string[]) => void;
  onToggleVisibility: (field: string) => void;
  onReset: () => void;
  isCustomized: boolean;
}

export function ColumnSettingsDialog<R extends GridValidRowModel>({
  open,
  onClose,
  columns,
  orderedFields,
  hiddenFields,
  lockedFields,
  onOrderChange,
  onToggleVisibility,
  onReset,
  isCustomized,
}: ColumnSettingsDialogProps<R>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const labelOf = (field: string) => {
    const column = columns.find((c) => c.field === field);
    return column?.headerName || field;
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const from = orderedFields.indexOf(String(active.id));
    const to = orderedFields.indexOf(String(over.id));
    if (from === -1 || to === -1) return;

    onOrderChange(arrayMove(orderedFields, from, to));
  };

  const lockedColumns = columns.filter((c) => lockedFields.includes(c.field));
  const visibleCount = orderedFields.filter((f) => !hiddenFields.includes(f)).length;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        Configurar columnas
        <Typography variant="body2" color="text.secondary">
          Arrastra para cambiar el orden y desmarca las que no quieras ver.
        </Typography>
      </DialogTitle>

      <DialogContent dividers sx={{ pt: 2 }}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={orderedFields} strategy={verticalListSortingStrategy}>
            <List dense disablePadding>
              {orderedFields.map((field) => (
                <SortableColumnItem
                  key={field}
                  field={field}
                  label={labelOf(field)}
                  visible={!hiddenFields.includes(field)}
                  onToggle={() => onToggleVisibility(field)}
                />
              ))}
            </List>
          </SortableContext>
        </DndContext>

        {lockedColumns.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Columnas fijas
            </Typography>
            <List dense disablePadding sx={{ mt: 0.5 }}>
              {lockedColumns.map((column) => (
                <ListItem
                  key={column.field}
                  disableGutters
                  sx={{ px: 1, py: 0.5, gap: 1, color: 'text.disabled' }}
                >
                  <LockIcon sx={{ fontSize: 16 }} />
                  <Typography variant="body2">
                    {column.headerName || column.field}
                  </Typography>
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        {visibleCount === 0 && (
          <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 2 }}>
            No queda ninguna columna visible.
          </Typography>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 2, py: 1.5 }}>
        <Button
          size="small"
          startIcon={<RestartAltIcon />}
          onClick={onReset}
          disabled={!isCustomized}
        >
          Restablecer
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button variant="contained" onClick={onClose}>
          Listo
        </Button>
      </DialogActions>
    </Dialog>
  );
}
