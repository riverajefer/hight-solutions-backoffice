# Tablero de Control de Producción — Plan técnico de la Fase 1

**Alcance:** tablero de **solo lectura** sobre datos que ya existen. Sin migraciones, sin cambios en el flujo de
trabajo del equipo. Contexto y decisiones de negocio: [tablero-control-produccion.md](./tablero-control-produccion.md).

## 1. Qué entrega esta fase

- Pantalla nueva «Tablero de Producción» con dos vistas alternables sobre los mismos datos:
  - **Por estado:** una columna por estado de la OP (Confirmada · En producción · Lista · Pagada por entregar; Borrador opcional).
  - **Por asesor:** una columna por asesor con órdenes en el rango.
- Tarjeta compacta por OP (número, cliente, valor, fecha de entrega, áreas de producción, semáforo), expandible
  para ver los ítems, el saldo y la OT si existe. Clic en el número → detalle de la OP.
- Semáforo calculado sobre la fecha de entrega de la OP: rojo / amarillo / verde / **gris sin fecha**.
- Barra de resumen clicable (En tiempo · Al límite · Vencidas · Sin fecha) y contadores por columna.
- Ventas de mostrador (OP que nacen de un DTF) agrupadas en un renglón resumen por columna, desplegable.
- Filtros recordados entre visitas: asesores, área de producción, valor mínimo, ocultar mostrador, solo vencidas,
  mostrar borradores, búsqueda por número/cliente.
- Aviso «N órdenes antiguas sin cerrar» que lleva al listado de OP ya filtrado.
- Refresco automático cada 60 s.

**Fuera de alcance (fases 2 y 3):** mover tarjetas, etapas de producción, estado de diseño, fecha obligatoria,
fecha interna, matriz día × asesor, modo TV, tiempo real por socket, saneamiento de órdenes antiguas.

## 2. Valores provisionales (un solo archivo de configuración)

| Parámetro | Valor | Dónde |
|---|---|---|
| Ventana de órdenes | Últimos 30 días por `orderDate` (máx. 90) | backend, query param `days` |
| Estados que entran | `CONFIRMED`, `IN_PRODUCTION`, `READY`, `PAID` + `DRAFT` (oculto por defecto) | backend `BOARD_STATUSES` |
| Amarillo | La entrega es hoy o mañana (`WARNING_DAYS = 1`), días calendario | frontend `boardConfig.ts` |
| Rojo | Fecha de entrega anterior a hoy | frontend `boardConfig.ts` |
| Mostrador | OP con al menos un `DtfRecord` asociado | backend, campo `isCounterSale` |
| Tope por columna | 15 tarjetas + «ver N más» | frontend `boardConfig.ts` |
| Refresco | `refetchInterval: 60_000` | hook |

Tamaño real con estos valores (PRD, 2026-10-05): ~250 tarjetas sin borradores, ~500 con borradores; ~40 % son de
mostrador. Cabe en una sola respuesta sin paginar (~150–250 KB), por eso **todo el filtrado y el semáforo se
hacen en el cliente**: los contadores y los filtros siempre coinciden con lo que se ve.

`PAID` entra porque en el flujo actual es «pagada, pendiente de entregar» (`READY → PAID → DELIVERED`).
`DELIVERED`, `DELIVERED_ON_CREDIT`, `WARRANTY`, `RETURNED` y `ANULADO` no entran.

## 3. Backend

Módulo nuevo y aislado (el módulo `orders` ya es muy grande): `backend/src/modules/production-board/`.
Antes de crearlo, leer `backend/docs/ai-guides/01-CRUD-MODULE-TEMPLATE.md`, `CONVENTIONS.md` y `06-TESTING-GUIDE.md`.

| Archivo | Contenido |
|---|---|
| `production-board.module.ts` | Importa `DatabaseModule`; registrar en `app.module.ts`. |
| `production-board.controller.ts` | `GET /api/v1/production-board` · `@UseGuards(JwtAuthGuard, PermissionsGuard)` · `@RequirePermissions('read_production_board')` · Swagger. |
| `production-board.service.ts` | Calcula la fecha de corte, llama al repository, mapea a tarjetas. |
| `production-board.repository.ts` | Dos consultas Prisma (abajo). |
| `dto/production-board-query.dto.ts` | `days?: number` (`@IsOptional @Type(() => Number) @IsInt @Min(1) @Max(90)`, default 30). Sin booleanos ni arrays en el query string. |
| `production-board.constants.ts` | `BOARD_STATUSES`, `DEFAULT_DAYS`, `MAX_DAYS`. |
| `*.spec.ts` | Service, repository y controller (cuidado con el override de guards en el spec del controller). |

**Consulta 1 — tarjetas.** `prisma.order.findMany` con `where: { orderDate: { gte: corte }, status: { in: BOARD_STATUSES } }`
(índices `orderDate` y `status` ya existen) y `select` explícito:

```
id, orderNumber, status, orderDate, deliveryDate, total, balance,
client:    { id, name },
createdBy: { id, firstName, lastName },
items:     { id, description, quantity, annulledQuantity, sortOrder,
             productionAreas: { productionArea: { id, name } } }   (orderBy sortOrder)
workOrders:{ id, workOrderNumber, status }                          (where status != CANCELLED)
_count:    { dtfRecords }
```

**Consulta 2 — antiguas sin cerrar.** `prisma.order.count` con los mismos estados (sin `DRAFT`) y `orderDate < corte`.

**Respuesta:**

```ts
{
  generatedAt: string;          // ISO
  cutoffDate: string;           // ISO, inicio de la ventana
  staleOpenCount: number;
  cards: Array<{
    id: string; orderNumber: string; status: OrderStatus;
    orderDate: string; deliveryDate: string | null;
    total: number; balance: number;
    clientName: string;
    advisor: { id: string; name: string };
    isCounterSale: boolean;
    workOrder: { id: string; number: string; status: WorkOrderStatus } | null;
    areas: Array<{ id: string; name: string }>;            // únicas, a nivel de OP
    items: Array<{ id: string; description: string; quantity: number; areas: string[] }>;
  }>;
}
```

Notas:
- `Decimal` → `number` en el service; `quantity` neta de `annulledQuantity`; ítems con cantidad neta 0 se omiten.
- El semáforo **no** se calcula en backend: depende de «hoy» en la zona horaria del usuario, igual que el
  `getDeliveryAlert()` actual del listado.
- Verificar el tiempo de la consulta 1 contra PRD con `EXPLAIN ANALYZE` vía `backend/scripts/db-query.sh` antes de desplegar (objetivo < 500 ms).

**Permiso nuevo `read_production_board`** («Ver Tablero de Producción»), en los cuatro sitios:
1. `backend/prisma/permissions-catalog.ts` (lo leen `seed.ts` y `sync-permissions.ts`).
2. `frontend/src/utils/constants.ts` → `PERMISSIONS.READ_PRODUCTION_BOARD`.
3. `frontend/src/utils/permission-labels.ts`.
4. `frontend/src/features/roles/components/PermissionsSelector.tsx` (grupo «Órdenes»).

Después: `npm run prisma:sync:permissions` (dev y staging comparten base; PRD aparte). El cliente asigna el
permiso a los roles desde la pantalla de Roles.

## 4. Frontend

Carpeta nueva `frontend/src/features/production-board/`.

| Archivo | Contenido |
|---|---|
| `frontend/src/types/production-board.types.ts` | Tipos de la respuesta + `BoardView = 'status' \| 'advisor'`, `Semaphore = 'overdue' \| 'warning' \| 'on-time' \| 'no-date'`, `BoardFilters`. |
| `frontend/src/api/production-board.api.ts` | `productionBoardApi.get({ days })`. |
| `hooks/useProductionBoard.ts` | `useQuery` con `queryKey: ['production-board', days]`, `refetchInterval: 60_000`, `placeholderData: keepPreviousData`. |
| `boardConfig.ts` | `WARNING_DAYS`, `COLUMN_CAP`, orden y etiquetas de columnas (reusar `ORDER_STATUS_CONFIG` de `types/order.types.ts`), colores del semáforo desde el theme de MUI. |
| `utils/deliverySemaphore.ts` (+ spec) | Función pura `getSemaphore(deliveryDate, today, warningDays)`. Compara por día calendario local (mismo criterio que `getDeliveryAlert`). |
| `utils/boardGrouping.ts` (+ spec) | Funciones puras: `applyFilters`, `sortByUrgency` (vencidas → fecha más próxima → sin fecha; desempate por mayor valor), `groupByStatus`, `groupByAdvisor`, `splitCounterSales`, `summarize`. |
| `hooks/useBoardFilters.ts` | Estado de filtros + vista, persistido en `localStorage` (`production-board:filters:v1`) con el mismo patrón y `try/catch` de `OrdersListPage.tsx:109-187`. |
| `components/BoardSummaryBar.tsx` | Cuatro chips clicables (alternan el filtro de semáforo) + hora de última actualización + aviso de antiguas sin cerrar. |
| `components/BoardFiltersBar.tsx` | Selector de vista, asesores (multi), área, valor mínimo (`formatCurrencyInput`), toggles (ocultar mostrador / solo vencidas / mostrar borradores), búsqueda. Indicador visible de «filtros activos» + limpiar. |
| `components/BoardColumn.tsx` | Encabezado con total y vencidas, lista con tope y «ver N más», scroll vertical propio. |
| `components/BoardCard.tsx` | Tarjeta compacta: borde izquierdo de color + icono/etiqueta del semáforo (no solo color), número, cliente, valor, fecha, chips de área. Expandible (Collapse) con ítems, saldo y OT. |
| `components/CounterSalesGroup.tsx` | Renglón «Mostrador · N órdenes · M vencidas», desplegable a tarjetas. |
| `components/BoardSkeleton.tsx` | Carga inicial. |
| `pages/ProductionBoardPage.tsx` | Compone todo dentro de `PageHeader`; estados de carga, error y vacío. |

Cableado:
- `frontend/src/router/paths.ts` → `PRODUCTION_BOARD: '/production-board'`.
- `frontend/src/router/index.tsx` → `lazyWithRetry` + `<PermissionGuard permission={PERMISSIONS.READ_PRODUCTION_BOARD}>`, dentro de `MainLayout` (la página debe suspender ahí, no en el boundary global).
- `frontend/src/components/layout/Sidebar.tsx` → ítem «Tablero de Producción» en el grupo de Órdenes y su permiso en el arreglo del grupo.

Decisiones de UI:
- **Sin drag & drop** en esta fase: se reutiliza la maquetación del Kanban de cotizaciones
  (`features/quotes/components/kanban/QuoteKanbanColumn.tsx` y `QuoteKanbanCard.tsx`) pero no `DndContext`.
- Columnas con scroll horizontal en escritorio; en celular, una columna a la vez con selector (tabs).
- Vista «Por asesor»: columnas ordenadas por cantidad de vencidas y luego por total de órdenes; el filtro de
  asesores define cuáles se ven.
- Aviso de antiguas → `navigate(ROUTES.ORDERS, { state: { filters } })` con rango de fecha hasta el corte y los
  estados abiertos (el listado ya acepta filtros por router state, `OrdersListPage.tsx:158`).
- `OrdersListPage.getDeliveryAlert()` se deja como está; unificarlo con el util nuevo es un refactor aparte.

## 5. Orden de implementación

1. Backend: constantes, DTO, repository + spec, service + spec, controller + spec, registro en `app.module.ts`.
2. Permiso en los cuatro archivos + `prisma:sync:permissions` en desarrollo.
3. Frontend: tipos, API, hook de datos.
4. Utils puros (`deliverySemaphore`, `boardGrouping`) con sus specs.
5. Componentes: tarjeta → columna → grupo de mostrador → resumen → filtros → página.
6. Ruta, sidebar, persistencia de filtros.
7. Verificación (sección 6) y ajuste de rendimiento si hace falta.
8. Actualizar `CLAUDE.md` (módulo y endpoint nuevos).

## 6. Verificación

- **Tests:** `npm run test` en backend (specs nuevos) y `npx vitest run` en frontend (utils y render de la página con datos simulados: vacío, sin fechas, mezcla de semáforos, mostrador agrupado).
- **Manual en desarrollo** (`npm run start:dev` + preview del frontend, usuario `adminsistema`):
  - Crear 4 OP de prueba con nombre reconocible: entrega ayer, hoy, en 5 días y sin fecha → rojo, amarillo, verde, gris.
  - Comparar los totales por estado del tablero contra `./scripts/db-query.sh --env=development` con el mismo corte.
  - Probar cada filtro, la persistencia al recargar, el clic en los chips del resumen y el aviso de antiguas.
  - Usuario sin `read_production_board`: no ve el ítem del menú y la API responde 403.
  - Vista en celular (375 px) y en modo oscuro.
- **Rendimiento:** `EXPLAIN ANALYZE` de la consulta contra PRD (solo lectura) y render fluido con ~500 tarjetas.
- **Staging:** validar con datos reales del cliente antes de producción y avisarle que la mayoría de tarjetas
  saldrá en gris mientras la fecha de entrega no sea obligatoria.

## 7. Riesgos

| Riesgo | Mitigación |
|---|---|
| Casi todo sale en gris (98 % sin fecha) | Esperado; el gris y el contador «Sin fecha» son el argumento para la fecha obligatoria de la Fase 2. Avisar al cliente antes de mostrarlo. |
| Borradores abandonados ensucian el tablero | Ocultos por defecto; toggle para verlos. |
| Columna de un asesor con 100+ tarjetas | Tope de 15 + agrupación de mostrador + orden por urgencia. |
| Crecimiento del volumen (se duplicó en 3 meses) | Si la respuesta supera ~1.000 tarjetas, pasar filtros y tope al backend (el contrato ya separa `cards` de los contadores). |
| El criterio de amarillo cambie | `WARNING_DAYS` en un solo archivo; días hábiles/festivos quedan para cuando el cliente responda. |
