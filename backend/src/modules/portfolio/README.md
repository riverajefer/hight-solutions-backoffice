# Módulo Portfolio

Este directorio contiene todos los módulos relacionados con el **portafolio de servicios e insumos** de Hight Solutions.

## Estructura

```
portfolio/
├── units-of-measure/     ✅ Unidades de medida (metro, litro, unidad, etc.)
├── service-categories/   ⏳ Categorías de servicios (Impresión, Promocionales, etc.)
├── services/             ⏳ Servicios ofrecidos (Pendones, Banners, etc.)
├── supply-categories/    ⏳ Categorías de insumos (Telas, Tintas, etc.)
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

## Próximos Módulos

### ⏳ Service Categories (Categorías de Servicios)
Categorías para agrupar servicios (Impresión Gran Formato, Promocionales, Papelería, etc.)

### ⏳ Services (Servicios)
Servicios que ofrece Hight Solutions (Pendones, Banners, Gorras, Lapiceros, etc.)

### ⏳ Supply Categories (Categorías de Insumos)
Categorías para agrupar insumos (Telas y Lonas, Tintas, Productos Base, etc.)

### ⏳ Supplies (Insumos)
Materiales e insumos utilizados en la producción (con gestión de inventario)

---

**Última actualización:** 2026-01-26
