import type { FieldDef, FieldType } from '../../../../../types/production.types';

export type Stage = 'specification' | 'execution';

/**
 * Un campo en el builder tiene un _localId estable para dnd-kit.
 * Este ID nunca se persiste — schemaSerializer lo elimina antes del PATCH.
 */
export interface BuilderField extends FieldDef {
  _localId: string;
}

export interface FormBuilderState {
  specFields: BuilderField[];
  execFields: BuilderField[];
  selectedFieldId: string | null;
  isDirty: boolean;
  isPreviewOpen: boolean;
}

export type FormBuilderAction =
  | {
      type: 'ADD_FIELD';
      stage: Stage;
      fieldType: FieldType;
      label: string;
      key: string;
      _localId: string;
    }
  | { type: 'REMOVE_FIELD'; _localId: string }
  | { type: 'UPDATE_FIELD'; _localId: string; patch: Partial<BuilderField> }
  | { type: 'REORDER_FIELDS'; stage: Stage; fromIndex: number; toIndex: number }
  | { type: 'MOVE_FIELD_TO_STAGE'; _localId: string; newStage: Stage; atIndex?: number }
  | { type: 'SELECT_FIELD'; _localId: string | null }
  | { type: 'OPEN_PREVIEW' }
  | { type: 'CLOSE_PREVIEW' }
  | { type: 'LOAD_SCHEMA'; fields: FieldDef[] }
  | { type: 'MARK_CLEAN' };
