-- =============================================================================
-- Invariantes del sistema — afirmaciones que SIEMPRE deben ser verdad
-- =============================================================================
-- Cada bloque devuelve el número de filas que violan una regla. Cero es lo
-- correcto; cualquier otra cosa es un dato inconsistente que hay que mirar.
--
-- Por qué existe esto: los 2582 tests unitarios del backend mockean Prisma, así
-- que ninguno toca la base. Todo lo que vive ahí —consecutivos, restricciones,
-- zonas horarias, decimales, y la relación entre tablas que dos módulos
-- distintos escriben— es invisible para ellos. Cada invariante de abajo está
-- modelada sobre un bug real que este sistema ya tuvo.
--
-- Es de SOLO LECTURA: se corre con `db-invariants.sh`, que abre la sesión con
-- `default_transaction_read_only=on`.
--
-- Al agregar una invariante: que el nombre diga qué se rompió, no qué se midió.
-- "Pagos sin movimiento de caja" es útil; "chequeo 7" no.
-- =============================================================================

WITH

-- ── Caja y pagos de Órdenes de Pedido ───────────────────────────────────────

-- Un abono que mueve dinero tiene que dejar rastro en caja: o un movimiento, o
-- la marca de que quedó en cola para la próxima sesión. Sin ninguno de los dos
-- el arqueo nunca lo va a ver. Llegó a haber un 40% de pagos así.
pagos_huerfanos AS (
  SELECT count(*) AS n,
         count(*) FILTER (WHERE p.created_at >= now() - interval '30 days') AS n30
  FROM payments p
  WHERE NOT p.is_voided
    AND p.payment_method NOT IN ('CREDIT_BALANCE', 'CREDIT')
    AND p.cash_movement_id IS NULL
    AND NOT COALESCE(p.pending_cash_entry, false)
),

-- El saldo pagado de la orden es la suma de sus pagos vivos menos lo devuelto.
-- Si no cuadra, alguna pantalla está mostrando un número inventado.
op_saldo_descuadrado AS (
  SELECT count(*) AS n,
         count(*) FILTER (WHERE created_at >= now() - interval '30 days') AS n30
  FROM (
    SELECT o.id, o.created_at
    FROM orders o
    LEFT JOIN payments p ON p.order_id = o.id AND NOT p.is_voided
    GROUP BY o.id, o.created_at, o.paid_amount, o.refunded_amount
    HAVING o.paid_amount
         <> COALESCE(sum(p.amount), 0) - COALESCE(o.refunded_amount, 0)
  ) x
),

-- Un pago anulado cuyo movimiento de caja sigue vivo deja la caja contando
-- dinero que la orden ya no reconoce. Es el modelo de anulación roto.
pagos_anulados_con_caja_viva AS (
  SELECT count(*) AS n,
         count(*) FILTER (WHERE p.voided_at >= now() - interval '30 days') AS n30
  FROM payments p JOIN cash_movements cm ON cm.id = p.cash_movement_id
  WHERE p.is_voided AND NOT cm.is_voided
),

-- ── Cuentas por Pagar ───────────────────────────────────────────────────────

cp_saldo_descuadrado AS (
  SELECT count(*) AS n, count(*) AS n30 FROM (
    SELECT ap.id
    FROM accounts_payable ap
    LEFT JOIN account_payable_payments p
           ON p.account_payable_id = ap.id AND NOT p.is_reversed
    GROUP BY ap.id, ap.paid_amount
    HAVING ap.paid_amount <> COALESCE(sum(p.amount), 0)
  ) x
),

-- Mismo principio que en OP: revertir el pago tiene que anular su movimiento.
cp_pagos_revertidos_con_caja_viva AS (
  SELECT count(*) AS n,
         count(*) FILTER (WHERE p.reversed_at >= now() - interval '30 days') AS n30
  FROM account_payable_payments p
  JOIN cash_movements cm ON cm.id = p.cash_movement_id
  WHERE p.is_reversed AND NOT cm.is_voided
),

-- Cuentas atrapadas por centavos: los totales con decimales vienen de OG con
-- retenciones, pero los pagos se registran en pesos enteros, así que queda un
-- residuo que nadie puede saldar y la cuenta no cierra nunca.
cp_atrapadas_por_centavos AS (
  SELECT count(*) AS n, count(*) AS n30 FROM accounts_payable
  WHERE balance > 0 AND balance < 1 AND status <> 'PAID'
),

-- ── Consecutivos ────────────────────────────────────────────────────────────

-- El contador nunca puede ir por detrás del último documento emitido: si va
-- atrás, la próxima creación intenta repetir un número que ya existe.
consecutivos_atrasados AS (
  SELECT count(*) AS n, count(*) AS n30 FROM (
    SELECT c.type
    FROM consecutives c
    CROSS JOIN LATERAL (
      SELECT CASE c.type
        WHEN 'ORDER' THEN (SELECT max(CAST(substring(order_number FROM '([0-9]+)$') AS int))
                             FROM orders WHERE order_number LIKE 'OP-' || c.year || '-%')
        WHEN 'QUOTE' THEN (SELECT max(CAST(substring(quote_number FROM '([0-9]+)$') AS int))
                             FROM quotes WHERE quote_number LIKE 'COT-' || c.year || '-%')
        WHEN 'EXPENSE' THEN (SELECT max(CAST(substring(og_number FROM '([0-9]+)$') AS int))
                               FROM expense_orders WHERE og_number LIKE 'OG-' || c.year || '-%')
        WHEN 'WORK_ORDER' THEN (SELECT max(CAST(substring(work_order_number FROM '([0-9]+)$') AS int))
                                  FROM work_orders WHERE work_order_number LIKE 'OT-' || c.year || '-%')
        WHEN 'CASH_RECEIPT' THEN (SELECT max(CAST(substring(receipt_number FROM '([0-9]+)$') AS int))
                                    FROM cash_movements WHERE receipt_number LIKE 'RC-' || c.year || '-%')
        WHEN 'PRODUCTION_ORDER' THEN (SELECT max(CAST(substring(oprod_number FROM '([0-9]+)$') AS int))
                                        FROM production_orders WHERE oprod_number LIKE 'OPROD-' || c.year || '-%')
        WHEN 'DTF_TEXTIL' THEN (SELECT max(CAST(substring(consecutive FROM '([0-9]+)$') AS int))
                                  FROM dtf_records WHERE consecutive LIKE 'DTF-TEXTIL-' || c.year || '-%')
        WHEN 'DTF_UV' THEN (SELECT max(CAST(substring(consecutive FROM '([0-9]+)$') AS int))
                              FROM dtf_records WHERE consecutive LIKE 'DTF-UV-' || c.year || '-%')
        ELSE NULL
      END AS max_real
    ) m
    WHERE m.max_real IS NOT NULL AND m.max_real > c.last_number
  ) x
),

-- ── Solicitudes de autorización ─────────────────────────────────────────────

-- Dos solicitudes pendientes idénticas son un doble clic que se coló: dos
-- notificaciones de WhatsApp y una solicitud que se queda pendiente para
-- siempre. Los índices parciales lo impiden; esto verifica que sigan puestos.
solicitudes_pendientes_duplicadas AS (
  SELECT
    (SELECT count(*) FROM (SELECT 1 FROM expense_order_auth_requests WHERE status='PENDING' GROUP BY expense_order_id, requested_by_id HAVING count(*)>1) a)
  + (SELECT count(*) FROM (SELECT 1 FROM client_advisor_requests WHERE status='PENDING' GROUP BY client_id, requested_advisor_id HAVING count(*)>1) b)
  + (SELECT count(*) FROM (SELECT 1 FROM order_edit_requests WHERE status='PENDING' GROUP BY order_id, requested_by_id HAVING count(*)>1) c)
  + (SELECT count(*) FROM (SELECT 1 FROM order_status_change_requests WHERE status='PENDING' GROUP BY order_id, requested_by_id, requested_status HAVING count(*)>1) d)
  + (SELECT count(*) FROM (SELECT 1 FROM advisor_change_requests WHERE status='PENDING' GROUP BY order_id HAVING count(*)>1) e)
  + (SELECT count(*) FROM (SELECT 1 FROM account_payable_auth_requests WHERE status='PENDING' GROUP BY account_payable_id, requested_by_id HAVING count(*)>1) f)
  + (SELECT count(*) FROM (SELECT 1 FROM account_payable_payment_auth_requests WHERE status IN ('PENDING','ADMIN_APPROVED') GROUP BY account_payable_id, requested_by_id HAVING count(*)>1) g)
  + (SELECT count(*) FROM (SELECT 1 FROM client_ownership_auth_requests WHERE status='PENDING' GROUP BY order_id HAVING count(*)>1) h)
  + (SELECT count(*) FROM (SELECT 1 FROM cash_movement_void_requests WHERE status='PENDING' AND cash_movement_id IS NOT NULL GROUP BY cash_movement_id HAVING count(*)>1) i)
  + (SELECT count(*) FROM (SELECT 1 FROM refund_requests WHERE status='PENDING' GROUP BY order_id HAVING count(*)>1) j)
  AS n, NULL::bigint AS n30
),

-- ── Caja ────────────────────────────────────────────────────────────────────

-- Dos sesiones abiertas en la misma caja parten el arqueo en dos. Lo impide un
-- índice parcial; esto verifica que siga vivo.
cajas_con_dos_sesiones_abiertas AS (
  SELECT count(*) AS n, count(*) AS n30 FROM (
    SELECT 1 FROM cash_sessions WHERE status = 'OPEN'
    GROUP BY cash_register_id HAVING count(*) > 1
  ) x
),

-- ── Residuos de coma flotante ───────────────────────────────────────────────

-- Los montos se guardan con dos decimales. Un tercer decimal es la firma de una
-- resta hecha en coma flotante en vez de con Decimal.
montos_con_mas_de_dos_decimales AS (
  SELECT
    (SELECT count(*) FROM orders WHERE paid_amount <> round(paid_amount, 2) OR balance <> round(balance, 2))
  + (SELECT count(*) FROM accounts_payable WHERE paid_amount <> round(paid_amount, 2) OR balance <> round(balance, 2))
  + (SELECT count(*) FROM payments WHERE amount <> round(amount, 2))
  AS n, NULL::bigint AS n30
)

-- ── Resultado ───────────────────────────────────────────────────────────────

SELECT * FROM (
  SELECT 'CRITICA' AS gravedad, 'Pagos que mueven dinero sin rastro en caja' AS invariante, n AS total, n30 AS ultimos_30_dias FROM pagos_huerfanos
  UNION ALL SELECT 'CRITICA', 'Órdenes cuyo saldo pagado no cuadra con sus pagos', n, n30 FROM op_saldo_descuadrado
  UNION ALL SELECT 'CRITICA', 'Pagos anulados cuyo movimiento de caja sigue vivo', n, n30 FROM pagos_anulados_con_caja_viva
  UNION ALL SELECT 'CRITICA', 'Cuentas por pagar con saldo que no cuadra con sus pagos', n, n30 FROM cp_saldo_descuadrado
  UNION ALL SELECT 'CRITICA', 'Pagos de CP revertidos con movimiento de caja vivo', n, n30 FROM cp_pagos_revertidos_con_caja_viva
  UNION ALL SELECT 'CRITICA', 'Consecutivos por detrás del último documento emitido', n, n30 FROM consecutivos_atrasados
  UNION ALL SELECT 'CRITICA', 'Cajas con más de una sesión abierta', n, n30 FROM cajas_con_dos_sesiones_abiertas
  UNION ALL SELECT 'ALTA', 'Solicitudes pendientes duplicadas', n, COALESCE(n30, n) FROM solicitudes_pendientes_duplicadas
  UNION ALL SELECT 'ALTA', 'Montos guardados con más de dos decimales', n, COALESCE(n30, n) FROM montos_con_mas_de_dos_decimales
  UNION ALL SELECT 'AVISO', 'Cuentas por pagar atrapadas por centavos', n, n30 FROM cp_atrapadas_por_centavos
) resultados
ORDER BY
  CASE WHEN ultimos_30_dias > 0 THEN 0 WHEN total > 0 THEN 1 ELSE 2 END,
  CASE gravedad WHEN 'CRITICA' THEN 1 WHEN 'ALTA' THEN 2 ELSE 3 END,
  invariante;
