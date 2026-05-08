# Prompt: Fix botón "Ver detalle" en notificaciones WhatsApp

## Contexto del sistema

Las notificaciones de WhatsApp usan el template `solicitud_aprobacion_v1` enviado desde
`WhatsappService.sendApprovalNotification()` en
`backend/src/modules/whatsapp/whatsapp.service.ts`.

El botón "Ver detalle" (índice 0, tipo CTA/URL) tiene como base una URL del frontend y como
sufijo dinámico el `requestId` de la solicitud, generando URLs del tipo:

```
https://{FRONTEND_URL}/approvals/{requestId}
```

El `requestId` es el ID polimórfico almacenado en `WhatsappActionContext.requestId`
(tabla `whatsapp_action_contexts`) y apunta a entidades distintas según el `requestType`
(`ApprovalRequestType`):

| `requestType`           | Tabla origen                              | Campo relacionado     |
|-------------------------|-------------------------------------------|-----------------------|
| `ORDER_EDIT`            | `order_edit_requests`                     | `orderId`             |
| `STATUS_CHANGE`         | `order_status_change_requests`            | `orderId`             |
| `ADVANCE_PAYMENT`       | `advance_payment_approvals`               | `orderId`             |
| `DISCOUNT_APPROVAL`     | `discount_approvals`                      | `orderId`             |
| `CLIENT_OWNERSHIP_AUTH` | `client_ownership_auth_requests`          | `orderId`             |
| `EXPENSE_ORDER_AUTH`    | `expense_order_auth_requests`             | `expenseOrderId`      |
| `AP_AUTH`               | `accounts_payable_auth_requests`          | `accountsPayableId`   |
| `AP_PAYMENT_AUTH`       | `accounts_payable_payment_auth_requests`  | `accountsPayableId`   |
| `REFUND_REQUEST`        | `refund_requests`                         | (identificar)         |
| `CASH_MOVEMENT_VOID`    | `cash_movement_void_requests`             | (identificar)         |

---

## Problema

La ruta `/approvals/:id` **no existe** en el frontend
(`frontend/src/router/paths.ts` ni `frontend/src/router/index.tsx`).
Cuando el admin hace clic en "Ver detalle", React Router no reconoce la ruta y redirige
al dashboard en lugar de mostrar el detalle de la entidad correspondiente.

---

## Solución a implementar

### 1. Backend — Extender `ApprovalRequestHandler` con `getEntityId`

**Archivo:** `backend/src/modules/whatsapp/approval-request-registry.ts`

Agregar el método opcional a la interfaz:

```typescript
export interface ApprovalRequestHandler {
  findPendingRequest(requestId: string): Promise<ApprovalRequestInfo | null>;
  approveViaWhatsApp(requestId: string, reviewerId: string): Promise<void>;
  rejectViaWhatsApp(requestId: string, reviewerId: string): Promise<void>;
  findReviewerByPhone?(phone: string): Promise<{ id: string } | null>;

  /**
   * Retorna el ID de la entidad raíz asociada a la solicitud.
   * Ej: orderId, expenseOrderId, accountsPayableId.
   */
  getEntityId(requestId: string): Promise<string | null>;
}
```

Cada servicio de aprobación (advance-payment, expense-order-auth, accounts-payable-auth,
etc.) debe implementar `getEntityId` retornando el ID de la entidad raíz correspondiente.

---

### 2. Backend — Nuevo endpoint de resolución

**Módulo:** `backend/src/modules/whatsapp/`
**Endpoint:** `GET /api/v1/whatsapp/resolve/:requestId`

Lógica del endpoint:

1. Buscar en `WhatsappActionContext` por `requestId` → obtener `requestType`
2. Usar `ApprovalRequestRegistry.getHandler(requestType)`
3. Llamar `handler.getEntityId(requestId)` para obtener el ID de la entidad raíz
4. Retornar:

```json
{
  "requestType": "ADVANCE_PAYMENT",
  "entityId": "<orderId>"
}
```

El endpoint puede ser público (sin autenticación) ya que solo expone una redirección,
o protegido con JWT si el flujo actual requiere login antes de ver el detalle.

---

### 3. Frontend — Página de redirección `ApprovalRedirectPage`

**Crear:** `frontend/src/features/approvals/pages/ApprovalRedirectPage.tsx`

Lógica:

1. Leer `:id` desde `useParams`
2. Llamar `GET /api/v1/whatsapp/resolve/:id`
3. Según `requestType`, redirigir con `navigate` a la ruta correcta:

| `requestType`                                                                 | Redirección                         |
|-------------------------------------------------------------------------------|-------------------------------------|
| `ORDER_EDIT`, `STATUS_CHANGE`, `ADVANCE_PAYMENT`, `DISCOUNT_APPROVAL`, `CLIENT_OWNERSHIP_AUTH` | `/orders/{entityId}`   |
| `EXPENSE_ORDER_AUTH`                                                          | `/expense-orders/{entityId}`        |
| `AP_AUTH`, `AP_PAYMENT_AUTH`                                                  | `/accounts-payable/{entityId}`      |
| `REFUND_REQUEST`                                                              | identificar según entidad           |
| `CASH_MOVEMENT_VOID`                                                          | identificar según entidad           |

4. Mostrar `<LoadingSpinner />` mientras resuelve
5. Mostrar mensaje de error si el endpoint falla o `requestType` no tiene mapeo

---

### 4. Frontend — Registrar la ruta

**Archivo:** `frontend/src/router/paths.ts`

```typescript
APPROVAL_REDIRECT: '/approvals/:id',
```

**Archivo:** `frontend/src/router/index.tsx`

Agregar la ruta (pública o con guard según el flujo actual):

```tsx
<Route path="/approvals/:id" element={<ApprovalRedirectPage />} />
```

---

## Archivos clave

| Archivo | Relevancia |
|---|---|
| `backend/src/modules/whatsapp/whatsapp.service.ts` | Genera la URL del botón CTA con `requestId` como sufijo |
| `backend/src/modules/whatsapp/approval-request-registry.ts` | Interfaz `ApprovalRequestHandler` a extender |
| `backend/src/modules/advance-payment-approvals/advance-payment-approvals.service.ts` | Ejemplo de handler (`orderId`) |
| `backend/src/modules/expense-order-auth-requests/expense-order-auth-requests.service.ts` | Ejemplo de handler (`expenseOrderId`) |
| `backend/src/modules/accounts-payable-auth-requests/accounts-payable-auth-requests.service.ts` | Ejemplo de handler (`accountsPayableId`) |
| `frontend/src/router/paths.ts` | Registro de rutas frontend |
| `frontend/src/router/index.tsx` | Declaración de rutas React Router |
