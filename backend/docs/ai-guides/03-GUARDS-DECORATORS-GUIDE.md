# Guía de Guards y Decoradores

Esta guía explica cómo funcionan los Guards y Decoradores en el sistema de autenticación y autorización.

## Guards Existentes

### 1. JwtAuthGuard

**Ubicación**: `src/modules/auth/guards/jwt-auth.guard.ts`

**Propósito**: Valida que el request tenga un Access Token válido.

**Uso**:

```typescript
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('protected')
@UseGuards(JwtAuthGuard) // A nivel de controlador
export class ProtectedController {
  
  @Get()
  getProtectedResource() {
    return { message: 'This is protected' };
  }
  
  @Get('specific')
  @UseGuards(JwtAuthGuard) // A nivel de método
  getSpecificResource() {
    return { message: 'This is also protected' };
  }
}
```

**Funcionamiento**:
1. Extrae el token del header `Authorization: Bearer <token>`
2. Valida el token usando la JwtStrategy
3. Si es válido, agrega el payload del usuario al request
4. Si es inválido, lanza una excepción 401 Unauthorized

### 2. PermissionsGuard

**Ubicación**: `src/common/guards/permissions.guard.ts`

**Propósito**: Valida que el usuario tenga los permisos requeridos para acceder al endpoint.

**Uso** (siempre en combinación con JwtAuthGuard):

```typescript
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';

@Controller('products')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProductsController {
  
  @Get()
  @RequirePermissions('read_products')
  findAll() {
    return this.productsService.findAll();
  }
  
  @Post()
  @RequirePermissions('create_products')
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }
  
  @Delete(':id')
  @RequirePermissions('delete_products')
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
```

**Funcionamiento**:
1. Lee los permisos requeridos del decorador `@RequirePermissions`
2. Obtiene el usuario del request (agregado por JwtAuthGuard)
3. Consulta en la base de datos los permisos del usuario a través de su rol
4. Compara permisos requeridos vs permisos del usuario
5. Si tiene todos los permisos, permite el acceso
6. Si falta algún permiso, lanza excepción 403 Forbidden

### 3. LocalAuthGuard

**Ubicación**: `src/modules/auth/guards/local-auth.guard.ts`

**Propósito**: Valida credenciales email/password en el endpoint de login.

**Uso**:

```typescript
import { UseGuards } from '@nestjs/common';
import { LocalAuthGuard } from './guards/local-auth.guard';

@Controller('auth')
export class AuthController {
  
  @Post('login')
  @UseGuards(LocalAuthGuard)
  async login(@Request() req) {
    // Si llega aquí, las credenciales son válidas
    // req.user contiene el usuario validado
    return this.authService.login(req.user);
  }
}
```

## Decoradores Existentes

### 1. @RequirePermissions()

**Ubicación**: `src/common/decorators/require-permissions.decorator.ts`

**Propósito**: Define qué permisos se requieren para acceder a un endpoint.

**Sintaxis**:

```typescript
// Un solo permiso
@RequirePermissions('read_products')

// Múltiples permisos (requiere TODOS)
@RequirePermissions('read_products', 'read_categories')
```

**Implementación**:

```typescript
import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
```

### 2. @CurrentUser()

**Ubicación**: `src/common/decorators/current-user.decorator.ts`

**Propósito**: Extrae el usuario autenticado del request.

**Uso**:

```typescript
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  
  @Get('me')
  getProfile(@CurrentUser() user: any) {
    // user contiene: { sub: userId, email: userEmail, roleId: userRoleId }
    return user;
  }
  
  @Put('me')
  updateProfile(
    @CurrentUser() user: any,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.profileService.update(user.sub, dto);
  }
}
```

**Implementación**:

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
```

### 3. @Public()

**Ubicación**: `src/common/decorators/public.decorator.ts`

**Propósito**: Marca endpoints como públicos (sin autenticación).

**Uso**:

```typescript
import { Public } from '../../common/decorators/public.decorator';

@Controller('public')
export class PublicController {
  
  @Get('health')
  @Public()
  healthCheck() {
    return { status: 'ok' };
  }
}
```

**Nota**: Requiere configuración global del JwtAuthGuard para que funcione.

## Crear un Guard Personalizado

### Ejemplo: RolesGuard

```typescript
// src/common/guards/roles.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Obtener los roles requeridos del decorador
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true; // No hay roles requeridos, permitir acceso
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Verificar si el usuario tiene alguno de los roles requeridos
    const hasRole = requiredRoles.some((role) => user.role?.name === role);

    if (!hasRole) {
      throw new ForbiddenException(
        `User does not have required role. Required: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
```

### Decorador asociado:

```typescript
// src/common/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
```

### Uso:

```typescript
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  
  @Get('dashboard')
  @Roles('admin', 'manager')
  getDashboard() {
    return { message: 'Admin dashboard' };
  }
}
```

## Guard para Rate Limiting

```typescript
// src/common/guards/throttle.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

@Injectable()
export class ThrottleGuard implements CanActivate {
  private requests = new Map<string, number[]>();
  private readonly limit = 10; // Máximo de requests
  private readonly ttl = 60000; // En 60 segundos (1 minuto)

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const key = request.ip || request.user?.sub || 'anonymous';

    const now = Date.now();
    const userRequests = this.requests.get(key) || [];

    // Filtrar requests dentro del TTL
    const validRequests = userRequests.filter((time) => now - time < this.ttl);

    if (validRequests.length >= this.limit) {
      throw new HttpException(
        'Too many requests',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    validRequests.push(now);
    this.requests.set(key, validRequests);

    return true;
  }
}
```

**Uso**:

```typescript
@Post('login')
@UseGuards(ThrottleGuard) // Limita intentos de login
async login(@Body() dto: LoginDto) {
  return this.authService.login(dto);
}
```

## Combinación de Guards

Los Guards se ejecutan en el orden en que se declaran:

```typescript
@Controller('secure')
@UseGuards(
  JwtAuthGuard,      // 1. Primero valida autenticación
  RolesGuard,        // 2. Luego valida rol
  PermissionsGuard,  // 3. Finalmente valida permisos específicos
)
export class SecureController {
  
  @Get('resource')
  @Roles('admin')
  @RequirePermissions('read_secure_data')
  getSecureResource() {
    return { data: 'Very secure' };
  }
}
```

## Decorador para Extraer Datos Personalizados

```typescript
// src/common/decorators/get-user-id.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const GetUserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.sub;
  },
);
```

**Uso**:

```typescript
@Get('my-data')
@UseGuards(JwtAuthGuard)
getMyData(@GetUserId() userId: string) {
  return this.service.getUserData(userId);
}
```

## Decorador para Query Params Validados

```typescript
// src/common/decorators/pagination.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export const Pagination = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): PaginationParams => {
    const request = ctx.switchToHttp().getRequest();
    const page = parseInt(request.query.page) || 1;
    const limit = parseInt(request.query.limit) || 10;
    
    return {
      page,
      limit,
      skip: (page - 1) * limit,
    };
  },
);
```

**Uso**:

```typescript
@Get()
async findAll(@Pagination() pagination: PaginationParams) {
  return this.service.findAll({
    skip: pagination.skip,
    take: pagination.limit,
  });
}
```

## Testing Guards

```typescript
// products.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

describe('ProductsController', () => {
  let controller: ProductsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        {
          provide: ProductsService,
          useValue: mockProductsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ProductsController>(ProductsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
```

## Best Practices

1. **Orden de Guards**: Siempre poner JwtAuthGuard antes de guards que necesiten el usuario
2. **Guards Genéricos**: Crear guards reutilizables en `src/common/guards/`
3. **Guards Específicos**: Crear guards de módulo en su propia carpeta
4. **Decoradores Descriptivos**: Usar nombres claros como `@RequirePermissions()` en lugar de `@Perms()`
5. **Validación Temprana**: Validar todo lo posible en el guard antes de llegar al controller
6. **Mensajes de Error**: Proveer mensajes claros cuando un guard falla
7. **Performance**: No hacer queries pesadas en guards, mantenerlos ligeros
8. **Testing**: Siempre mockear guards en tests unitarios

## Checklist de Seguridad

- [ ] Todos los endpoints protegidos usan JwtAuthGuard
- [ ] Endpoints con permisos usan PermissionsGuard
- [ ] El orden de guards es correcto
- [ ] Endpoints públicos están marcados con @Public() si es necesario
- [ ] Rate limiting en endpoints sensibles (login, registro)
- [ ] Validación de roles para endpoints administrativos
- [ ] Tests cubren casos de guards fallidos
- [ ] Mensajes de error no revelan información sensible
