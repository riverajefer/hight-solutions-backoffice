import React, { useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Box, Paper, Typography, Chip } from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import type { StepDefinition, UpdateFieldSchemaPayload } from '../../../../types/production.types';
import type { UseMutationResult } from '@tanstack/react-query';
import type { Stage } from './types/formBuilder';
import { useFormBuilder } from './hooks/useFormBuilder';
import { generateKey } from './utils/generateKey';
import { FieldLibrary } from './FieldLibrary';
import { FormCanvas } from './FormCanvas';
import { FieldConfigPanel } from './FieldConfigPanel';
import { FormBuilderToolbar } from './FormBuilderToolbar';
import { PreviewModal } from './PreviewModal';

interface FormBuilderProps {
  stepDefinition: StepDefinition;
  mutation: UseMutationResult<any, any, UpdateFieldSchemaPayload, any>;
}

interface ActiveDragData {
  type: 'library-field' | 'canvas-field';
  label?: string;
  fieldType?: string;
  stage?: Stage;
  _localId?: string;
}

export const FormBuilder: React.FC<FormBuilderProps> = ({ stepDefinition, mutation }) => {
  const { state, dispatch } = useFormBuilder(stepDefinition.fieldSchema);
  const [activeDragData, setActiveDragData] = useState<ActiveDragData | null>(null);

  // Track last stage seen during drag-over to avoid redundant dispatches
  const lastOverStageRef = useRef<Stage | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // ─── Drag start ──────────────────────────────────────────────────────────────

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as ActiveDragData | undefined;
    if (data) {
      setActiveDragData(data);
      lastOverStageRef.current = data.type === 'canvas-field' ? (data.stage ?? null) : null;
    }
  };

  // ─── Drag over (cross-stage detection) ───────────────────────────────────────

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current as ActiveDragData | undefined;
    if (!activeData || activeData.type !== 'canvas-field' || !activeData._localId) return;

    // Determine the stage the item is hovering over
    const overData = over.data.current as { type?: string; stage?: Stage } | undefined;
    let overStage: Stage | null = null;

    if (overData?.type === 'stage-dropzone') {
      overStage = overData.stage ?? null;
    } else if (overData?.type === 'canvas-field') {
      overStage = overData.stage ?? null;
    }

    if (!overStage) return;

    // Only dispatch if the stage actually changed
    if (overStage !== lastOverStageRef.current && overStage !== activeData.stage) {
      lastOverStageRef.current = overStage;
      dispatch({
        type: 'MOVE_FIELD_TO_STAGE',
        _localId: activeData._localId,
        newStage: overStage,
      });
    }
  };

  // ─── Drag end ────────────────────────────────────────────────────────────────

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragData(null);
    lastOverStageRef.current = null;

    if (!over) return;

    const activeData = active.data.current as ActiveDragData | undefined;
    const overData = over.data.current as { type?: string; stage?: Stage; _localId?: string } | undefined;

    // ── Case 1: Library item dropped onto canvas ──────────────────────────────
    if (activeData?.type === 'library-field') {
      let targetStage: Stage = 'specification';

      if (overData?.type === 'stage-dropzone') {
        targetStage = overData.stage ?? 'specification';
      } else if (overData?.type === 'canvas-field') {
        targetStage = overData.stage ?? 'specification';
      }

      // Gather all existing keys
      const allKeys = [
        ...state.specFields.map((f) => f.key),
        ...state.execFields.map((f) => f.key),
      ];
      const defaultLabel = (activeData as any).defaultLabel ?? 'Nuevo campo';
      const key = generateKey(defaultLabel, allKeys);
      const _localId = crypto.randomUUID();

      dispatch({
        type: 'ADD_FIELD',
        stage: targetStage,
        fieldType: (activeData as any).fieldType,
        label: defaultLabel,
        key,
        _localId,
      });
      return;
    }

    // ── Case 2 & 3: Canvas field reordering ───────────────────────────────────
    if (activeData?.type === 'canvas-field' && activeData._localId) {
      // After handleDragOver, the item is already in the correct stage list.
      // Now we need to handle the final sort order within that stage.
      let targetStage: Stage | null = null;

      if (overData?.type === 'stage-dropzone') {
        targetStage = overData.stage ?? null;
      } else if (overData?.type === 'canvas-field') {
        targetStage = overData.stage ?? null;
      }

      if (!targetStage) return;

      const stageFields = targetStage === 'specification' ? state.specFields : state.execFields;
      const fromIndex = stageFields.findIndex((f) => f._localId === active.id);
      const toIndex = stageFields.findIndex((f) => f._localId === over.id);

      if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
        dispatch({ type: 'REORDER_FIELDS', stage: targetStage, fromIndex, toIndex });
      }
    }
  };

  const handleSave = (payload: UpdateFieldSchemaPayload) => {
    mutation.mutate(payload);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 200px)', minHeight: 500 }}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <FormBuilderToolbar
          stepDefName={stepDefinition.name}
          stepDefType={stepDefinition.type}
          state={state}
          dispatch={dispatch}
          onSave={handleSave}
          isSaving={mutation.isPending}
        />

        <Paper
          variant="outlined"
          sx={{
            flex: 1,
            display: 'flex',
            overflow: 'hidden',
            borderRadius: 0,
            borderTop: 'none',
          }}
        >
          <FieldLibrary />
          <FormCanvas state={state} dispatch={dispatch} />
          <FieldConfigPanel state={state} dispatch={dispatch} />
        </Paper>

        {/* Drag overlay — ghost card shown while dragging */}
        <DragOverlay>
          {activeDragData && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 1.5,
                py: 1,
                borderRadius: 1,
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'primary.main',
                boxShadow: 4,
                width: 220,
                opacity: 0.9,
              }}
            >
              <DragIndicatorIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
              <Typography variant="body2" fontWeight={500} noWrap sx={{ flex: 1 }}>
                {activeDragData.type === 'library-field'
                  ? (activeDragData as any).defaultLabel
                  : activeDragData.label ?? 'Campo'}
              </Typography>
              {activeDragData.type === 'library-field' && (
                <Chip
                  label={(activeDragData as any).fieldType}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.6rem', height: 18 }}
                />
              )}
            </Box>
          )}
        </DragOverlay>
      </DndContext>

      {/* Preview modal — outside DndContext so z-index stacking is correct */}
      <PreviewModal
        open={state.isPreviewOpen}
        onClose={() => dispatch({ type: 'CLOSE_PREVIEW' })}
        state={state}
      />
    </Box>
  );
};
