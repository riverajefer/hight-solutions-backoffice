# Módulo Portfolio

Este directorio contiene todos los módulos relacionados con el **portafolio de servicios e insumos** de Hight Solutions.

## Estructura

```
portfolio/
├── units-of-measure/     ✅ Unidades de medida (metro, litro, unidad, etc.)
├── service-categories/   ✅ Categorías de servicios (Impresión, Promocionales, etc.)
├── services/             ✅ Servicios ofrecidos (Pendones, Banners, etc.)
├── supply-categories/    ✅ Categorías de insumos (Telas, Tintas, etc.)
└── supplies/             ⏳ Insumos y materiales (Telas, Tintas, Productos base, etc.)
```

## Módulos Implementados

### ✅ Units of Measure (Unidades de Medida)
**Ruta:** `/api/v1/units-of-measure`

Gestiona las unidades de medida utilizadas en el sistema para compra y consumo de insumos.

**Endpoints:**
- `GET /units-of-measure` - Listar todas
- `GET /units-of-measure/:id` - Obtener por ID
- `POST /units-of-measure` - Crear nueva
- `PUT /units-of-measure/:id` - Actualizar
- `DELETE /units-of-measure/:id` - Soft delete

**Permisos:**
- `create_units_of_measure`
- `read_units_of_measure`
- `update_units_of_measure`
- `delete_units_of_measure`

### ✅ Service Categories (Categorías de Servicios)
**Ruta:** `/api/v1/service-categories`

Gestiona las categorías para organizar los servicios ofrecidos por Hight Solutions.

**Endpoints:**
- `GET /service-categories` - Listar todas
- `GET /service-categories/:id` - Obtener por ID
- `POST /service-categories` - Crear nueva
- `PUT /service-categories/:id` - Actualizar
- `DELETE /service-categories/:id` - Soft delete

**Permisos:**
- `create_service_categories`
- `read_service_categories`
- `update_service_categories`
- `delete_service_categories`

**Campos:**
- `name` - Nombre de la categoría (único)
- `slug` - URL-friendly slug (único)
- `description` - Descripción de la categoría
- `icon` - Icono o emoji
- `sortOrder` - Orden de visualización

### ✅ Services (Servicios)
**Ruta:** `/api/v1/services`

Gestiona los servicios ofrecidos por Hight Solutions (impresiones, promocionales, papelería, etc.).

**Endpoints:**
- `GET /services` - Listar todos (con filtros por categoría)
- `GET /services/:id` - Obtener por ID
- `POST /services` - Crear nuevo
- `PUT /services/:id` - Actualizar
- `DELETE /services/:id` - Soft delete

**Permisos:**
- `create_services`
- `read_services`
- `update_services`
- `delete_services`

**Campos:**
- `name` - Nombre del servicio (único dentro de categoría)
- `slug` - URL-friendly slug (único globalmente)
- `description` - Descripción del servicio
- `basePrice` - Precio base (Decimal, opcional)
- `priceUnit` - Unidad de precio (por unidad, por m², etc.)
- `categoryId` - Relación con ServiceCategory

**Ejemplos de servicios:**
- Pendones 80x200 cm, 100x200 cm
- Banners 1x2 metros
- Vallas publicitarias
- Gorras bordadas
- Lapiceros personalizados
- Tarjetas de presentación
- Señalización de seguridad

### ✅ Supply Categories (Categorías de Insumos)
**Ruta:** `/api/v1/supply-categories`

Gestiona las categorías para organizar los insumos y materiales utilizados en la producción.

**Endpoints:**
- `GET /supply-categories` - Listar todas
- `GET /supply-categories/:id` - Obtener por ID
- `POST /supply-categories` - Crear nueva
- `PUT /supply-categories/:id` - Actualizar
- `DELETE /supply-categories/:id` - Soft delete

**Permisos:**
- `create_supply_categories`
- `read_supply_categories`
- `update_supply_categories`
- `delete_supply_categories`

**Campos:**
- `name` - Nombre de la categoría (único)
- `slug` - URL-friendly slug (único)
- `description` - Descripción de la categoría
- `icon` - Icono o emoji
- `sortOrder` - Orden de visualización

**Ejemplos de categorías:**
- Telas y Lonas (🧵)
- Tintas (🎨)
- Productos Base (📦)
- Papelería y Cartón (📄)
- Materiales Rígidos (🔲)
- Consumibles (🔧)

## Próximos Módulos

### ⏳ Supplies (Insumos)
Materiales e insumos utilizados en la producción (con gestión de inventario)

---

**Última actualización:** 2026-01-27
