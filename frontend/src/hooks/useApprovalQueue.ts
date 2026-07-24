import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

/**
 * Cola de aprobación ("revisar y siguiente").
 *
 * Permite entrar al detalle de una entidad desde una bandeja de solicitudes
 * pendientes y avanzar a la siguiente sin devolverse a la lista.
 *
 * El orden se congela en un *snapshot* al entrar a la cola (guardado en
 * sessionStorage). Se hace así a propósito: si la cola se recalculara contra el
 * servidor en cada avance, al aprobar el elemento N la lista de pendientes se
 * encoge y el elemento N+1 pasa a ocupar la posición N, lo que provoca que se
 * salte uno. Con el snapshot el contador ("3 de 11") es estable, sobrevive a un
 * refresh y no genera llamadas adicionales al API.
 */

export interface ApprovalQueueItem {
  /** Id de la entidad de destino (la OG, la orden, etc.), no el de la solicitud. */
  id: string;
  /** Texto corto para mostrar en la barra de navegación (Nº OG, Nº Orden...). */
  label: string;
  /**
   * Id de la solicitud asociada. Se usa cuando la aprobación no vive en la
   * página de detalle (ediciones de orden, propiedad de cliente): permite
   * aprobar/rechazar desde la propia barra de la cola.
   */
  requestId?: string;
}

interface ApprovalQueueSnapshot {
  items: ApprovalQueueItem[];
  /** Ruta de la bandeja, para el botón "Salir de la cola". */
  returnPath: string;
  /** Ids ya revisados en esta sesión de revisión. */
  processed: string[];
  createdAt: number;
}

const STORAGE_PREFIX = 'approval-queue:';
const QUEUE_PARAM = 'queue';
const INDEX_PARAM = 'qi';

/** El snapshot se descarta pasado este tiempo para no revivir colas viejas. */
const MAX_AGE_MS = 6 * 60 * 60 * 1000; // 6 horas

const storageKey = (queueKey: string) => `${STORAGE_PREFIX}${queueKey}`;

const readSnapshot = (queueKey: string): ApprovalQueueSnapshot | null => {
  try {
    const raw = sessionStorage.getItem(storageKey(queueKey));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as ApprovalQueueSnapshot;
    if (!Array.isArray(parsed.items) || parsed.items.length === 0) return null;
    if (Date.now() - parsed.createdAt > MAX_AGE_MS) {
      sessionStorage.removeItem(storageKey(queueKey));
      return null;
    }

    return { ...parsed, processed: parsed.processed ?? [] };
  } catch {
    return null;
  }
};

const writeSnapshot = (queueKey: string, snapshot: ApprovalQueueSnapshot) => {
  try {
    sessionStorage.setItem(storageKey(queueKey), JSON.stringify(snapshot));
  } catch {
    // sessionStorage lleno o bloqueado: la cola simplemente no persiste
  }
};

/**
 * Arranca (o reemplaza) una cola de revisión y devuelve la URL del primer
 * elemento a abrir. Se llama desde la bandeja de solicitudes pendientes.
 */
export const startApprovalQueue = (params: {
  queueKey: string;
  items: ApprovalQueueItem[];
  returnPath: string;
  /** Id sobre el que se hizo clic; la cola arranca en él. */
  startId: string;
  buildPath: (id: string) => string;
}): string => {
  const { queueKey, items, returnPath, startId, buildPath } = params;

  const startIndex = Math.max(
    0,
    items.findIndex((item) => item.id === startId),
  );

  writeSnapshot(queueKey, {
    items,
    returnPath,
    processed: [],
    createdAt: Date.now(),
  });

  return `${buildPath(startId)}?${QUEUE_PARAM}=${encodeURIComponent(queueKey)}&${INDEX_PARAM}=${startIndex}`;
};

export interface UseApprovalQueueResult {
  /** true solo si hay una cola válida y el id actual pertenece a ella. */
  isActive: boolean;
  /** Clave de la cola activa (`og-auth`, `order-edit`...), null si no hay. */
  queueKey: string | null;
  /** Elemento del snapshot en el que estamos parados. */
  currentItem: ApprovalQueueItem | null;
  /** true si el elemento actual ya fue revisado en esta sesión. */
  isCurrentProcessed: boolean;
  /** Posición 1-based dentro del snapshot. */
  position: number;
  total: number;
  /** Elementos del snapshot que aún no se han revisado. */
  remaining: number;
  hasNext: boolean;
  hasPrev: boolean;
  nextItem: ApprovalQueueItem | null;
  prevItem: ApprovalQueueItem | null;
  /** true cuando ya no queda ningún elemento sin revisar. */
  isFinished: boolean;
  goNext: () => void;
  goPrev: () => void;
  /** Marca el elemento actual como revisado y salta al siguiente sin revisar. */
  markProcessedAndNext: () => void;
  /** Vuelve a la bandeja y borra el snapshot. */
  exit: () => void;
}

/**
 * Hook para la página de detalle. Solo se activa si la URL trae `?queue=...`
 * y el snapshot correspondiente contiene el id actual.
 */
export const useApprovalQueue = (params: {
  currentId?: string;
  buildPath: (id: string) => string;
  /** Si es false la cola se desactiva (ej: el usuario no puede aprobar). */
  enabled?: boolean;
}): UseApprovalQueueResult => {
  const { currentId, buildPath, enabled = true } = params;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const queueKey = searchParams.get(QUEUE_PARAM);

  // Se relee tras cada acción para reflejar los ids ya procesados.
  const [version, setVersion] = useState(0);
  const snapshot = useMemo(
    () => (enabled && queueKey ? readSnapshot(queueKey) : null),
    // `version` fuerza la relectura tras marcar un elemento como procesado
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enabled, queueKey, version],
  );

  const items = useMemo(() => snapshot?.items ?? [], [snapshot]);
  const currentIndex = currentId ? items.findIndex((item) => item.id === currentId) : -1;
  const isActive = !!snapshot && currentIndex >= 0;

  const processed = useMemo(() => new Set(snapshot?.processed ?? []), [snapshot]);
  const remaining = items.filter((item) => !processed.has(item.id)).length;

  const nextItem = isActive && currentIndex < items.length - 1 ? items[currentIndex + 1] : null;
  const prevItem = isActive && currentIndex > 0 ? items[currentIndex - 1] : null;
  const currentItem = isActive ? items[currentIndex] : null;

  const goTo = useCallback(
    (index: number) => {
      const target = items[index];
      if (!target || !queueKey) return;
      navigate(
        `${buildPath(target.id)}?${QUEUE_PARAM}=${encodeURIComponent(queueKey)}&${INDEX_PARAM}=${index}`,
      );
    },
    [items, queueKey, navigate, buildPath],
  );

  const goNext = useCallback(() => {
    if (nextItem) goTo(currentIndex + 1);
  }, [nextItem, goTo, currentIndex]);

  const goPrev = useCallback(() => {
    if (prevItem) goTo(currentIndex - 1);
  }, [prevItem, goTo, currentIndex]);

  const markProcessedAndNext = useCallback(() => {
    if (!snapshot || !queueKey || currentIndex < 0 || !currentId) return;

    const updatedProcessed = snapshot.processed.includes(currentId)
      ? snapshot.processed
      : [...snapshot.processed, currentId];

    writeSnapshot(queueKey, { ...snapshot, processed: updatedProcessed });
    setVersion((v) => v + 1);

    const done = new Set(updatedProcessed);

    // Siguiente sin revisar hacia adelante; si no hay, se busca hacia atrás
    // (útil cuando se entró a la cola por la mitad).
    let targetIndex = snapshot.items.findIndex(
      (item, index) => index > currentIndex && !done.has(item.id),
    );
    if (targetIndex === -1) {
      targetIndex = snapshot.items.findIndex(
        (item, index) => index < currentIndex && !done.has(item.id),
      );
    }

    if (targetIndex >= 0) goTo(targetIndex);
  }, [snapshot, queueKey, currentIndex, currentId, goTo]);

  const exit = useCallback(() => {
    const returnPath = snapshot?.returnPath;
    if (queueKey) {
      try {
        sessionStorage.removeItem(storageKey(queueKey));
      } catch {
        // sin efecto si sessionStorage no está disponible
      }
    }
    if (returnPath) {
      navigate(returnPath);
    } else {
      navigate(-1);
    }
  }, [snapshot, queueKey, navigate]);

  // Atajos de teclado: ← / → para moverse por la cola.
  useEffect(() => {
    if (!isActive) return;

    const handler = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) {
        return;
      }
      // No robar las flechas mientras haya un diálogo abierto
      if (document.querySelector('.MuiDialog-root')) return;

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        goNext();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goPrev();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isActive, goNext, goPrev]);

  return {
    isActive,
    queueKey: isActive ? queueKey : null,
    currentItem,
    isCurrentProcessed: !!currentId && processed.has(currentId),
    position: currentIndex + 1,
    total: items.length,
    remaining,
    hasNext: !!nextItem,
    hasPrev: !!prevItem,
    nextItem,
    prevItem,
    isFinished: isActive && remaining === 0,
    goNext,
    goPrev,
    markProcessedAndNext,
    exit,
  };
};
