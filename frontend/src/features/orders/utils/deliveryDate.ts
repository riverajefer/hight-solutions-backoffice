/**
 * Toda OP nace con fecha y hora de entrega (requerimiento del cliente:
 * producción planea con ella). Esta regla la comparten el formulario de OP y
 * los caminos que crean una OP desde otro documento (cotización, DTF).
 *
 * Devuelve el mensaje de error, o `null` si la fecha sirve.
 */
export const getDeliveryDateError = (date: Date | null): string | null => {
  if (!date || Number.isNaN(date.getTime())) {
    return 'La fecha y hora de entrega es obligatoria';
  }
  if (date.getTime() <= Date.now()) {
    return 'La fecha y hora de entrega debe ser posterior a este momento';
  }
  return null;
};
