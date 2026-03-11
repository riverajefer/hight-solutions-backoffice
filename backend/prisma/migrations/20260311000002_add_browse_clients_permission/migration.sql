-- Data migration: Add browse_clients permission
-- This permission gates access to the full /clients table page.
-- read_clients remains for API endpoint access (used by selectors in forms).

-- 1. Insert the new permission (idempotent)
INSERT INTO "permissions" ("id", "name", "description", "created_at", "updated_at")
VALUES (
  gen_random_uuid(),
  'browse_clients',
  'Acceder a la tabla completa de clientes (/clients)',
  NOW(),
  NOW()
)
ON CONFLICT ("name") DO NOTHING;

-- 2. Assign browse_clients to the admin role (all permissions)
INSERT INTO "_RolePermissions" ("A", "B")
SELECT r.id, p.id
FROM "roles" r, "permissions" p
WHERE r.name = 'admin'
  AND p.name = 'browse_clients'
ON CONFLICT DO NOTHING;

-- 3. Assign browse_clients to the manager role
INSERT INTO "_RolePermissions" ("A", "B")
SELECT r.id, p.id
FROM "roles" r, "permissions" p
WHERE r.name = 'manager'
  AND p.name = 'browse_clients'
ON CONFLICT DO NOTHING;
