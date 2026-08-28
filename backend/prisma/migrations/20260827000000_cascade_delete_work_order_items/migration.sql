-- Eliminar un ítem de una OP ya no revienta cuando existe una OT asociada.
--
-- `work_order_items.order_item_id` apuntaba a `order_items` con ON DELETE RESTRICT
-- (el default de Prisma cuando la relación no declara `onDelete`). Al editar una OP
-- y quitar un ítem, la reconciliación hace `orderItem.deleteMany(...)`, Postgres
-- rechazaba el DELETE y Prisma lanzaba P2003 → 500 sin mensaje útil para el usuario.
-- Caso real: OP-2026-2315, cuyos 6 ítems están referenciados por OT-2026-0581.
--
-- Con CASCADE, borrar el ítem de la OP se lleva su contraparte en la OT y, por las
-- cascadas que ya existían, sus áreas de producción e insumos asignados. Los
-- registros de tiempo trabajado NO se pierden: `work_order_time_entries` usa
-- ON DELETE SET NULL, así que las horas siguen contando a nivel de OT.
--
-- El inventario tampoco queda descuadrado: el consumo (movimientos EXIT) se genera
-- al COMPLETAR la OT leyendo los insumos en ese momento, y los `inventory_movements`
-- ya generados referencian la OT por `reference_id`, no al ítem, así que sobreviven.
--
-- Migración idempotente: dev y staging comparten la misma base de datos.

ALTER TABLE "work_order_items"
  DROP CONSTRAINT IF EXISTS "work_order_items_order_item_id_fkey";

ALTER TABLE "work_order_items"
  ADD CONSTRAINT "work_order_items_order_item_id_fkey"
  FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
