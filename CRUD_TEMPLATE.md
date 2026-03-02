# Plantilla para Crear CRUD Completo

Esta plantilla te ayuda a crear un CRUD completo (Backend + Frontend) siguiendo los patrones del proyecto High Solutions Backoffice.

---

## 📋 Checklist de Implementación

### Backend
- [ ] Crear modelo en Prisma schema
- [ ] Ejecutar migración de Prisma
- [ ] Crear DTOs (Create y Update)
- [ ] Crear Repository
- [ ] Crear Service
- [ ] Crear Controller
- [ ] Crear Module
- [ ] Agregar Module a AppModule
- [ ] Agregar permisos al seed
- [ ] Agregar datos iniciales al seed (opcional)
- [ ] Ejecutar seed

### Frontend
- [ ] Crear tipos TypeScript
- [ ] Crear API service
- [ ] Crear custom hook
- [ ] Crear página de Lista
- [ ] Crear página de Formulario
- [ ] Crear página de Detalle
- [ ] Agregar rutas al router
- [ ] Agregar paths
- [ ] Agregar permisos a constants
- [ ] Agregar ítem al menú sidebar

---

## 🔧 Instrucciones de Uso

### Formato del Prompt

```
Crea el CRUD completo de [NOMBRE_ENTIDAD] basándote en la plantilla CRUD_TEMPLATE.md

**Modelo de datos:**
- Campo 1: tipo, descripción
- Campo 2: tipo, descripción
- Campo 3: tipo, descripción

**Relaciones (si aplica):**
- Relación con [ENTIDAD]: tipo de relación

**Datos iniciales para el seed:**
- Dato 1
- Dato 2
- Dato 3

**Configuración adicional:**
- Nombre singular: [nombre]
- Nombre plural: [nombres]
- Icono para el menú: [nombre del icono de Material UI]
- Ruta base: /[ruta]
```

---

## 📁 Estructura de Archivos a Crear

### Backend (`backend/src/modules/[entity-name]/`)

```
entity-name/
├── dto/
│   ├── create-entity.dto.ts
│   ├── update-entity.dto.ts
│   └── index.ts
├── entity.controller.ts
├── entity.service.ts
├── entity.repository.ts
└── entity.module.ts
```

### Frontend (`frontend/src/features/[entity-name]/`)

```
entity-name/
├── hooks/
│   └── useEntity.ts
└── pages/
    ├── EntityListPage.tsx
    ├── EntityFormPage.tsx
    └── EntityDetailPage.tsx
```

### Otros archivos a modificar

**Backend:**
- `backend/prisma/schema.prisma`
- `backend/src/app.module.ts`
- `backend/prisma/seed.ts`

**Frontend:**
- `frontend/src/types/entity.types.ts`
- `frontend/src/types/index.ts`
- `frontend/src/api/entity.api.ts`
- `frontend/src/router/index.tsx`
- `frontend/src/router/paths.ts`
- `frontend/src/utils/constants.ts`
- `frontend/src/components/layout/Sidebar.tsx`

---

## 📝 Templates de Código

### 1. Modelo Prisma

```prisma
// backend/prisma/schema.prisma

model EntityName {
  id          String   @id @default(uuid())
  name        String   @unique
  description String?
  isActive    Boolean  @default(true) @map("is_active")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  // Relaciones (si aplica)
  // relatedEntity RelatedEntity @relation(fields: [relatedEntityId], references: [id])
  // relatedEntityId String @map("related_entity_id")

  @@map("table_name")
}
```

**Comandos:**
```bash
cd backend
npx prisma migrate dev --name add_entity_name
npx prisma generate
```

---

### 2. DTOs

#### Create DTO
```typescript
// backend/src/modules/entity-name/dto/create-entity.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateEntityDto {
  @ApiProperty({
    description: 'Nombre de la entidad',
    example: 'Ejemplo',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty({ message: 'El nombre es requerido' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres' })
  name: string;

  @ApiProperty({
    description: 'Descripción de la entidad',
    example: 'Descripción de ejemplo',
    required: false,
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500, { message: 'La descripción no puede exceder 500 caracteres' })
  description?: string;
}
```

#### Update DTO
```typescript
// backend/src/modules/entity-name/dto/update-entity.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateEntityDto {
  @ApiProperty({
    description: 'Nombre de la entidad',
    example: 'Ejemplo',
    required: false,
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres' })
  name?: string;

  @ApiProperty({
    description: 'Descripción de la entidad',
    example: 'Descripción de ejemplo',
    required: false,
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500, { message: 'La descripción no puede exceder 500 caracteres' })
  description?: string;

  @ApiProperty({
    description: 'Estado de la entidad',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
```

#### Index
```typescript
// backend/src/modules/entity-name/dto/index.ts

export * from './create-entity.dto';
export * from './update-entity.dto';
```

---

### 3. Repository

```typescript
// backend/src/modules/entity-name/entity.repository.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '../../generated/prisma';

@Injectable()
export class EntityRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(includeInactive = false) {
    return this.prisma.entityName.findMany({
      where: includeInactive ? {} : { isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    return this.prisma.entityName.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findByName(name: string) {
    return this.prisma.entityName.findUnique({
      where: { name },
    });
  }

  async findByNameExcludingId(name: string, excludeId: string) {
    return this.prisma.entityName.findFirst({
      where: {
        name,
        NOT: { id: excludeId },
      },
    });
  }

  async create(data: Prisma.EntityNameCreateInput) {
    return this.prisma.entityName.create({
      data,
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async update(id: string, data: Prisma.EntityNameUpdateInput) {
    return this.prisma.entityName.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async delete(id: string) {
    return this.prisma.entityName.delete({
      where: { id },
    });
  }
}
```

---

### 4. Service

```typescript
// backend/src/modules/entity-name/entity.service.ts

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreateEntityDto, UpdateEntityDto } from './dto';
import { EntityRepository } from './entity.repository';

@Injectable()
export class EntityService {
  constructor(
    private readonly entityRepository: EntityRepository,
  ) {}

  async findAll(includeInactive = false) {
    return this.entityRepository.findAll(includeInactive);
  }

  async findOne(id: string) {
    const entity = await this.entityRepository.findById(id);

    if (!entity) {
      throw new NotFoundException(
        `Entidad con ID ${id} no encontrada`,
      );
    }

    return entity;
  }

  async create(createEntityDto: CreateEntityDto) {
    // Verificar nombre único
    const existingEntity = await this.entityRepository.findByName(
      createEntityDto.name,
    );

    if (existingEntity) {
      throw new BadRequestException(
        `Ya existe una entidad con el nombre "${createEntityDto.name}"`,
      );
    }

    return this.entityRepository.create({
      name: createEntityDto.name,
      description: createEntityDto.description,
    });
  }

  async update(id: string, updateEntityDto: UpdateEntityDto) {
    // Verificar que la entidad existe
    await this.findOne(id);

    // Si se actualiza el nombre, verificar que no exista
    if (updateEntityDto.name) {
      const existingEntity =
        await this.entityRepository.findByNameExcludingId(
          updateEntityDto.name,
          id,
        );

      if (existingEntity) {
        throw new BadRequestException(
          `Ya existe una entidad con el nombre "${updateEntityDto.name}"`,
        );
      }
    }

    return this.entityRepository.update(id, updateEntityDto);
  }

  async remove(id: string) {
    // Verificar que la entidad existe
    await this.findOne(id);

    // Soft delete
    await this.entityRepository.update(id, { isActive: false });

    return {
      message: `Entidad con ID ${id} eliminada correctamente`,
    };
  }
}
```

---

### 5. Controller

```typescript
// backend/src/modules/entity-name/entity.controller.ts

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { EntityService } from './entity.service';
import { CreateEntityDto, UpdateEntityDto } from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { PermissionsGuard } from '../../common/guards';
import { RequirePermissions } from '../../common/decorators';

@ApiTags('entity-name')
@ApiBearerAuth('JWT-auth')
@Controller('entity-name')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class EntityController {
  constructor(private readonly entityService: EntityService) {}

  @Get()
  @RequirePermissions('read_entity_name')
  @ApiOperation({ summary: 'Listar todas las entidades' })
  @ApiQuery({
    name: 'includeInactive',
    required: false,
    type: Boolean,
    description: 'Incluir entidades inactivas',
  })
  findAll(@Query('includeInactive') includeInactive?: string) {
    return this.entityService.findAll(includeInactive === 'true');
  }

  @Get(':id')
  @RequirePermissions('read_entity_name')
  @ApiOperation({ summary: 'Obtener entidad por ID' })
  findOne(@Param('id') id: string) {
    return this.entityService.findOne(id);
  }

  @Post()
  @RequirePermissions('create_entity_name')
  @ApiOperation({ summary: 'Crear nueva entidad' })
  create(@Body() createEntityDto: CreateEntityDto) {
    return this.entityService.create(createEntityDto);
  }

  @Put(':id')
  @RequirePermissions('update_entity_name')
  @ApiOperation({ summary: 'Actualizar entidad' })
  update(
    @Param('id') id: string,
    @Body() updateEntityDto: UpdateEntityDto,
  ) {
    return this.entityService.update(id, updateEntityDto);
  }

  @Delete(':id')
  @RequirePermissions('delete_entity_name')
  @ApiOperation({ summary: 'Eliminar entidad (soft delete)' })
  remove(@Param('id') id: string) {
    return this.entityService.remove(id);
  }
}
```

---

### 6. Module

```typescript
// backend/src/modules/entity-name/entity.module.ts

import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { EntityController } from './entity.controller';
import { EntityService } from './entity.service';
import { EntityRepository } from './entity.repository';

@Module({
  imports: [DatabaseModule],
  controllers: [EntityController],
  providers: [EntityService, EntityRepository],
  exports: [EntityService, EntityRepository],
})
export class EntityModule {}
```

**Agregar a AppModule:**
```typescript
// backend/src/app.module.ts

import { EntityModule } from './modules/entity-name/entity.module';

@Module({
  imports: [
    // ... otros módulos
    EntityModule,
  ],
})
export class AppModule {}
```

---

### 7. Seed - Permisos y Datos

```typescript
// backend/prisma/seed.ts

// 1. Agregar permisos al array permissionsData
const permissionsData = [
  // ... otros permisos

  // Entity Name
  { name: 'create_entity_name', description: 'Crear entidades' },
  { name: 'read_entity_name', description: 'Ver entidades' },
  { name: 'update_entity_name', description: 'Actualizar entidades' },
  { name: 'delete_entity_name', description: 'Eliminar entidades' },
];

// 2. Agregar datos iniciales (después de los consecutivos)
console.log('\n📦 Creating entities...');

const entitiesData = [
  { name: 'Entidad 1', description: 'Descripción de la entidad 1' },
  { name: 'Entidad 2', description: 'Descripción de la entidad 2' },
  { name: 'Entidad 3', description: 'Descripción de la entidad 3' },
];

for (const entityData of entitiesData) {
  await prisma.entityName.upsert({
    where: { name: entityData.name },
    update: { description: entityData.description },
    create: entityData,
  });
  console.log(`  ✓ Entity: ${entityData.name}`);
}

// 3. Agregar al resumen
console.log(`   - Entities: ${entitiesData.length}`);
```

**Ejecutar:**
```bash
cd backend
npm run prisma:seed
```

---

### 8. Frontend - Tipos TypeScript

```typescript
// frontend/src/types/entity.types.ts

export interface Entity {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEntityDto {
  name: string;
  description?: string;
}

export interface UpdateEntityDto {
  name?: string;
  description?: string;
  isActive?: boolean;
}

export type EntityListResponse = Entity[];

export interface PaginatedEntityResponse {
  data: Entity[];
  total: number;
  page: number;
  limit: number;
}
```

**Exportar en index.ts:**
```typescript
// frontend/src/types/index.ts

export * from './entity.types';
```

---

### 9. Frontend - API Service

```typescript
// frontend/src/api/entity.api.ts

import axiosInstance from './axios';
import {
  Entity,
  CreateEntityDto,
  UpdateEntityDto,
  EntityListResponse,
} from '../types';

export interface EntityQueryParams {
  includeInactive?: boolean;
}

export const entityApi = {
  getAll: async (params?: EntityQueryParams): Promise<EntityListResponse> => {
    const response = await axiosInstance.get<EntityListResponse>('/entity-name', { params });
    return response.data;
  },

  getById: async (id: string): Promise<Entity> => {
    const response = await axiosInstance.get<Entity>(`/entity-name/${id}`);
    return response.data;
  },

  create: async (data: CreateEntityDto): Promise<Entity> => {
    const response = await axiosInstance.post<Entity>('/entity-name', data);
    return response.data;
  },

  update: async (id: string, data: UpdateEntityDto): Promise<Entity> => {
    const response = await axiosInstance.put<Entity>(`/entity-name/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<{ message: string }> => {
    const response = await axiosInstance.delete<{ message: string }>(`/entity-name/${id}`);
    return response.data;
  },
};
```

---

### 10. Frontend - Custom Hook

```typescript
// frontend/src/features/entity-name/hooks/useEntity.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { entityApi, EntityQueryParams } from '../../../api/entity.api';
import { CreateEntityDto, UpdateEntityDto } from '../../../types';

export const useEntities = (params?: EntityQueryParams) => {
  const queryClient = useQueryClient();

  const entitiesQuery = useQuery({
    queryKey: ['entities', params],
    queryFn: () => entityApi.getAll(params),
  });

  const createEntityMutation = useMutation({
    mutationFn: (data: CreateEntityDto) => entityApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entities'] });
    },
  });

  const updateEntityMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateEntityDto }) =>
      entityApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entities'] });
    },
  });

  const deleteEntityMutation = useMutation({
    mutationFn: (id: string) => entityApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entities'] });
    },
  });

  return {
    entitiesQuery,
    createEntityMutation,
    updateEntityMutation,
    deleteEntityMutation,
  };
};

export const useEntity = (id: string) => {
  return useQuery({
    queryKey: ['entities', id],
    queryFn: () => entityApi.getById(id),
    enabled: !!id,
  });
};
```

---

### 11. Frontend - List Page

```typescript
// frontend/src/features/entity-name/pages/EntityListPage.tsx

import React, { useState } from 'react';
import { Box, Chip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { PageHeader } from '../../../components/common/PageHeader';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { DataTable, ActionsCell } from '../../../components/common/DataTable';
import { useEntities } from '../hooks/useEntity';
import { Entity } from '../../../types';

const EntityListPage: React.FC = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [confirmDelete, setConfirmDelete] = useState<Entity | null>(null);

  const { entitiesQuery, deleteEntityMutation } = useEntities();
  const entities = entitiesQuery.data || [];

  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return;

    try {
      await deleteEntityMutation.mutateAsync(confirmDelete.id);
      enqueueSnackbar('Entidad eliminada correctamente', { variant: 'success' });
      setConfirmDelete(null);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al eliminar entidad';
      enqueueSnackbar(message, { variant: 'error' });
    }
  };

  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Nombre',
      flex: 1,
      minWidth: 200,
    },
    {
      field: 'description',
      headerName: 'Descripción',
      flex: 2,
      minWidth: 300,
    },
    {
      field: 'isActive',
      headerName: 'Estado',
      width: 120,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={params.value ? 'Activo' : 'Inactivo'}
          size="small"
          color={params.value ? 'success' : 'default'}
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'Acciones',
      width: 120,
      sortable: false,
      filterable: false,
      renderCell: (params: GridRenderCellParams<Entity>) => (
        <ActionsCell
          onView={() => navigate(`/entity-route/${params.row.id}`)}
          onEdit={() => navigate(`/entity-route/${params.row.id}/edit`)}
          onDelete={() => setConfirmDelete(params.row)}
        />
      ),
    },
  ];

  return (
    <Box>
      <PageHeader
        title="Entidades"
        subtitle="Gestiona las entidades del sistema"
      />

      <DataTable
        rows={entities}
        columns={columns}
        loading={entitiesQuery.isLoading}
        onAdd={() => navigate('/entity-route/new')}
        addButtonText="Nueva Entidad"
        searchPlaceholder="Buscar entidades..."
      />

      <ConfirmDialog
        open={!!confirmDelete}
        title="Eliminar Entidad"
        message={`¿Estás seguro de que deseas eliminar la entidad "${confirmDelete?.name}"? Esta acción desactivará la entidad.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmDelete(null)}
        isLoading={deleteEntityMutation.isPending}
        confirmText="Eliminar"
        severity="error"
      />
    </Box>
  );
};

export default EntityListPage;
```

---

### 12. Frontend - Form Page

```typescript
// frontend/src/features/entity-name/pages/EntityFormPage.tsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Stack,
  Alert,
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '../../../components/common/PageHeader';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';
import { useEntities, useEntity } from '../hooks/useEntity';
import { CreateEntityDto, UpdateEntityDto } from '../../../types';

const entitySchema = z.object({
  name: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres'),
  description: z
    .string()
    .max(500, 'La descripción no puede exceder 500 caracteres')
    .optional()
    .or(z.literal('')),
});

type EntityFormData = z.infer<typeof entitySchema>;

const EntityFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { id } = useParams<{ id: string }>();
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!id;
  const { data: entity, isLoading: isLoadingEntity } = useEntity(id || '');
  const { createEntityMutation, updateEntityMutation } = useEntities();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EntityFormData>({
    resolver: zodResolver(entitySchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  useEffect(() => {
    if (entity && isEdit) {
      reset({
        name: entity.name,
        description: entity.description || '',
      });
    }
  }, [entity, isEdit, reset]);

  const onSubmit = async (data: EntityFormData) => {
    try {
      setError(null);
      if (isEdit && id) {
        await updateEntityMutation.mutateAsync({
          id,
          data: data as UpdateEntityDto,
        });
        enqueueSnackbar('Entidad actualizada correctamente', { variant: 'success' });
      } else {
        await createEntityMutation.mutateAsync(data as CreateEntityDto);
        enqueueSnackbar('Entidad creada correctamente', { variant: 'success' });
      }
      navigate('/entity-route');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al guardar entidad';
      setError(message);
      enqueueSnackbar(message, { variant: 'error' });
    }
  };

  if (isEdit && isLoadingEntity) {
    return <LoadingSpinner />;
  }

  return (
    <Box>
      <PageHeader
        title={isEdit ? 'Editar Entidad' : 'Nueva Entidad'}
        breadcrumbs={[
          { label: 'Entidades', path: '/entity-route' },
          { label: isEdit ? 'Editar' : 'Nueva' },
        ]}
      />

      <Card sx={{ maxWidth: 600 }}>
        <CardContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)}>
            <Stack spacing={3}>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Nombre"
                    fullWidth
                    error={!!errors.name}
                    helperText={errors.name?.message}
                    required
                  />
                )}
              />

              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Descripción"
                    fullWidth
                    multiline
                    rows={3}
                    error={!!errors.description}
                    helperText={errors.description?.message}
                  />
                )}
              />

              <Stack direction="row" spacing={2} justifyContent="flex-end">
                <Button
                  variant="outlined"
                  onClick={() => navigate('/entity-route')}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Guardando...' : isEdit ? 'Actualizar' : 'Crear'}
                </Button>
              </Stack>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default EntityFormPage;
```

---

### 13. Frontend - Detail Page

```typescript
// frontend/src/features/entity-name/pages/EntityDetailPage.tsx

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  Stack,
  Divider,
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import EditIcon from '@mui/icons-material/Edit';
import { PageHeader } from '../../../components/common/PageHeader';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';
import { useEntity } from '../hooks/useEntity';

const EntityDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data: entity, isLoading, error } = useEntity(id || '');

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error || !entity) {
    return (
      <Box>
        <PageHeader title="Error" />
        <Typography color="error">Entidad no encontrada</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader
        title={entity.name}
        breadcrumbs={[
          { label: 'Entidades', path: '/entity-route' },
          { label: entity.name },
        ]}
      />

      <Card sx={{ maxWidth: 800 }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Información de la Entidad</Typography>
            <Button
              variant="outlined"
              size="small"
              startIcon={<EditIcon />}
              onClick={() => navigate(`/entity-route/${id}/edit`)}
            >
              Editar
            </Button>
          </Stack>

          <Divider sx={{ mb: 3 }} />

          <Stack spacing={3}>
            <Box>
              <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                Nombre
              </Typography>
              <Typography variant="body1">{entity.name}</Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                Descripción
              </Typography>
              <Typography variant="body1">
                {entity.description || 'Sin descripción'}
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                Estado
              </Typography>
              <Chip
                label={entity.isActive ? 'Activo' : 'Inactivo'}
                color={entity.isActive ? 'success' : 'default'}
                size="small"
              />
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                Fecha de creación
              </Typography>
              <Typography variant="body2">
                {new Date(entity.createdAt).toLocaleString('es-CO')}
              </Typography>
            </Box>

            {entity.updatedAt !== entity.createdAt && (
              <Box>
                <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                  Última actualización
                </Typography>
                <Typography variant="body2">
                  {new Date(entity.updatedAt).toLocaleString('es-CO')}
                </Typography>
              </Box>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

export default EntityDetailPage;
```

---

### 14. Frontend - Router Configuration

```typescript
// frontend/src/router/index.tsx

// 1. Agregar lazy imports al inicio
const EntityListPage = lazy(() => import('../features/entity-name/pages/EntityListPage'));
const EntityFormPage = lazy(() => import('../features/entity-name/pages/EntityFormPage'));
const EntityDetailPage = lazy(() => import('../features/entity-name/pages/EntityDetailPage'));

// 2. Agregar rutas en el componente
{/* Entity Routes */}
<Route
  path={PATHS.ENTITY}
  element={
    <AuthGuard>
      <MainLayout>
        <PermissionGuard permission={PERMISSIONS.READ_ENTITY}>
          <EntityListPage />
        </PermissionGuard>
      </MainLayout>
    </AuthGuard>
  }
/>
<Route
  path={PATHS.ENTITY_CREATE}
  element={
    <AuthGuard>
      <MainLayout>
        <PermissionGuard permission={PERMISSIONS.CREATE_ENTITY}>
          <EntityFormPage />
        </PermissionGuard>
      </MainLayout>
    </AuthGuard>
  }
/>
<Route
  path={PATHS.ENTITY_VIEW}
  element={
    <AuthGuard>
      <MainLayout>
        <PermissionGuard permission={PERMISSIONS.READ_ENTITY}>
          <EntityDetailPage />
        </PermissionGuard>
      </MainLayout>
    </AuthGuard>
  }
/>
<Route
  path={PATHS.ENTITY_EDIT}
  element={
    <AuthGuard>
      <MainLayout>
        <PermissionGuard permission={PERMISSIONS.UPDATE_ENTITY}>
          <EntityFormPage />
        </PermissionGuard>
      </MainLayout>
    </AuthGuard>
  }
/>
```

**Paths:**
```typescript
// frontend/src/router/paths.ts

export const PATHS = {
  // ... otros paths
  ENTITY: '/entity-route',
  ENTITY_CREATE: '/entity-route/new',
  ENTITY_EDIT: '/entity-route/:id/edit',
  ENTITY_VIEW: '/entity-route/:id',
};
```

**Constants:**
```typescript
// frontend/src/utils/constants.ts

export const PERMISSIONS = {
  // ... otros permisos
  CREATE_ENTITY: 'create_entity_name',
  READ_ENTITY: 'read_entity_name',
  UPDATE_ENTITY: 'update_entity_name',
  DELETE_ENTITY: 'delete_entity_name',
};

export const ROUTES = {
  // ... otras rutas
  ENTITY: '/entity-route',
  ENTITY_CREATE: '/entity-route/new',
  ENTITY_EDIT: '/entity-route/:id/edit',
  ENTITY_VIEW: '/entity-route/:id',
};
```

---

### 15. Frontend - Sidebar Menu

```typescript
// frontend/src/components/layout/Sidebar.tsx

// 1. Importar el ícono (al inicio del archivo)
import EntityIcon from '@mui/icons-material/EntityIconName'; // Cambiar por el ícono apropiado

// 2. Agregar al array de menú items
{
  label: 'Entidades',
  icon: <EntityIcon />,
  path: ROUTES.ENTITY,
  permission: PERMISSIONS.READ_ENTITY,
}

// O con submenú:
{
  label: 'Entidades',
  icon: <EntityIcon />,
  submenu: [
    {
      label: 'Listar Entidades',
      path: ROUTES.ENTITY,
      permission: PERMISSIONS.READ_ENTITY,
    },
    {
      label: 'Crear Entidad',
      path: ROUTES.ENTITY_CREATE,
      permission: PERMISSIONS.CREATE_ENTITY,
    },
  ],
  permission: PERMISSIONS.READ_ENTITY,
}
```

---

## 🔍 Ejemplo de Uso de la Plantilla

### Prompt de ejemplo:

```
Crea el CRUD completo de Categorías de Productos basándote en la plantilla CRUD_TEMPLATE.md

**Modelo de datos:**
- name: string (requerido, único) - Nombre de la categoría
- description: string (opcional) - Descripción de la categoría
- slug: string (requerido, único) - URL-friendly identifier
- icon: string (opcional) - Nombre del ícono
- sortOrder: number (opcional, default: 0) - Orden de visualización
- isActive: boolean (default: true) - Estado activo/inactivo

**Relaciones:**
- Tiene muchos productos (products)

**Datos iniciales para el seed:**
- Electrónica
- Ropa y Accesorios
- Alimentos y Bebidas
- Hogar y Jardín
- Deportes

**Configuración adicional:**
- Nombre singular: categoría
- Nombre plural: categorías
- Icono para el menú: Category (CategoryIcon)
- Ruta base: /product-categories
```

---

## 📚 Recursos Adicionales

### Documentación del proyecto
- `CLAUDE.md` - Guía general del proyecto
- `backend/docs/ai-guides/` - Guías específicas del backend
- `frontend/docs/` - Documentación del frontend

### Iconos disponibles (Material UI)
Algunos iconos comunes para usar en el menú:
- `BusinessIcon` - Negocios/Empresas
- `WorkIcon` - Trabajo/Cargos
- `PeopleIcon` - Usuarios
- `CategoryIcon` - Categorías
- `InventoryIcon` - Inventario
- `LocalShippingIcon` - Envíos/Proveedores
- `ShoppingCartIcon` - Ventas/Órdenes
- `FactoryIcon` - Producción
- `SettingsIcon` - Configuración
- `DashboardIcon` - Dashboard
- `FolderIcon` - Archivos/Documentos

### Comandos útiles

**Backend:**
```bash
# Generar módulo completo
nest g resource modules/entity-name

# Migración y seed
npm run db:reset

# Iniciar servidor
npm run start:dev
```

**Frontend:**
```bash
# Iniciar dev server
npm run dev

# Build
npm run build
```

---

## ✅ Validación Final

Después de crear el CRUD, verifica que:

### Backend
- [ ] La migración se ejecutó correctamente
- [ ] El seed incluye los permisos
- [ ] El módulo está en AppModule
- [ ] Los endpoints responden correctamente
- [ ] La validación de DTOs funciona
- [ ] Los permisos se verifican correctamente

### Frontend
- [ ] Las páginas se cargan sin errores
- [ ] El formulario valida correctamente
- [ ] La tabla muestra los datos
- [ ] Los botones de acción funcionan
- [ ] El menú está visible (si tienes los permisos)
- [ ] Las rutas están protegidas

---

**Versión de la plantilla:** 1.0.0
**Última actualización:** 2026-01-30
**Basado en:** Production Areas CRUD
