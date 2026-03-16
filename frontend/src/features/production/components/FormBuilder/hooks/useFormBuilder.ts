import { useReducer } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import type { FormBuilderState, FormBuilderAction, BuilderField, Stage } from '../types/formBuilder';
import type { FieldDef, FieldType } from '../../../../../types/production.types';

// ─── Initial state builder ────────────────────────────────────────────────────

function buildInitialState(initialSchema?: { fields: FieldDef[] }): FormBuilderState {
  const fields = initialSchema?.fields ?? [];
  return {
    specFields: fields
      .filter((f) => f.stage === 'specification')
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map(toBuilderField),
    execFields: fields
      .filter((f) => f.stage === 'execution')
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map(toBuilderField),
    selectedFieldId: null,
    isDirty: false,
    isPreviewOpen: false,
  };
}

function toBuilderField(f: FieldDef): BuilderField {
  return { ...f, _localId: crypto.randomUUID() };
}

function createField(
  fieldType: FieldType,
  label: string,
  key: string,
  stage: Stage,
  _localId: string,
): BuilderField {
  return {
    _localId,
    key,
    label,
    type: fieldType,
    stage,
    required: false,
  };
}

// ─── Reducer ─────────────────────────────────────────────────────────────────

function formBuilderReducer(state: FormBuilderState, action: FormBuilderAction): FormBuilderState {
  switch (action.type) {
    case 'ADD_FIELD': {
      const newField = createField(action.fieldType, action.label, action.key, action.stage, action._localId);
      if (action.stage === 'specification') {
        return {
          ...state,
          specFields: [...state.specFields, newField],
          selectedFieldId: action._localId,
          isDirty: true,
        };
      }
      return {
        ...state,
        execFields: [...state.execFields, newField],
        selectedFieldId: action._localId,
        isDirty: true,
      };
    }

    case 'REMOVE_FIELD': {
      const inSpec = state.specFields.some((f) => f._localId === action._localId);
      return {
        ...state,
        specFields: inSpec
          ? state.specFields.filter((f) => f._localId !== action._localId)
          : state.specFields,
        execFields: !inSpec
          ? state.execFields.filter((f) => f._localId !== action._localId)
          : state.execFields,
        selectedFieldId:
          state.selectedFieldId === action._localId ? null : state.selectedFieldId,
        isDirty: true,
      };
    }

    case 'UPDATE_FIELD': {
      const updateInList = (list: BuilderField[]) =>
        list.map((f) =>
          f._localId === action._localId ? { ...f, ...action.patch } : f,
        );
      return {
        ...state,
        specFields: updateInList(state.specFields),
        execFields: updateInList(state.execFields),
        isDirty: true,
      };
    }

    case 'REORDER_FIELDS': {
      if (action.stage === 'specification') {
        return {
          ...state,
          specFields: arrayMove(state.specFields, action.fromIndex, action.toIndex),
          isDirty: true,
        };
      }
      return {
        ...state,
        execFields: arrayMove(state.execFields, action.fromIndex, action.toIndex),
        isDirty: true,
      };
    }

    case 'MOVE_FIELD_TO_STAGE': {
      const isInSpec = state.specFields.some((f) => f._localId === action._localId);
      const sourceList = isInSpec ? state.specFields : state.execFields;
      const fieldToMove = sourceList.find((f) => f._localId === action._localId);
      if (!fieldToMove) return state;

      const updatedField: BuilderField = { ...fieldToMove, stage: action.newStage };
      const newSourceList = sourceList.filter((f) => f._localId !== action._localId);

      let newTargetList: BuilderField[];
      if (action.newStage === 'specification') {
        newTargetList = [...state.specFields.filter((f) => f._localId !== action._localId)];
        if (action.atIndex !== undefined) {
          newTargetList.splice(action.atIndex, 0, updatedField);
        } else {
          newTargetList.push(updatedField);
        }
        return {
          ...state,
          specFields: newTargetList,
          execFields: isInSpec ? state.execFields : newSourceList,
          isDirty: true,
        };
      } else {
        newTargetList = [...state.execFields.filter((f) => f._localId !== action._localId)];
        if (action.atIndex !== undefined) {
          newTargetList.splice(action.atIndex, 0, updatedField);
        } else {
          newTargetList.push(updatedField);
        }
        return {
          ...state,
          specFields: isInSpec ? newSourceList : state.specFields,
          execFields: newTargetList,
          isDirty: true,
        };
      }
    }

    case 'SELECT_FIELD':
      return { ...state, selectedFieldId: action._localId };

    case 'OPEN_PREVIEW':
      return { ...state, isPreviewOpen: true };

    case 'CLOSE_PREVIEW':
      return { ...state, isPreviewOpen: false };

    case 'LOAD_SCHEMA': {
      const fields = action.fields ?? [];
      return {
        specFields: fields
          .filter((f) => f.stage === 'specification')
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          .map(toBuilderField),
        execFields: fields
          .filter((f) => f.stage === 'execution')
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          .map(toBuilderField),
        selectedFieldId: null,
        isDirty: false,
        isPreviewOpen: false,
      };
    }

    case 'MARK_CLEAN':
      return { ...state, isDirty: false };

    default:
      return state;
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useFormBuilder(initialSchema?: { fields: FieldDef[] }) {
  const [state, dispatch] = useReducer(
    formBuilderReducer,
    initialSchema,
    buildInitialState,
  );

  return { state, dispatch };
}
