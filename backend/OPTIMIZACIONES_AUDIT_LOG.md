# Optimizaciones de Audit Log para Órdenes de Pedido

## Problema Original

Las transacciones de creación de órdenes estaban excediendo el timeout de 45 segundos debido a:

1. **Audit Log interceptando todas las operaciones**: La extensión registraba TODOS los campos de TODOS los modelos
2. **Queries complejos con múltiples niveles de anidación**: El `select` incluía relaciones profundas (client, createdBy, items con service, payments con receivedBy)
3. **Logging en consola durante desarrollo**: Imprimir logs grandes consumía tiempo adicional

## Soluciones Implementadas

### 1. Audit Log Selectivo por Modelo

**Ubicación**: `backend/src/database/prisma.service.ts`

Se configuró `fieldFilters` para que solo registre campos esenciales:

```typescript
fieldFilters: {
  User: {
    exclude: ['password', 'refreshToken'],
  },
  Order: {
    // Solo registrar campos esenciales de la orden
    include: [
      'id',
      'orderNumber',
      'status',
      'total',
      'paidAmount',
      'balance',
      'clientId',
      'createdById',
    ],
  },
  OrderItem: {
    // Solo campos clave de los items
    include: [
      'id',
      'orderId',
      'description',
      'quantity',
      'unitPrice',
      'total',
      'serviceId',
    ],
  },
  Payment: {
    // Solo campos importantes de pagos
    include: [
      'id',
      'orderId',
      'amount',
      'paymentMethod',
      'paymentDate',
      'receivedById',
    ],
  },
}
```

**Beneficio**: Reduce drásticamente el volumen de datos que se auditan sin perder trazabilidad de cambios importantes.

### 2. Logging Condicional en Consola

Se modificó el `logger` para excluir modelos pesados en desarrollo:

```typescript
logger: (log) => {
  // Solo loguear en desarrollo y excluir modelos pesados para mejorar performance
  if (process.env.NODE_ENV === 'development') {
    const heavyModels = ['Order', 'OrderItem', 'Payment'];
    if (!heavyModels.includes(log.model || '')) {
      console.log('AUDIT LOG:', log);
    }
  }
}
```

**Beneficio**: Reduce el tiempo de I/O en consola durante operaciones de órdenes en desarrollo.

### 3. Optimización del Método Create en Repository

**Ubicación**: `backend/src/modules/orders/orders.repository.ts`

Se cambió el método `create` para usar un patrón de dos pasos:

```typescript
async create(data: Prisma.OrderCreateInput) {
  // Crear la orden primero sin los includes complejos para mejor performance
  const order = await this.prisma.order.create({
    data,
    select: {
      id: true,
      orderNumber: true,
      status: true,
    },
  });

  // Luego obtener la orden completa con todos los datos
  return this.findById(order.id);
}
```

**Beneficio**:
- La transacción de creación es más rápida (solo IDs básicos)
- El audit log registra menos datos en la operación crítica
- La segunda query (findById) ocurre fuera de la transacción y no afecta el timeout

### 4. Timeout de Transacciones Aumentado

Se aumentó el timeout de transacciones a 45 segundos como medida preventiva:

```typescript
transactionOptions: {
  maxWait: 45000, // Tiempo máximo de espera para adquirir la transacción
  timeout: 45000, // Tiempo máximo de ejecución de la transacción
}
```

## Campos Auditados

### Order (Orden)
- ✅ id, orderNumber, status
- ✅ total, paidAmount, balance
- ✅ clientId, createdById
- ❌ orderDate, deliveryDate, notes
- ❌ subtotal, taxRate, tax
- ❌ Relaciones anidadas (client, createdBy, items, payments)

### OrderItem (Item de Orden)
- ✅ id, orderId, description
- ✅ quantity, unitPrice, total
- ✅ serviceId
- ❌ specifications, sortOrder
- ❌ Relación service anidada

### Payment (Pago)
- ✅ id, orderId, amount
- ✅ paymentMethod, paymentDate
- ✅ receivedById
- ❌ reference, notes
- ❌ Relación receivedBy anidada

## Trazabilidad Mantenida

A pesar de las optimizaciones, se mantiene completa trazabilidad de:

1. **Quién**: userId en el contexto de auditoría
2. **Qué**: Cambios en campos críticos (montos, estados, relaciones)
3. **Cuándo**: Timestamps automáticos del audit log
4. **Dónde**: IP address y user agent en metadata

## Métricas de Performance

### Antes
- ⏱️ Timeout: >45 segundos
- 🚫 Error: Transaction expired
- 📊 Datos auditados: ~100% de campos

### Después (Esperado)
- ⏱️ Tiempo de creación: <2 segundos
- ✅ Éxito: Sin timeouts
- 📊 Datos auditados: ~40% de campos (solo críticos)

## Recomendaciones Futuras

1. **Monitorear performance**: Usar APM tools para medir tiempo real de transacciones
2. **Audit log asíncrono**: Considerar mover audit log a una cola background para transacciones muy complejas
3. **Índices de base de datos**: Verificar que existan índices apropiados en:
   - `orders.order_number`
   - `orders.client_id`
   - `orders.created_by_id`
   - `order_items.order_id`
   - `payments.order_id`

4. **Caching de clientes frecuentes**: Si hay clientes que generan muchas órdenes, considerar cachear sus datos

## Testing

Ejecutar pruebas de carga:

```bash
# Test de creación de órdenes
npm run test:e2e -- orders.e2e-spec.ts

# Test manual con Postman/Thunder Client
POST http://localhost:3000/api/v1/orders
```

## Rollback

Si es necesario volver a la configuración anterior:

1. Remover `fieldFilters` para Order, OrderItem, Payment
2. Remover filtrado de `heavyModels` en logger
3. Restaurar método `create` original en repository
4. Reducir timeout a 5000ms (default)

---

**Fecha de implementación**: 2026-01-29
**Autor**: Sistema de IA Claude
**Versión**: 1.0
