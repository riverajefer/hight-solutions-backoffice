import type { FormBuilderState, BuilderField } from '../types/formBuilder';
import type { FieldDef, UpdateFieldSchemaPayload } from '../../../../../types/production.types';

/**
 * Convierte el estado interno del builder al payload que espera el backend.
 * Elimina _localId, asigna order secuencial (spec primero, luego exec).
 */
export function serializeToPayload(state: FormBuilderState): UpdateFieldSchemaPayload {
  const specFields = state.specFields.map((f, i) => toFieldDef(f, i));
  const execFields = state.execFields.map((f, i) => toFieldDef(f, specFields.length + i));

  return {
    fieldSchema: {
      fields: [...specFields, ...execFields],
    },
  };
}

function toFieldDef(field: BuilderField, order: number): FieldDef {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _localId, ...rest } = field;
  return { ...rest, order };
}
