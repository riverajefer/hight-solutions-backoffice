# 06 - Testing Guide

Guía para escribir y mantener tests unitarios en el backend NestJS.

---

## Stack de Testing

| Paquete | Versión | Rol |
|---------|---------|-----|
| `jest` | ^29.7.0 | Test runner |
| `ts-jest` | ^29.4.x | Compilador TypeScript para Jest |
| `@nestjs/testing` | ^11.x | Utilidades de testing para NestJS |
| `@types/jest` | ^29.x | Tipos TypeScript para Jest |

---

## Configuración

Jest está configurado directamente en `backend/package.json` (sección `"jest"`). No existe un `jest.config.js` separado.

```json
"jest": {
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": "src",
  "testRegex": ".*\\.spec\\.ts$",
  "transform": {
    "^.+\\.(t|j)s$": ["ts-jest", { "tsconfig": "tsconfig.json" }]
  },
  "collectCoverageFrom": [
    "**/*.(t|j)s",
    "!**/*.module.ts",
    "!**/*.dto.ts",
    "!**/main.ts",
    "!**/index.ts"
  ],
  "coverageDirectory": "../coverage",
  "testEnvironment": "node",
  "moduleNameMapper": {
    "^@/(.*)$": "<rootDir>/$1",
    "^@modules/(.*)$": "<rootDir>/modules/$1",
    "^@common/(.*)$": "<rootDir>/common/$1",
    "^@config/(.*)$": "<rootDir>/config/$1"
  }
}
```

El `moduleNameMapper` refleja los path aliases del `tsconfig.json`. Si agregas nuevos aliases en `tsconfig`, debes replicarlos aquí.

---

## Comandos

```bash
npm test              # Ejecutar todos los tests una vez
npm run test:watch    # Watch mode (re-ejecuta al guardar)
npm run test:cov      # Ejecutar con reporte de cobertura
npm run test:ci       # CI mode (--runInBand, coverage)

# Ejecutar un archivo específico
npm test -- auth.service.spec
npm test -- permissions.guard.spec

# Ejecutar con verbose (ver nombre de cada test)
npm test -- --verbose
```

---

## Estructura de Archivos

Los tests son **co-locados** junto al archivo fuente que testean:

```
src/
  modules/
    auth/
      auth.service.ts
      auth.service.spec.ts          ← test unitario del service
    users/
      users.service.ts
      users.service.spec.ts
  common/
    guards/
      permissions.guard.ts
      permissions.guard.spec.ts
  database/
    prisma.service.ts
    prisma.service.mock.ts          ← mock factory compartida
```

### Qué testear en cada capa

| Capa | Qué testear | Qué NO testear |
|------|-------------|----------------|
| **Service** | Lógica de negocio, validaciones, manejo de errores | Queries SQL, HTTP |
| **Guard** | `canActivate()` con distintos estados de usuario/permisos | Infraestructura de Passport |
| **Repository** | No se testea unitariamente (usa Prisma directamente) | - |
| **Controller** | No se testea unitariamente (se cubre en e2e) | - |

---

## Mock Factory de PrismaService

**Archivo:** `src/database/prisma.service.mock.ts`

`PrismaService` no puede instanciarse en tests porque su constructor requiere una conexión real a PostgreSQL (`pg.Pool` + `PrismaPg`). Se usa siempre como `useValue` con la factory:

```typescript
import { createMockPrismaService } from '../../database/prisma.service.mock';

// En el TestingModule:
{ provide: PrismaService, useValue: createMockPrismaService() }
```

La factory retorna un objeto con `jest.fn()` para todas las operaciones de las tablas `user`, `role`, `permission`, `rolePermission`, `sessionLog` y los métodos `$transaction`, `$connect`, `$disconnect`.

Si un test necesita mockear una operación específica:

```typescript
(prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: '1', email: 'test@example.com' });
(prisma.user.findUnique as jest.Mock).mockResolvedValue(null); // simula "no encontrado"
(prisma.user.update as jest.Mock).mockResolvedValue({});
```

---

## Patrón General de un Test de Service

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { MyService } from './my.service';
import { MyRepository } from './my.repository';

// Mock del repositorio
const mockMyRepository = {
  findAll: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

describe('MyService', () => {
  let service: MyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MyService,
        { provide: MyRepository, useValue: mockMyRepository },
      ],
    }).compile();

    service = module.get<MyService>(MyService);
  });

  afterEach(() => {
    jest.clearAllMocks(); // Limpiar mocks entre tests
  });

  describe('findOne', () => {
    it('should return entity when found', async () => {
      mockMyRepository.findById.mockResolvedValue({ id: '1', name: 'Test' });

      const result = await service.findOne('1');

      expect(result).toMatchObject({ id: '1' });
    });

    it('should throw NotFoundException when not found', async () => {
      mockMyRepository.findById.mockResolvedValue(null);

      await expect(service.findOne('bad-id')).rejects.toThrow(NotFoundException);
    });
  });
});
```

---

## Mockear bcrypt

`bcrypt` se importa como `import * as bcrypt from 'bcrypt'`. El mock **debe declararse antes de cualquier import** que use bcrypt:

```typescript
// IMPORTANTE: Antes de los imports
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

import * as bcrypt from 'bcrypt';

// En el test:
(bcrypt.hash as jest.Mock).mockResolvedValue('hashed-value');
(bcrypt.compare as jest.Mock).mockResolvedValue(true);
```

**Gotcha con `mockResolvedValueOnce` en `beforeEach`:** Si un test lanza una excepción antes de consumir el valor en cola, ese valor queda pendiente y contamina el siguiente test. Prefiere `mockResolvedValue` (sin "Once") en `beforeEach`, y reserva `mockResolvedValueOnce` para tests individuales donde controlas el flujo completo.

---

## Mockear Guards en Tests de Controller (futuro)

Para cuando se implementen tests de controller, deshabilitar los guards globalmente:

```typescript
const module = await Test.createTestingModule({
  controllers: [MyController],
  providers: [MyService],
})
  .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
  .overrideGuard(PermissionsGuard).useValue({ canActivate: () => true })
  .compile();
```

---

## Mockear ExecutionContext (para Guards)

```typescript
const createMockContext = (user: any): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  }) as unknown as ExecutionContext;
```

---

## Tests Existentes

| Archivo | Tests | Cobertura |
|---------|-------|-----------|
| `src/common/guards/permissions.guard.spec.ts` | 11 | 100% |
| `src/modules/auth/auth.service.spec.ts` | 23 | ~96% |
| `src/modules/auth/strategies/jwt.strategy.spec.ts` | 4 | ~95% |
| `src/modules/auth/strategies/local.strategy.spec.ts` | 3 | 100% |
| `src/modules/users/users.service.spec.ts` | 20 | ~97% |
| `src/modules/roles/roles.service.spec.ts` | 21 | 100% |
| `src/modules/permissions/permissions.service.spec.ts` | 16 | ~97% |
| `src/modules/areas/areas.service.spec.ts` | 16 | 100% |
| `src/modules/cargos/cargos.service.spec.ts` | 21 | 100% |
| `src/modules/session-logs/session-logs.service.spec.ts` | 17 | 100% |

**Total: 153 tests · 10 suites**

### Qué cubre `auth.service.spec.ts`
- `validateUser` — credenciales válidas, usuario inexistente, password incorrecto
- `login` — generación de tokens, hashing de refresh token, actualización en DB
- `loginWithPermissions` — tokens + permisos + session log
- `refreshTokens` — token válido, usuario no encontrado, hash inválido, token null
- `logout` — limpieza de refreshToken, session log
- `register` — creación con password hasheado, email duplicado, roleId inválido
- `getUserProfile` — permisos aplanados, usuario no encontrado

### Qué cubre `jwt.strategy.spec.ts`
- `validate` — payload válido retorna AuthenticatedUser, consulta DB con `sub` correcto
- `validate` — token tipo `refresh` → UnauthorizedException (sin consultar DB)
- `validate` — usuario no encontrado en DB → UnauthorizedException

### Qué cubre `local.strategy.spec.ts`
- `validate` — credenciales válidas retorna usuario
- `validate` — delega a `authService.validateUser` con email y password
- `validate` — retorno null de authService → UnauthorizedException

### Qué cubre `users.service.spec.ts`
- `findAll` — delegación al repository
- `findOne` — permisos aplanados (rp.permission unwrapped), NotFoundException
- `create` — con/sin cargo, email duplicado, roleId inválido, cargo inactivo/inexistente
- `update` — password opcional, Prisma connect/disconnect, validaciones de email/rol/cargo
- `remove` — eliminación exitosa, NotFoundException

### Qué cubre `roles.service.spec.ts`
- `findAll` — transformación con `usersCount` y permisos aplanados
- `findOne` — permisos aplanados, NotFoundException
- `create` — sin permisos, con permisos (createWithPermissions), nombre duplicado
- `update` — actualización, NotFoundException, nombre duplicado, sin check si no cambia nombre
- `assignPermissions` — reemplaza permisos, NotFoundException, permissionIds inválidos
- `addPermissions` — agrega solo los nuevos (skip duplicados), sin llamada si ya están todos
- `removePermissions` — elimina permisos, NotFoundException
- `remove` — eliminación exitosa, NotFoundException, rol con usuarios asignados

### Qué cubre `permissions.service.spec.ts`
- `findAll` — delegación al repository
- `findOne` — roles aplanados (rp.role unwrapped), NotFoundException
- `create` — nombre único, nombre duplicado
- `createMany` — todos exitosos, fallo parcial continúa, todos fallan, array vacío
- `update` — actualización, NotFoundException, nombre duplicado, sin check si no cambia nombre
- `remove` — eliminación exitosa, NotFoundException, permiso asignado a roles

### Qué cubre `permissions.guard.spec.ts`
- Sin decorador `@RequirePermissions` → permite acceso
- Array vacío de permisos → permite acceso
- Usuario con todos los permisos requeridos → permite acceso
- Usuario sin algún permiso → ForbiddenException con lista de faltantes
- Usuario null / sin roleId → ForbiddenException
- roleId no existe en DB → ForbiddenException

### Qué cubre `areas.service.spec.ts`
- `findAll` — transformación con `cargosCount`, `_count` queda `undefined`, flag `includeInactive`
- `findOne` — cargos enriquecidos con `usersCount`, NotFoundException
- `create` — nombre único, nombre duplicado
- `update` — actualización, NotFoundException, nombre duplicado, sin check si no cambia nombre
- `remove` (soft delete) — `isActive: false`, NotFoundException, área con cargos activos

### Qué cubre `cargos.service.spec.ts`
- `findAll` — transformación con `usersCount`, flag `includeInactive`
- `findByArea` — validación de área, enriquecimiento, NotFoundException si área no existe
- `findOne` — `usersCount`, NotFoundException
- `create` — área existente/activa, nombre único dentro del área, área inactiva, nombre duplicado
- `update` — sin área, Prisma connect para areaId, validación de nueva área inactiva/inexistente, nombre duplicado en área destino, no valida área si no cambia
- `remove` (soft delete) — `isActive: false`, NotFoundException, cargo con usuarios asignados

### Qué cubre `session-logs.service.spec.ts`
- `createLoginLog` / `createLogoutLog` — delegación al repository con/sin parámetros opcionales
- `findAll` — enriquecimiento con `durationMinutes` + `durationFormatted`, sesiones activas, passthrough de meta
- `findByUserId` — enriquecimiento, defaults de paginación, paginación personalizada
- `getActiveSessions` — duración calculada desde login hasta ahora, todas marcadas como "Sesión activa"
- Formato de duración (vía `findAll`): `< 1m`, `Xm`, `Xh`, `Xh Ym`, `Sesión activa`

> **Nota de testing:** `_count: undefined` — cuando el service hace `{ ...obj, _count: undefined }` vía spread, la clave `_count` **existe** en el objeto con valor `undefined`. Usa `expect(obj._count).toBeUndefined()` en lugar de `expect(obj).not.toHaveProperty('_count')`.

---

## Próximos Tests Recomendados

En orden de impacto:

1. Tests de integración (e2e) con base de datos en memoria para los flujos completos de auth
2. Tests de controllers con guards mockeados (`overrideGuard`)
3. `clients.service.spec.ts` — validaciones multi-campo (personType, NIT/cédula, ubicaciones)
