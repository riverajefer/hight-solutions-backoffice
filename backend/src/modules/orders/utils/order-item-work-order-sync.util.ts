/**
 * Cambio de un ítem de OP ya existente que hay que llevar a su ítem de OT.
 * Solo trae lo que de verdad cambió en esta edición: lo que producción haya
 * ajustado en la OT y la OP no tocó se respeta.
 */
export interface EditedOrderItemChange {
  orderItemId: string;
  /** Presente solo si la descripción cambió. */
  description?: string;
  addedAreaIds: string[];
  removedAreaIds: string[];
}

interface CurrentOrderItem {
  id: string;
  description: string;
  productionAreas?: { productionAreaId: string }[];
}

interface IncomingOrderItem {
  description: string;
  /** `undefined` = el cliente no mandó áreas: no se tocan. */
  productionAreaIds?: string[];
}

/**
 * Compara el ítem de OP como está en la base con lo que llega en la edición y
 * devuelve lo que la OT tiene que recibir, o `null` si no cambió nada que la
 * OT copie (descripción y áreas; cantidad y precio la OT los lee de la OP).
 */
export function diffOrderItemForWorkOrder(
  current: CurrentOrderItem,
  incoming: IncomingOrderItem,
): EditedOrderItemChange | null {
  const descriptionChanged = incoming.description !== current.description;

  const currentAreas = new Set(
    (current.productionAreas ?? []).map((pa) => pa.productionAreaId),
  );
  const incomingAreas =
    incoming.productionAreaIds !== undefined
      ? new Set(incoming.productionAreaIds)
      : currentAreas;

  const addedAreaIds = [...incomingAreas].filter((a) => !currentAreas.has(a));
  const removedAreaIds = [...currentAreas].filter((a) => !incomingAreas.has(a));

  if (!descriptionChanged && addedAreaIds.length === 0 && removedAreaIds.length === 0) {
    return null;
  }

  return {
    orderItemId: current.id,
    ...(descriptionChanged && { description: incoming.description }),
    addedAreaIds,
    removedAreaIds,
  };
}
